import { Component, type ReactNode } from 'react'

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
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="text-[13px] text-muted">Bir şeyler ters gitti.</div>
          <button
            onClick={this.reset}
            className="glass glass-hover rounded-lg px-4 py-2 text-[12.5px] font-medium text-text"
          >
            Yeniden dene
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
