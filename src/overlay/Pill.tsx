import type { ReactNode } from 'react';
import type { PillState } from '../core/state/pill';
import {
  FOLD_TWINS,
  HIDE_FOR_PAGE,
  PILL_ERROR,
  REPORT_LAYOUT,
  UNFOLD_TWINS,
  pillAccessibleName,
  pillNoTwins,
  pillScanning,
  pillSegments,
} from '../copy/strings';

// Minimal placeholder for the summary pill (SPEC F4). The visual pass replaces the styling; the
// states, copy and accessibility contract here are final. Variants are separate components so no
// boolean-prop soup builds up (composition pattern: explicit variants over flags).

interface PillActions {
  onToggleRings(): void;
  onToggleFold(): void;
  onDismiss(): void;
}

function Shell({ children, label, live }: { children: ReactNode; label?: string; live?: boolean }) {
  return (
    <div
      className="ft-pill"
      role="group"
      aria-label={label}
      aria-live={live ? 'polite' : undefined}
      data-testid="ft-pill"
    >
      {children}
    </div>
  );
}

function Divider() {
  return <span className="ft-divider" aria-hidden="true" />;
}

function DismissButton({ onDismiss }: { onDismiss(): void }) {
  return (
    <button
      type="button"
      className="ft-icon-button"
      onClick={onDismiss}
      aria-label={HIDE_FOR_PAGE}
      title={HIDE_FOR_PAGE}
    >
      ×
    </button>
  );
}

function ResultPill({
  state,
  ringsOn,
  folded,
  actions,
}: {
  state: Extract<PillState, { kind: 'result' }>;
  ringsOn: boolean;
  folded: boolean;
  actions: PillActions;
}) {
  const segments = pillSegments(state.summary);
  return (
    <Shell live>
      <button
        type="button"
        className="ft-pill-body"
        onClick={actions.onToggleRings}
        aria-pressed={ringsOn}
        aria-label={pillAccessibleName(state.summary)}
      >
        {segments.map((s, i) => (
          <span key={s} className="ft-segment">
            {i > 0 && <Divider />}
            {s}
          </span>
        ))}
      </button>
      {ringsOn && (
        <button type="button" className="ft-secondary" onClick={actions.onToggleFold}>
          {folded ? UNFOLD_TWINS : FOLD_TWINS}
          <kbd>F</kbd>
        </button>
      )}
      <DismissButton onDismiss={actions.onDismiss} />
    </Shell>
  );
}

function NoTwinsPill({
  state,
  actions,
}: {
  state: Extract<PillState, { kind: 'no-twins' }>;
  actions: PillActions;
}) {
  return (
    <Shell live>
      <span className="ft-muted">{pillNoTwins(state.summary.listings)}</span>
      <DismissButton onDismiss={actions.onDismiss} />
    </Shell>
  );
}

function ScanningPill({ state }: { state: Extract<PillState, { kind: 'scanning' }> }) {
  const pct = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;
  return (
    <Shell>
      <span className="ft-muted">{pillScanning(state.done, state.total)}</span>
      <span className="ft-progress" style={{ width: `${pct}%` }} aria-hidden="true" />
    </Shell>
  );
}

function ErrorPill({ reportUrl, actions }: { reportUrl: string; actions: PillActions }) {
  return (
    <Shell live>
      <span className="ft-muted">{PILL_ERROR}</span>
      <a className="ft-link" href={reportUrl} target="_blank" rel="noreferrer noopener">
        {REPORT_LAYOUT}
      </a>
      <DismissButton onDismiss={actions.onDismiss} />
    </Shell>
  );
}

export function Pill(props: {
  state: PillState;
  ringsOn: boolean;
  folded: boolean;
  reportUrl: string;
  actions: PillActions;
}) {
  const { state, actions } = props;
  switch (state.kind) {
    case 'result':
      return <ResultPill state={state} ringsOn={props.ringsOn} folded={props.folded} actions={actions} />;
    case 'no-twins':
      return <NoTwinsPill state={state} actions={actions} />;
    case 'scanning':
      return <ScanningPill state={state} />;
    case 'error':
      return <ErrorPill reportUrl={props.reportUrl} actions={actions} />;
    default:
      return null;
  }
}
