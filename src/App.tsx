import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { PageKey } from '@shared/types'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { About } from './pages/About'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initStore, useStore } from './store'
import { darken } from './lib/format'

export default function App(): JSX.Element {
  const [page, setPage] = useState<PageKey>('home')
  const ready = useStore((s) => s.ready)
  const accent = useStore((s) => s.settings?.accentColor ?? '#ff4655')

  useEffect(() => {
    void initStore()
  }, [])

  
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-accent', accent)
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--color-accent-hover', darken(accent, 0.12))
    root.style.setProperty('--accent-hover', darken(accent, 0.12))
  }, [accent])

  return (
    <div className="relative flex h-full flex-col text-text">
      <div className="app-aurora" />
      <div className="relative z-10 flex h-full flex-col">
        <TitleBar />
        <div className="flex min-h-0 flex-1">
          <Sidebar page={page} onChange={setPage} />
          <main className="min-h-0 flex-1 overflow-y-auto">
            {!ready ? (
              <Loading />
            ) : (
              <ErrorBoundary key={page}>
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full"
                >
                  {page === 'home' && <Home />}
                  {page === 'settings' && <Settings />}
                  {page === 'about' && <About />}
                </motion.div>
              </ErrorBoundary>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function Loading(): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        className="h-8 w-8 rounded-full border-2 border-white/10 border-t-accent"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      />
    </div>
  )
}
