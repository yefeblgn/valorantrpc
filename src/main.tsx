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
import './index.css'

const overlay = window.location.hash === '#overlay'
if (overlay) document.documentElement.classList.add('overlay-view')

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>{overlay ? <OverlayApp /> : <App />}</React.StrictMode>
)
