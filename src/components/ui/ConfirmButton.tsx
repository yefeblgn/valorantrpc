import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'

export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
}): JSX.Element {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const id = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(id)
  }, [armed])

  return (
    <button
      onClick={() => {
        if (!armed) return setArmed(true)
        setArmed(false)
        onConfirm()
      }}
      className={`btn ${armed ? 'btn-primary' : 'btn-ghost'}`}
    >
      <RotateCcw size={13} />
      {armed ? confirmLabel : label}
    </button>
  )
}
