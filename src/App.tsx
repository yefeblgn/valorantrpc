import { useEffect, useRef, useState } from 'react'
import { MotionConfig, motion } from 'framer-motion'
import type { PageKey } from '@shared/types'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { Home } from './pages/Home'
import { Match } from './pages/Match'
import { Settings } from './pages/Settings'
import { About } from './pages/About'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TipProvider } from './components/ui/Tip'
import { initStore, useStore } from './store'
import { useAppearance } from './lib/useAppearance'

const PAGES: { key: PageKey; render: () => JSX.Element }[] = [
  { key: 'home', render: () => <Home /> },
  { key: 'match', render: () => <Match /> },
  { key: 'settings', render: () => <Settings /> },
  { key: 'about', render: () => <About /> }
]

export default function App(): JSX.Element {
  const [page, setPage] = useState<PageKey>('home')
  const [visited, setVisited] = useState<PageKey[]>(['home'])
  const mainRef = useRef<HTMLElement>(null)
  const ready = useStore((s) => s.ready)
  const collapsed = useStore((s) => s.settings?.sidebarCollapsed ?? false)
  const patch = useStore((s) => s.patch)
  const reduceMotion = useStore((s) => s.settings?.reduceMotion ?? false)
  useAppearance()

  const toggleSidebar = (): void => void patch({ sidebarCollapsed: !collapsed })

  const openPage = (next: PageKey): void => {
    setPage(next)
    setVisited((list) => (list.includes(next) ? list : [...list, next]))
  }

  useEffect(() => {
    void initStore()
  }, [])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [page])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'never'}>
      <TipProvider>
        <div className="flex h-full flex-col bg-bg text-text">
          <TitleBar />
          <div className="flex min-h-0 flex-1">
            <Sidebar
              page={page}
              onChange={openPage}
              collapsed={collapsed}
              onToggle={toggleSidebar}
            />
            <main ref={mainRef} className="@container min-h-0 min-w-0 flex-1 overflow-y-auto">
              {!ready ? (
                <Loading />
              ) : (
                PAGES.filter((p) => visited.includes(p.key)).map((p) => (
                  <div key={p.key} className={p.key === page ? 'page-enter min-h-full' : 'hidden'}>
                    <ErrorBoundary>{p.render()}</ErrorBoundary>
                  </div>
                ))
              )}
            </main>
          </div>
        </div>
      </TipProvider>
    </MotionConfig>
  )
}

function Loading(): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        className="h-3 w-3 rotate-45 bg-accent"
        animate={{ opacity: [1, 0.25, 1], scale: [1, 0.7, 1] }}
        transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
      />
    </div>
  )
}
