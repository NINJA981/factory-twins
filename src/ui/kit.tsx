import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { RadioGroup, Switch as RadixSwitch } from 'radix-ui';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Check, ShieldCheck, TriangleAlert } from 'lucide-react';
import { NOBODY_ELSE, PRIVACY_CAPTION, PRIVACY_TITLE, imageReadsLine } from '../copy/strings';
import type { NetworkCounter } from '../core/types';

// Shared pieces of the popup and the options page (DESIGN.md, Components). Tailwind utilities over the
// generated tokens. The overlay on the store page has its own plain-CSS twins of the button and keycap.

/** Snappy spring: 180 ms, no bounce. */
export const SPRING_SNAPPY = { type: 'spring', visualDuration: 0.18, bounce: 0 } as const;

export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function TwinGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M7.7 3.5h.6a2.2 2.2 0 0 1 2.2 2.2v4.6a2.2 2.2 0 0 1-2.2 2.2h-.6a2.2 2.2 0 0 1-2.2-2.2V5.7a2.2 2.2 0 0 1 2.2-2.2Z"
        fill="currentColor"
        opacity="0.3"
      />
      <rect x="1.4" y="3.5" width="9.1" height="9" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5.5" y="3.5" width="9.1" height="9" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** A keycap that sets `data-pressed` for 120 ms when its real key goes down. */
export function Keycap({ children, pressed }: { children: ReactNode; pressed?: boolean }) {
  return (
    <kbd
      data-pressed={pressed ? '' : undefined}
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-border bg-surface-2 px-[5px] font-sans text-micro leading-none text-text-muted shadow-[inset_0_-1px_0_var(--border)] data-[pressed]:translate-y-px data-[pressed]:shadow-none"
    >
      {children}
    </kbd>
  );
}

/** True for 120 ms after `key` (case-insensitive) is pressed anywhere in the window. */
export function useKeyPressed(keys: readonly string[]): string | null {
  const [pressed, setPressed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (!keys.includes(k)) return;
      setPressed(k);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setPressed(null), 120);
    };
    window.addEventListener('keydown', down);
    return () => {
      window.removeEventListener('keydown', down);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [keys]);
  return pressed;
}

type Variant = 'primary' | 'secondary' | 'ghost';

const BUTTON_BASE =
  'inline-flex h-8 items-center justify-center gap-2 rounded-sm px-3 text-label-compact leading-none whitespace-nowrap transition-[background-color,transform] duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100';

const BUTTON_VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent [@media(hover:hover)]:hover:bg-accent-hover',
  secondary: 'border border-border bg-surface text-text shadow-e1 [@media(hover:hover)]:hover:bg-surface-2',
  ghost: 'text-text-muted [@media(hover:hover)]:hover:bg-surface-2 [@media(hover:hover)]:hover:text-text',
};

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button type="button" className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** Labelled switch over Radix, with the thumb on a snappy spring. The visible text is the accessible name. */
export function Switch({
  checked,
  label,
  hint,
  density = 'compact',
  onChange,
}: {
  checked: boolean;
  label: string;
  hint?: string;
  /** Compact in the popup (32 px rows), comfortable on the options page (44 px rows, UI type). */
  density?: 'compact' | 'comfortable';
  onChange(on: boolean): void;
}) {
  const comfortable = density === 'comfortable';
  return (
    <label
      className={`flex items-center justify-between gap-4 text-text ${
        comfortable ? 'min-h-11 py-3 text-ui' : 'min-h-8 text-ui-compact'
      }`}
    >
      <span className={`flex min-w-0 flex-col ${comfortable ? 'gap-0.5' : ''}`}>
        <span className={comfortable ? 'text-ui font-[550]' : 'text-label-compact'}>{label}</span>
        {hint && (
          <span
            className={`text-text-muted [text-wrap:pretty] ${comfortable ? 'text-ui-compact' : 'text-caption'}`}
          >
            {hint}
          </span>
        )}
      </span>
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onChange}
        className="relative inline-flex h-5 w-8 shrink-0 cursor-pointer items-center rounded-full bg-border-strong p-0.5 transition-colors duration-150 data-[state=checked]:bg-accent motion-reduce:transition-none"
      >
        <RadixSwitch.Thumb asChild>
          <motion.span
            className="block size-4 rounded-full bg-surface shadow-e2"
            animate={{ x: checked ? 12 : 0 }}
            initial={false}
            transition={SPRING_SNAPPY}
          />
        </RadixSwitch.Thumb>
      </RadixSwitch.Root>
    </label>
  );
}

/** Segmented control over a Radix radio group: arrow keys move, Tab enters and leaves once. */
export function Segmented<T extends string>({
  value,
  options,
  label,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  label: string;
  onChange(v: T): void;
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onChange(v as T)}
      aria-label={label}
      className="inline-flex h-8 w-fit gap-0.5 self-start rounded-sm bg-surface-3 p-0.5"
    >
      {options.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          className="relative inline-flex min-w-20 items-center justify-center rounded-xs px-3 text-label-compact text-text-muted transition-colors duration-100 data-[state=checked]:bg-surface data-[state=checked]:text-text data-[state=checked]:shadow-e1 motion-reduce:transition-none"
        >
          {o.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

export function PrivacyPanel({ counter }: { counter: NetworkCounter | null }) {
  return (
    <section aria-labelledby="privacy-title" className="rounded-md bg-surface-2 p-3">
      <h2 id="privacy-title" className="flex items-center gap-2 text-label-compact text-text">
        <ShieldCheck size={16} strokeWidth={1.75} className="text-text-muted" aria-hidden="true" />
        {PRIVACY_TITLE}
      </h2>
      {counter && (
        <p className="mt-2 text-ui-compact text-text-muted" data-testid="reads">
          {imageReadsLine(counter.byHost)}
          {/* Kept inside one element so the whole sentence reads as one measured line. */}{' '}
          <span className="inline-flex items-center gap-1 text-success">
            <Check size={14} strokeWidth={2} aria-hidden="true" />
            <span className="text-text">{NOBODY_ELSE}</span>
          </span>
        </p>
      )}
      <p className="mt-2 text-caption text-text-muted">{PRIVACY_CAPTION}</p>
    </section>
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-ui-compact text-danger">
      <TriangleAlert size={14} strokeWidth={1.75} className="mt-[3px] shrink-0" aria-hidden="true" />
      <span className="text-text">{children}</span>
    </p>
  );
}

/** Ink toast with one optional action (DESIGN.md, Toast). Auto-dismiss is the caller's job. */
export function Toast({
  show,
  message,
  action,
}: {
  show: boolean;
  message: string;
  action?: { label: string; onClick(): void };
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={SPRING_SNAPPY}
          className="fixed inset-x-3 bottom-3 z-60 flex items-center justify-between gap-3 rounded-sm bg-text px-3 py-2.5 text-ui-compact text-bg shadow-e3"
        >
          <span>{message}</span>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="rounded-xs px-2 py-1 text-label-compact text-bg underline underline-offset-2 [@media(hover:hover)]:hover:bg-bg/15"
            >
              {action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
