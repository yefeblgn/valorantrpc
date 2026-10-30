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
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

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
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] static extern bool IsWindow(IntPtr hWnd);
  [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr hWnd, int attr, ref int value, int size);

  static int[] pids = new int[0];
  static DateTime scanned = DateTime.MinValue;
  static IntPtr game = IntPtr.Zero;
  static IntPtr overlay = IntPtr.Zero;
  static readonly ConcurrentQueue<string> commands = new ConcurrentQueue<string>();
  static readonly AutoResetEvent signal = new AutoResetEvent(false);

  public static void Init() {
    SetProcessDPIAware();
    Thread reader = new Thread(() => {
      string line;
      while ((line = Console.In.ReadLine()) != null) { commands.Enqueue(line.Trim()); signal.Set(); }
    });
    reader.IsBackground = true;
    reader.Start();
  }

  public static void Wait(int ms) {
    signal.WaitOne(ms);
    string cmd;
    while (commands.TryDequeue(out cmd)) Run(cmd);
  }

  static void Run(string cmd) {
    if (cmd.StartsWith("overlay ")) {
      long handle;
      if (!long.TryParse(cmd.Substring(8), out handle)) return;
      overlay = new IntPtr(handle);
      if (overlay == IntPtr.Zero) return;
      int disabled = 1;
      DwmSetWindowAttribute(overlay, 3, ref disabled, 4);
    } else if (cmd == "return") {
      if (game != IntPtr.Zero && IsWindow(game)) SetForegroundWindow(game);
    }
  }

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
    if (h == IntPtr.Zero) return "away";
    if (h == overlay) return "self";
    if (IsIconic(h)) return "away";
    uint pid;
    GetWindowThreadProcessId(h, out pid);
    if (Array.IndexOf(pids, (int)pid) < 0) return "away";
    game = h;
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
  [VrpcProbe]::Wait(250)
}
`

function parse(line: string, prev: GameFocus): GameFocus {
  const [kind, ...rest] = line.trim().split(/\s+/)
  if (kind === 'self') return prev.focused ? prev : { focused: false, physical: null }
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
  private overlayHandle = ''

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

  attachOverlay(handle: string): void {
    this.overlayHandle = handle
    this.send(`overlay ${handle}`)
  }

  returnFocus(): void {
    this.send('return')
  }

  private send(line: string): void {
    const stdin = this.child?.stdin
    if (stdin && stdin.writable) stdin.write(`${line}\n`)
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
      { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }
    )
    this.child = child
    child.stdin?.on('error', (e) => console.debug('[game] probe stdin:', e.message))
    if (this.overlayHandle) this.send(`overlay ${this.overlayHandle}`)
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
          this.update(parse(line, this.state))
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
