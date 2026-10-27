import '../styles/base.css';
import '../styles/stage.css';
import './app.css';
import {
  ADAPTERS,
  cluster,
  hashImage,
  mapPool,
  mergePageScan,
  parsePrice,
  scanDocument,
  type ClusterResult,
  type ImageHashes,
  type Listing,
  type ScanClient,
} from '@engine';
import { pillScanning } from '@copy';
import { $, $$, esc } from '../shared/dom';
import { icon } from '../shared/icons';
import { decodeBlob, ingestFile, measurePair } from '../shared/measure';
import { mountStage } from '../shared/stage';

// ---- State ------------------------------------------------------------------------------------------
interface Photo {
  id: string;
  name: string;
  /** Object URL of the display thumbnail (a blob in this tab's memory; never uploaded). */
  url: string;
  hashes: ImageHashes;
  price: number | null;
  brand: string;
}
type Mode = 'none' | 'photos' | 'sample';
type View = 'empty' | 'loading' | 'error' | 'ready';

const MAX_PHOTOS = 60;
const SAMPLE_HREF = 'https://www.amazon.com/s?k=laptop+stand';
const EMPTY: ClusterResult = cluster({ listings: [], hashes: {} });

let mode: Mode = 'none';
let photos: Photo[] = [];
let nextId = 1;
let busy = false;
let lastMs: number | null = null;

// ---- DOM ----------------------------------------------------------------------------------------------
const stageEl = $('#stage') as HTMLElement;
const statusEl = $('[data-status]') as HTMLElement;
const noteEl = $('[data-results-note]') as HTMLElement;
const noticeEl = $('[data-notice]') as HTMLElement;
const fileInput = $('#file-input') as HTMLInputElement;
const ringsBtn = $('[data-app="rings"]') as HTMLButtonElement;
const foldBtn = $('[data-app="fold"]') as HTMLButtonElement;
const clearBtn = $('[data-app="clear"]') as HTMLButtonElement;

// The intake buttons and the privacy line are static HTML (no layout shift when the script runs).
clearBtn.innerHTML = `${icon('trash', 18)}<span>Clear all</span>`;

const stage = mountStage({
  root: stageEl,
  data: { listings: [], result: EMPTY },
  measure: measurePair,
  keyboard: true,
});

function show(view: View) {
  for (const el of $$('[data-state-view]')) el.hidden = el.dataset.stateView !== view;
  $('[data-intake]')!.toggleAttribute('data-busy', view === 'loading');
}

function notice(text: string | null) {
  noticeEl.hidden = !text;
  noticeEl.textContent = text ?? '';
}

function skeleton(n: number) {
  const count = Math.max(4, Math.min(12, n));
  $('[data-skeleton]')!.innerHTML = Array.from(
    { length: count },
    () =>
      '<div class="sk-tile"><div class="sk-media"></div><div class="sk-line"></div><div class="sk-line"></div></div>',
  ).join('');
}

function setLoading(total: number, done = 0) {
  show('loading');
  const line = $('[data-loading-line]') as HTMLElement;
  line.textContent = pillScanning(done, total);
  skeleton(total);
}

function showError(
  title: string,
  body: string,
  actions: Array<{ label: string; act: string; primary?: boolean }>,
) {
  show('error');
  $('[data-error-title]')!.innerHTML = `${icon('alert', 18)}<span>${esc(title)}</span>`;
  $('[data-error-body]')!.textContent = body;
  $('[data-error-actions]')!.innerHTML = actions
    .map(
      (a) =>
        `<button type="button" class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'}" data-app="${a.act}">${esc(a.label)}</button>`,
    )
    .join('');
  const first = $('[data-error-actions] button');
  first?.focus();
}

// ---- Rendering the engine's result ------------------------------------------------------------------
function tileExtra(l: Listing): string {
  const p = photos.find((x) => x.id === l.id);
  if (!p) return '';
  const nm = esc(p.name);
  return `<div class="tile-edit">
<p class="tile-name" title="${nm}">${nm}</p>
<label class="field"><span class="sr-only">Price for ${nm}</span><input class="input" data-field="price" data-id="${esc(p.id)}" inputmode="decimal" autocomplete="off" placeholder="Price, optional" value="${p.price != null ? esc(p.price.toFixed(2)) : ''}"></label>
<label class="field"><span class="sr-only">Brand for ${nm}</span><input class="input" data-field="brand" data-id="${esc(p.id)}" maxlength="24" autocomplete="off" placeholder="Brand, optional" value="${esc(p.brand)}"></label>
</div>
<button type="button" class="tile-remove" data-remove="${esc(p.id)}" aria-label="Remove ${nm}"><span>${icon('x', 16)}</span></button>`;
}

