// Build flags. `--mode e2e` builds also accept the local fixture server (scripts/check-release-manifest.mjs
// asserts a release manifest never contains it).

export const E2E_BUILD: boolean = (() => {
  try {
    return import.meta.env?.MODE === 'e2e';
  } catch {
    return false;
  }
})();
