import { useEffect, useState } from 'react'
import { useT } from '../../lib/i18n'
import { Keys } from './Keys'

const CODE_KEYS: Record<string, string> = {
  Space: 'Space',
  Tab: 'Tab',
  Insert: 'Insert',
  Delete: 'Delete',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  ScrollLock: 'Scrolllock',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
  NumpadDecimal: 'numdec'
}

const SOLO_KEY = /^(F\d{1,2}|Insert|Delete|Home|End|PageUp|PageDown|Scrolllock|num\w+)$/

function keyName(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit\d$/.test(code)) return code.slice(5)
  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code
  if (/^Numpad\d$/.test(code)) return `num${code.slice(6)}`
  return CODE_KEYS[code] ?? null
}

function modifiers(e: KeyboardEvent): string[] {
  const mods: string[] = []
  if (e.ctrlKey) mods.push('Ctrl')
  if (e.altKey) mods.push('Alt')
  if (e.shiftKey) mods.push('Shift')
  if (e.metaKey) mods.push('Super')
  return mods
}

export function HotkeyRecorder({
  value,
  onChange,
  disabled = false
}: {
  value: string
  onChange: (accelerator: string) => void
  disabled?: boolean
}): JSX.Element {
  const t = useT()
  const [recording, setRecording] = useState(false)
  const [preview, setPreview] = useState('')
  const [warning, setWarning] = useState('')

  useEffect(() => {
    if (!recording) return
    window.api.pauseHotkey(true)
    setPreview('')
    setWarning('')

    const onDown = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      const mods = modifiers(e)
      if (e.code === 'Escape' && !mods.length) {
        setRecording(false)
        return
      }
      const key = keyName(e.code)
      if (!key) {
        setPreview(mods.join('+'))
        return
      }
      if (!mods.length && !SOLO_KEY.test(key)) {
        setPreview(key)
        setWarning(t('hotkey_solo'))
        return
      }
      setRecording(false)
      onChange([...mods, key].join('+'))
    }
    const onUp = (e: KeyboardEvent): void => {
      e.preventDefault()
      setPreview(modifiers(e).join('+'))
    }
    const onBlur = (): void => setRecording(false)

    window.addEventListener('keydown', onDown, true)
    window.addEventListener('keyup', onUp, true)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown, true)
      window.removeEventListener('keyup', onUp, true)
      window.removeEventListener('blur', onBlur)
      window.api.pauseHotkey(false)
    }
  }, [recording])

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        disabled={disabled}
        onClick={() => setRecording((r) => !r)}
        className={`input flex min-w-[170px] items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
          recording ? 'border-accent bg-accent/10' : ''
        }`}
      >
        {recording ? (
          preview ? (
            <Keys value={preview} size="sm" />
          ) : (
            <span className="display animate-pulse-dot text-[12.5px] tracking-[0.12em] text-accent">
              {t('hotkey_recording')}
            </span>
          )
        ) : (
          <Keys value={value} size="sm" />
        )}
      </button>
      {recording && (
        <span className={`text-[11.5px] ${warning ? 'text-warn' : 'text-dim'}`}>
          {warning || t('hotkey_cancel')}
        </span>
      )}
    </div>
  )
}