function photoListings(): Listing[] {
  return photos.map((p, i) => ({
    id: p.id,
    // The engine's Listing type needs a store; photos have none. The title is the same for every
    // photo on purpose: this mode compares photos only, so the title sanity check always agrees.
    store: 'amazon-us',
    page: 1,
    position: i,
    url: '',
    imageUrl: p.url,
    title: 'product photo',
    brand: p.brand.trim() || null,
    brandConfidence: p.brand.trim() ? 'byline' : 'none',
    price: p.price != null ? { amount: p.price, currency: 'USD', isFromRange: false } : null,
    packCount: 1,
    packCountCertain: true,
    rating: null,
    reviewCount: null,
    sponsored: false,
  }));
}

function renderResult(listings: Listing[], result: ClusterResult, compact: boolean) {
  const keepRings = stage.state.rings;
  stage.setData(
    { listings, result },
    compact
      ? { compact: true, extra: tileExtra }
      : { imgAttrs: (_l, i) => (i < 6 ? 'loading="eager"' : 'loading="lazy"') },
  );
  stageEl.classList.toggle('mode-photos', compact);
  stage.resetPill();
  stage.setPill({ type: 'scan-start', total: listings.length });
  stage.setPill({ type: 'scan-done', summary: result.summary });
  if (keepRings && result.groups.length > 0) stage.dispatch({ type: 'set-rings', on: true });
  const s = result.summary;
  const hasGroups = result.groups.length > 0;
  ringsBtn.hidden = !hasGroups;
  foldBtn.hidden = !hasGroups;
  const took = lastMs != null ? ` Checked in ${Math.max(1, Math.round(lastMs))} ms on this device.` : '';
  statusEl.innerHTML = hasGroups
    ? `<b>${s.twinGroups}</b> twin ${s.twinGroups === 1 ? 'group' : 'groups'} among <b>${s.listings}</b> ${compact ? 'photos' : 'listings'}.${esc(took)}`
    : `No two of these <b>${s.listings}</b> ${compact ? 'photos' : 'listings'} share a photo.${esc(took)}`;
  noteEl.textContent = hasGroups
    ? compact
      ? 'Add a price and brand under any photo to see the price ladder and the brand tax. Factory Twins compares photos, not products.'
      : 'Sample listings are made up. The grouping is computed live, in your browser, by the same engine as the extension.'
    : compact
      ? 'Add more photos, or open the sample to see what a group looks like.'
      : '';
  refreshButtons();
  show('ready');
}

// The two toolbar buttons keep their children and only change text, so a tap that starts while the
// state changes (a price field blurring, say) is never lost to a replaced element.
function setToolbarLabel(btn: HTMLButtonElement, text: string, key: string) {
  let label = btn.querySelector<HTMLElement>('span');
  if (!label) {
    btn.innerHTML = `<span></span><kbd class="keycap">${key}</kbd>`;
    label = btn.querySelector('span')!;
  }
  if (label.textContent !== text) label.textContent = text;
}

function refreshButtons() {
  const st = stage.state;
  setToolbarLabel(ringsBtn, st.rings ? 'Hide twins' : 'Show twins', 'T');
  setToolbarLabel(foldBtn, st.folded ? 'Unfold twins' : 'Fold twins', 'F');
  ringsBtn.setAttribute('aria-pressed', String(st.rings));
  foldBtn.setAttribute('aria-pressed', String(st.folded));
}
stage.onChange(refreshButtons);

function recompute() {
  const listings = photoListings();
  const hashes = Object.fromEntries(photos.map((p) => [p.id, p.hashes]));
  const result = cluster({ listings, hashes });
  renderResult(listings, result, true);
}

// ---- Photos: pick, paste, drop ---------------------------------------------------------------------
const looksLikeImage = (f: File) =>
  f.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif|heic|heif|bmp)$/i.test(f.name);

