import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/app.css';
import { Options } from '../../src/ui/Options';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Options />
  </StrictMode>,
);
