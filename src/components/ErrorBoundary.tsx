import { Component, type ReactNode } from 'react'
import { t } from '@shared/i18n'
import { useStore } from '../store'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error): void {
    console.error('[ui]', error)
  }

  reset = (): void => this.setState({ error: null })

  render(): ReactNode {
    if (this.state.error) {
      const lang = useStore.getState().settings?.language ?? 'en'
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="text-[13px] text-muted">{t(lang, 'ui_error')}</div>
          <button
            onClick={this.reset}
            className="glass glass-hover rounded-lg px-4 py-2 text-[12.5px] font-medium text-text"
          >
            {t(lang, 'retry')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
