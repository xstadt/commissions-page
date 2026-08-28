import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ConceptReview from './ConceptReview.jsx'

// Concept review pages live at /concepts/<slug>.
//
// The check happens here, before the main app mounts, so those pages
// render entirely on their own — no nav, no tabs, no store footer.
// Everything else falls through to App exactly as before.
const conceptMatch = window.location.pathname.match(/^\/concepts\/([a-z0-9-]+)\/?$/i)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {conceptMatch
      ? <ConceptReview slug={conceptMatch[1].toLowerCase()} />
      : <App />}
  </StrictMode>,
)
