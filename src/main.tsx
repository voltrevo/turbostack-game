import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TurboStack from './TurboStack.tsx'
import TurboStackCtx from './TurboStackCtx.ts'
import { PredictionModel } from './PredictionModel.ts'

(async () => {
  const predictionModel = await PredictionModel.load();
  const ctx = new TurboStackCtx(predictionModel);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <TurboStackCtx.Provider value={ctx}>
        <TurboStack />
      </TurboStackCtx.Provider>
    </StrictMode>,
  );
})().catch(console.error);
