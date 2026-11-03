# Security policy

## Reporting a problem

Please do not open a public issue for a security or privacy problem.

Use GitHub's private reporting instead: on this repository, open the **Security** tab and choose
**Report a vulnerability**. Only the maintainers can read the report. Include the browser and version,
the extension version (from `chrome://extensions` or `about:debugging`), the steps to reproduce, and what
you expected to happen.

You should get a first answer within 7 days. A fix for a confirmed problem goes out in the next release,
and the report is credited in `CHANGELOG.md` unless you ask us not to.

## Supported versions

Only the latest release is supported. Factory Twins is at version 0.1.x and is not yet published in the
Chrome Web Store or on addons.mozilla.org.

## What counts

Anything that breaks the privacy promise in the README is in scope, for example:

- a request to any host other than the store's own image servers listed in `src/hasher/allowlist.ts`;
- listing data, page content or browsing history leaving the browser;
- a way for a store page to run code in the extension's context, or to read the extension's storage;
- a manifest permission that is broader than the README says.

Out of scope: wrong twin groups or prices (please open a normal bug report), and problems in a store's own
website.
