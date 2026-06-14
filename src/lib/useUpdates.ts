import { useEffect, useState } from 'react'
import type { UpdateInfo } from '@shared/types'

export function useUpdates(): {
  info: UpdateInfo | null
  check: () => void
  start: () => void
} {
  const [info, setInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    const unsub = window.api.onUpdateState(setInfo)
    void window.api.checkUpdate().then(setInfo)
    return unsub
  }, [])

  return {
    info,
    check: () => void window.api.checkUpdate().then(setInfo),
    start: () => window.api.startUpdate()
  }
}
