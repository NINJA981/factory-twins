import { createRoot } from 'react-dom/client';
import type { Controller } from '../content/controller';
import overlayCss from '../styles/overlay.css?inline';
import { OverlayRoot } from './OverlayRoot';

export const HOST_TAG = 'factory-twins-overlay';

export interface MountedOverlay {
  host: HTMLElement;
  unmount(): void;
}

/**
 * Mounts the overlay in one top-level shadow root (SPEC AC-X.3): store styles cannot leak in, ours
 * cannot leak out. The host is fixed-position and zero-sized, so it never shifts store layout.
 */
export function mountOverlay(doc: Document, controller: Controller, reportUrl: string): MountedOverlay {
  const host = doc.createElement(HOST_TAG);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = overlayCss;
  const mountPoint = doc.createElement('div');
  mountPoint.className = 'ft-root';
  shadow.append(style, mountPoint);
  doc.documentElement.append(host);
  const root = createRoot(mountPoint);
  root.render(<OverlayRoot controller={controller} reportUrl={reportUrl} />);
  return {
    host,
    unmount() {
      root.unmount();
      host.remove();
    },
  };
}
