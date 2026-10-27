import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/app.css';
import { Popup } from '../../src/ui/Popup';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
