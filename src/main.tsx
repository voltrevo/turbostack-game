import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TurboStackCtx from './TurboStackCtx.ts'
import PageSelector from './PageSelector.tsx'
import { ScoreModel } from './ScoreModel.ts'

(async () => {
  const scoreModel = await ScoreModel.load();
  const ctx = new TurboStackCtx(scoreModel);

  (window as any).ctx = ctx;

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <TurboStackCtx.Provider value={ctx}>
        <PageSelector />
      </TurboStackCtx.Provider>
    </StrictMode>,
  );
})().catch(console.error);
