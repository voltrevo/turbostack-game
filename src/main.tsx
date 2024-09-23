import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TurboStack from './TurboStack.tsx'
import TurboStackCtx from './TurboStackCtx.ts'

const ctx = new TurboStackCtx();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TurboStackCtx.Provider value={ctx}>
      <TurboStack />
    </TurboStackCtx.Provider>
  </StrictMode>,
);