async function addFiles(files: File[]) {
  if (busy) return;
  const images = files.filter(looksLikeImage);
  if (images.length === 0) {
    if (files.length > 0) notice("That wasn't an image. Pick photos in JPEG, PNG, WebP or similar.");
    return;
  }
  busy = true;
  notice(null);
  if (mode === 'sample') clearAll(false);
  mode = 'photos';
  const room = MAX_PHOTOS - photos.length;
  const take = images.slice(0, Math.max(0, room));
  const dropped = images.length - take.length;
  setLoading(take.length);
  const t0 = performance.now();
  let done = 0;
  const failed: string[] = [];
  const added = await mapPool(take, 4, async (file) => {
    try {
      const { image, thumb } = await ingestFile(file);
      const photo: Photo = {
        id: `p${nextId++}`,
        name: file.name || 'pasted image',
        url: URL.createObjectURL(thumb),
        hashes: hashImage(image),
        price: null,
        brand: '',
      };
      return photo;
    } catch {
      failed.push(file.name || 'pasted image');
      return null;
    } finally {
      done++;
      ($('[data-loading-line]') as HTMLElement).textContent = pillScanning(done, take.length);
    }
  });
  lastMs = performance.now() - t0;
  const ok = added.filter((p): p is Photo => p != null);
  photos.push(...ok);
  busy = false;
  const parts: string[] = [];
  if (failed.length)
    parts.push(
      `${failed.length} ${failed.length === 1 ? 'photo' : 'photos'} couldn't be opened and ${failed.length === 1 ? 'was' : 'were'} skipped (${failed.slice(0, 3).join(', ')}${failed.length > 3 ? ', …' : ''}). Some browsers can't read HEIC photos; export them as JPEG or PNG.`,
    );
  if (dropped > 0) parts.push(`Only the first ${MAX_PHOTOS} photos are checked at a time.`);
  if (photos.length === 0) {
    mode = 'none';
    showError(
      "Couldn't read these photos.",
      failed.length
        ? "This browser couldn't open them. HEIC photos from some phones need to be exported as JPEG or PNG first. Nothing was uploaded."
        : 'Nothing could be read.',
      [
        { label: 'Choose photos', act: 'pick', primary: true },
        { label: 'Try a sample', act: 'sample' },
      ],
    );
    return;
  }
  notice(parts.length ? parts.join(' ') : null);
  recompute();
}

function clearAll(toEmpty = true) {
  for (const p of photos) URL.revokeObjectURL(p.url);
  photos = [];
  mode = 'none';
  lastMs = null;
  notice(null);
  if (toEmpty) {
    stage.setData({ listings: [], result: EMPTY });
    show('empty');
  }
}

async function pasteFromClipboard() {
  try {
    const items = await navigator.clipboard.read();
    const files: File[] = [];
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith('image/'));
      if (type) files.push(new File([await item.getType(type)], 'pasted image', { type }));
    }
    if (files.length) return void addFiles(files);
    notice(
      'The clipboard has no image. Copy an image first (long-press or right-click, Copy image), then try again.',
    );
  } catch {
    notice(
      "Couldn't read the clipboard here. Press Ctrl+V (Cmd+V on a Mac) with this page open, or paste into the page from your keyboard.",
    );
  }
}

document.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files ?? [])].filter(looksLikeImage);
  if (files.length === 0) return;
  e.preventDefault();
  void addFiles(files);
});

const dropEl = $('[data-drop]') as HTMLElement;
let dragDepth = 0;
addEventListener('dragenter', (e: DragEvent) => {
  if (!e.dataTransfer?.types.includes('Files')) return;
  dragDepth++;
  dropEl.hidden = false;
});
addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropEl.hidden = true;
});
addEventListener('dragover', (e: DragEvent) => e.dataTransfer?.types.includes('Files') && e.preventDefault());
addEventListener('drop', (e: DragEvent) => {
  dragDepth = 0;
  dropEl.hidden = true;
  if (!e.dataTransfer?.files.length) return;
  e.preventDefault();
  void addFiles([...e.dataTransfer.files]);
});

fileInput.addEventListener('change', () => {
  void addFiles([...(fileInput.files ?? [])]);
  fileInput.value = '';
});

// ---- Sample: the real extension pipeline on a bundled results page ----------------------------------
const siteUrl = (rel: string) => new URL(rel, location.href).href;
const sampleImage = (u: string) => siteUrl(`../sample/img/${new URL(u).pathname.split('/').pop()}`);

const sampleClient: ScanClient = {
  async hashImages({ urls }) {
    const out: Awaited<ReturnType<ScanClient['hashImages']>> = {};
    await mapPool(urls, 6, async (u) => {
      try {
        const res = await fetch(sampleImage(u));
        if (!res.ok) throw new Error(String(res.status));
        out[u] = { ok: true, hashes: hashImage(await decodeBlob(await res.blob())) };
      } catch {
        out[u] = { ok: false, error: 'decode' };
      }
    });
    return out;
  },
  async mergeQuerySession(scan) {
    return mergePageScan(null, scan, Date.now());
  },
  async commitLetters() {},
};

