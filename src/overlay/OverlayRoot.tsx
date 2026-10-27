import { useSyncExternalStore } from 'react';
import type { Controller } from '../content/controller';
import { Pill } from './Pill';

// Top-level overlay (placeholder). Rings, badges, fold cards and the Proof lens are added in the
// UI stage on top of controller.getState(); the state machine behind them is already live.

export function OverlayRoot({ controller, reportUrl }: { controller: Controller; reportUrl: string }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  return (
    <Pill
      state={state.pill}
      ringsOn={state.overlay.rings}
      folded={state.overlay.folded}
      reportUrl={reportUrl}
      actions={{
        onToggleRings: () => controller.runAction('toggle-rings'),
        onToggleFold: () => controller.runAction('toggle-fold'),
        onDismiss: () => controller.pill({ type: 'dismiss' }),
      }}
    />
  );
}
