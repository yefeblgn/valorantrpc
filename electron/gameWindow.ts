import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { app, type Rectangle } from 'electron'

const PROCESS_NAME = 'VALORANT-Win64-Shipping'
const RESTART_DELAY = 5000
const MAX_FAILURES = 3

export interface GameFocus {
  focused: boolean
  physical: Rectangle | null
}

const PROBE_SCRIPT = String.raw`param([int]$Parent)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public static class VrpcProbe {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

  [StructLayout(LayoutKind.Sequential)]
  public struct POINT { public int X; public int Y; }

  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr hWnd, ref POINT point);
  [DllImport("user32.dll")] static extern bool SetProcessDPIAware();

  static int[] pids = new int[0];
  static DateTime scanned = DateTime.MinValue;

  public static void Init() { SetProcessDPIAware(); }

  public static string Probe(string name) {
    if ((DateTime.UtcNow - scanned).TotalMilliseconds >= 3000) {
      Process[] list = Process.GetProcessesByName(name);
      int[] next = new int[list.Length];
      for (int i = 0; i < list.Length; i++) { next[i] = list[i].Id; list[i].Dispose(); }
      pids = next;
      scanned = DateTime.UtcNow;
    }
    if (pids.Length == 0) return "none";
    IntPtr h = GetForegroundWindow();
    if (h == IntPtr.Zero || IsIconic(h)) return "away";
    uint pid;
    GetWindowThreadProcessId(h, out pid);
    if (Array.IndexOf(pids, (int)pid) < 0) return "away";
    RECT r;
    POINT p = new POINT();
    if (!GetClientRect(h, out r) || !ClientToScreen(h, ref p)) return "focus";
    return "focus " + p.X + " " + p.Y + " " + (r.Right - r.Left) + " " + (r.Bottom - r.Top);
  }

  public static bool Alive(int pid) {
    try { using (Process.GetProcessById(pid)) { return true; } } catch { return false; }
  }
}
'@
[VrpcProbe]::Init() | Out-Null
$last = ''
$tick = 0
while ($true) {
  $state = [VrpcProbe]::Probe('${PROCESS_NAME}')
  if ($state -ne $last) {
    [Console]::Out.WriteLine($state)
    [Console]::Out.Flush()
    $last = $state
  }
  $tick++
  if ($tick % 8 -eq 0 -and -not [VrpcProbe]::Alive($Parent)) { break }
  Start-Sleep -Milliseconds 250
}
`

function parse(line: string): GameFocus {
  const [kind, ...rest] = line.trim().split(/\s+/)
  if (kind !== 'focus') return { focused: false, physical: null }
  const [x, y, width, height] = rest.map(Number)
  const valid = [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0
  return { focused: true, physical: valid ? { x, y, width, height } : null }
}

export class GameWatcher extends EventEmitter {
  private child: ChildProcess | null = null
  private failures = 0
  private wanted = false
  private restartTimer: ReturnType<typeof setTimeout> | null = null
  private state: GameFocus = { focused: false, physical: null }

  get available(): boolean {
    return process.platform === 'win32' && this.failures < MAX_FAILURES
  }

  start(): void {
    this.wanted = true
    if (this.child || this.restartTimer || !this.available) return
    this.spawn()
  }

  stop(): void {
    this.wanted = false
    if (this.restartTimer) clearTimeout(this.restartTimer)
    this.restartTimer = null
    const child = this.child
    this.child = null
    if (child && child.exitCode === null) child.kill()
    this.update({ focused: false, physical: null })
  }

  private spawn(): void {
    let script: string
    try {
      script = join(app.getPath('userData'), 'focus-probe.ps1')
      writeFileSync(script, PROBE_SCRIPT, 'utf-8')
    } catch (e) {
      console.warn('[game] probe script write failed:', e)
      this.failures = MAX_FAILURES
      this.emit('unavailable')
      return
    }

    const child = spawn(
      'powershell.exe',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        script,
        String(process.pid)
      ],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
    )
    this.child = child
    let buffer = ''
    let healthy = false

    child.stdout?.setEncoding('utf-8')
    child.stdout?.on('data', (chunk: string) => {
      buffer += chunk
      let nl = buffer.indexOf('\n')
      while (nl >= 0) {
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        if (line.trim()) {
          if (!healthy) {
            healthy = true
            this.failures = 0
          }
          this.update(parse(line))
        }
        nl = buffer.indexOf('\n')
      }
    })
    child.stderr?.setEncoding('utf-8')
    child.stderr?.on('data', (chunk: string) => console.debug('[game] probe:', chunk.trim()))
    child.on('error', (e) => console.warn('[game] probe failed to start:', e.message))
    child.on('exit', (code) => {
      if (this.child !== child) return
      this.child = null
      this.update({ focused: false, physical: null })
      if (!this.wanted) return
      if (!healthy) this.failures++
      if (!this.available) {
        console.warn(`[game] probe gave up (exit ${code}); falling back to process state`)
        this.emit('unavailable')
        return
      }
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null
        if (this.wanted) this.spawn()
      }, RESTART_DELAY)
    })
  }

  private update(next: GameFocus): void {
    const prev = this.state
    const same =
      prev.focused === next.focused &&
      prev.physical?.x === next.physical?.x &&
      prev.physical?.y === next.physical?.y &&
      prev.physical?.width === next.physical?.width &&
      prev.physical?.height === next.physical?.height
    if (same) return
    this.state = next
    this.emit('change', next)
  }
}
