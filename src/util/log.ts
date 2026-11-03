// Diagnostics that never carry user data (project rule: keys and user data are never logged).
// Only a fixed event name and numeric fields are accepted, so a title, URL or price cannot slip in
// through a template string. Silent in production builds.

export type LogFields = Readonly<Record<string, number | boolean>>;

const enabled = (() => {
  try {
    return import.meta.env?.DEV === true && import.meta.env?.MODE !== 'test';
  } catch {
    return false;
  }
})();

export function logEvent(event: `ft:${string}`, fields: LogFields = {}): void {
  if (!enabled) return;
  // eslint-disable-next-line no-console
  console.debug(event, fields);
}
