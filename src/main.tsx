import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import App from './App'
import { OverlayApp } from './overlay/OverlayApp'
import { ShareApp } from './share/ShareApp'
import './index.css'

const hash = window.location.hash
const overlay = hash === '#overlay'
const share = hash.startsWith('#share/') ? hash.slice('#share/'.length).split('/') : null
if (overlay) document.documentElement.classList.add('overlay-view')

function root(): JSX.Element {
  if (share)
    return (
      <ShareApp
        puuid={decodeURIComponent(share[0] ?? '')}
        id={decodeURIComponent(share[1] ?? '')}
      />
    )
  return overlay ? <OverlayApp /> : <App />
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>{root()}</React.StrictMode>
)
