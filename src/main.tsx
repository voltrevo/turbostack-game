import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TurboStackCtx from './TurboStackCtx.ts'
import { PredictionModel } from './PredictionModel.ts'
import PageSelector from './PageSelector.tsx'

(async () => {
  const predictionModel = await PredictionModel.load();
  const ctx = new TurboStackCtx(predictionModel);

  (window as any).ctx = ctx;

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <TurboStackCtx.Provider value={ctx}>
        <PageSelector />
      </TurboStackCtx.Provider>
    </StrictMode>,
  );
})().catch(console.error);
