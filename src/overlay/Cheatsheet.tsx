import { SHORTCUTS_TITLE, SHORTCUT_ROWS } from '../copy/strings';

/** The `?` list above the pill: every key the overlay answers to, with the same keycaps used elsewhere. */
export function Cheatsheet() {
  return (
    <section className="ft-cheat" aria-labelledby="ft-cheat-title">
      <h2 id="ft-cheat-title">{SHORTCUTS_TITLE}</h2>
      <ul>
        {SHORTCUT_ROWS.map((row) => (
          <li key={row.label}>
            <span className="ft-keys">
              {row.keys.map((k) => (
                <kbd key={k} className="ft-kbd">
                  {k}
                </kbd>
              ))}
            </span>
            <span>{row.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
