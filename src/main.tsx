import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TurboStack from './TurboStack.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TurboStack />
  </StrictMode>,
)
