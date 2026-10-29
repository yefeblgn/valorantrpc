import { useEffect, useState } from 'react'
import type { MatchReport } from '@shared/types'

export function useMatch(): MatchReport | null {
  const [report, setReport] = useState<MatchReport | null>(null)

  useEffect(() => {
    const off = window.api.onMatchChanged(setReport)
    void window.api.getMatch().then(setReport)
    return off
  }, [])

  return report
}
