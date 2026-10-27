import { Switch as RadixSwitch } from 'radix-ui';

/** Labelled switch over Radix. The label is the visible text, so the accessible name always matches it. */
export function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange(on: boolean): void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-ui text-text">
      <span>{label}</span>
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onChange}
        className="relative h-6 w-10 rounded-full border border-border-strong bg-surface-3 data-[state=checked]:border-accent data-[state=checked]:bg-accent"
      >
        <RadixSwitch.Thumb className="block size-4 translate-x-1 rounded-full bg-text transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-on-accent" />
      </RadixSwitch.Root>
    </label>
  );
}