async function loadSample() {
  if (busy) return;
  busy = true;
  notice(null);
  clearAll(false);
  mode = 'sample';
  setLoading(60);
  const t0 = performance.now();
  try {
    let html: string;
    try {
      const res = await fetch(siteUrl('../sample/page-1.html'));
      if (!res.ok) throw new Error(String(res.status));
      html = await res.text();
    } catch {
      mode = 'none';
      busy = false;
      showError(
        "Couldn't open the sample.",
        "The sample page didn't load. If you're offline and haven't opened this app online once, it isn't saved on this device yet. Nothing was uploaded.",
        [
          { label: 'Try again', act: 'sample', primary: true },
          { label: 'Pick photos', act: 'pick' },
        ],
      );
      return;
    }
    // A parsed, inert document: no script runs and no image loads. The real Amazon adapter reads it.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const outcome = await scanDocument({
      adapter: ADAPTERS['amazon-us'],
      doc,
      href: SAMPLE_HREF,
      client: sampleClient,
      settings: { strictness: 'standard', sessionMemory: false },
      onStart: (total) => setLoading(total),
      onProgress: (d, t) => (($('[data-loading-line]') as HTMLElement).textContent = pillScanning(d, t)),
    });
    lastMs = performance.now() - t0;
    busy = false;
    if (!outcome.ok) {
      mode = 'none';
      showError(
        "Couldn't read the sample page.",
        `The listing reader reported: ${outcome.reason}. Nothing was uploaded.`,
        [{ label: 'Try again', act: 'sample', primary: true }],
      );
      return;
    }
    const listings = Object.values(outcome.session.listings).map((l) => ({
      ...l,
      imageUrl: sampleImage(l.imageUrl),
    }));
    renderResult(listings, outcome.result, false);
  } catch {
    busy = false;
    mode = 'none';
    showError(
      "Couldn't check the sample.",
      'Something went wrong while comparing the photos. Nothing was uploaded.',
      [{ label: 'Try again', act: 'sample', primary: true }],
    );
  }
}

// ---- Events ------------------------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-app]');
  if (t) {
    switch (t.dataset.app) {
      case 'pick':
        return fileInput.click();
      case 'paste':
        return void pasteFromClipboard();
      case 'sample':
        return void loadSample();
      case 'rings':
        return stage.dispatch({ type: 'toggle-rings' });
      case 'fold':
        return stage.dispatch({ type: 'toggle-fold' });
      case 'clear':
        return clearAll();
    }
  }
  const rm = (e.target as HTMLElement).closest<HTMLElement>('[data-remove]');
  if (rm) {
    const id = rm.dataset.remove;
    const p = photos.find((x) => x.id === id);
    if (p) URL.revokeObjectURL(p.url);
    photos = photos.filter((x) => x.id !== id);
    if (photos.length === 0) clearAll();
    else recompute();
  }
});

stageEl.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  const field = input.dataset.field;
  if (!field) return;
  const p = photos.find((x) => x.id === input.dataset.id);
  if (!p) return;
  if (field === 'price') {
    const raw = input.value.trim().replace(/^\$/, '');
    p.price = raw ? (parsePrice(`$${raw}`)?.amount ?? null) : null;
    if (raw && p.price == null) notice('Enter a price like 12.99.');
    else notice(null);
  } else p.brand = input.value;
  // Wait for the focus move that caused this change (tapping the next field) to finish, redraw, then
  // hand focus back to the same field by its id, because the redraw replaces the tiles.
  setTimeout(() => {
    const a = document.activeElement as HTMLInputElement | null;
    const back = a?.matches?.('input[data-field]') ? { f: a.dataset.field, id: a.dataset.id } : null;
    recompute();
    if (back)
      stageEl
        .querySelector<HTMLInputElement>(`input[data-field="${back.f}"][data-id="${back.id}"]`)
        ?.focus({ preventScroll: true });
  }, 0);
});

// ---- Offline and install ----------------------------------------------------------------------------
const offlineEl = $('[data-offline]') as HTMLElement;
const setOnline = () => {
  if (!navigator.onLine) offlineEl.textContent = "You're offline. Everything here still works.";
};
addEventListener('offline', setOnline);
addEventListener(
  'online',
  () =>
    (offlineEl.textContent = offlineReady
      ? 'Saved on this device. Works offline.'
      : 'Works offline after the first load.'),
);
let offlineReady = false;
setOnline();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'offline-ready') {
      offlineReady = true;
      offlineEl.textContent = navigator.onLine
        ? 'Saved on this device. Works offline.'
        : "You're offline. Everything here still works.";
    }
  });
  navigator.serviceWorker
    .register('./sw.js', { scope: './' })
    .then(() => navigator.serviceWorker.ready)
    .then((reg) => reg.active?.postMessage({ type: 'status' }))
    .catch(() => {
      offlineEl.textContent = "Offline use isn't available in this browser.";
    });
}

show('empty');
