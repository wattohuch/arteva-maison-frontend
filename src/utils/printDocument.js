/**
 * ARTÉVA Maison — printing.
 *
 * ── Why this replaced the popup approach ──
 *
 * Printing used to be `window.open('', '_blank')`, write markup into the new
 * window, then call `print()` on it. On a desktop with popups allowed that
 * works. On the iPhone the owner and the counter staff actually use, it fails
 * in four separate ways at once:
 *
 *   1. `window.open` only survives if it runs synchronously inside a user
 *      gesture. The receipt HTML is fetched from the API first, and after that
 *      `await` Safari has already forgotten the tap — so the call returns null
 *      and the user gets "Allow pop-ups to print receipts" no matter what they
 *      allow.
 *
 *   2. When it does open, iOS shows it as a whole new TAB rather than a print
 *      dialog. That is the "it opens a print page first" complaint: the
 *      receipt appears as another page to navigate, not as something printing.
 *
 *   3. `win.addEventListener('load', …)` was attached AFTER `document.write()`
 *      and `document.close()`, by which point load has usually already fired.
 *      The print call then never happened at all.
 *
 *   4. `document.write` into a blank popup leaves the document with no base
 *      URL and no viewport, so relative assets and CSS resolve inconsistently.
 *
 * The approach here is the one the pre-React `receipt.html` used and which the
 * rewrite lost: put the receipt in the CURRENT page and print that. No popup,
 * so nothing to block and no gesture to lose. It is delivered through a hidden
 * same-origin iframe so the receipt's own stylesheet — which styles `body` and
 * `:root` — cannot leak into the admin panel around it.
 *
 * Everything below is about making that reliable on Safari specifically.
 */

/** How long to wait for the receipt's fonts and images before printing. */
const ASSET_TIMEOUT_MS = 3000;

/** How long the frame lingers after printing, for browsers that never say. */
const CLEANUP_DELAY_MS = 60000;

const FRAME_ID = 'arteva-print-frame';

/**
 * iOS Safari, including iPadOS pretending to be a Mac.
 *
 * Used only to pick between two working paths, never to withhold a feature:
 * the desktop path is not broken on iOS so much as it needs different timing.
 */
function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Remove any frame left behind by an earlier print. */
function removeExistingFrame() {
  const existing = document.getElementById(FRAME_ID);
  if (existing) existing.remove();
}

/**
 * Wait until the document inside the frame has its fonts and images.
 *
 * Printing before they land produces a receipt with the QR codes missing and
 * the type in a fallback face — and, worse, the template's own fit-to-page
 * script measures the wrong height and scales to it.
 *
 * Always resolves. A slow font is a reason to print an imperfect receipt, never
 * a reason to print nothing.
 */
function whenReady(frameWindow) {
  return new Promise((resolve) => {
    const done = () => resolve();
    const timer = setTimeout(done, ASSET_TIMEOUT_MS);

    const finish = () => { clearTimeout(timer); done(); };

    try {
      const doc = frameWindow.document;

      const images = Array.from(doc.images || []);
      const pending = images
        .filter(img => !img.complete)
        .map(img => new Promise(res => {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        }));

      const fonts = doc.fonts?.ready ?? Promise.resolve();

      Promise.all([fonts, ...pending]).then(finish, finish);
    } catch {
      finish();
    }
  });
}

/**
 * Print a complete HTML document.
 *
 * @param {string} html  a full `<!DOCTYPE html>…` document
 * @param {Object} [opts]
 * @param {string} [opts.title] used as the default filename in "Save as PDF"
 * @returns {Promise<boolean>} false only if the frame could not be created
 */
export async function printHtmlDocument(html, { title } = {}) {
  if (!html) return false;

  removeExistingFrame();

  const frame = document.createElement('iframe');
  frame.id = FRAME_ID;
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');

  /* Positioned off-screen rather than `display:none` or `visibility:hidden`.
   *
   * A frame with no layout box is not rendered, and Safari will print a blank
   * page from a document it never laid out. It has to occupy real space and be
   * merely invisible. A4 proportions so the template's fit-to-page measurement
   * sees the geometry it will actually print at, instead of measuring against
   * a phone-width viewport and shrinking the receipt to fit a screen nobody is
   * printing to. */
  Object.assign(frame.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '210mm',
    height: '297mm',
    opacity: '0',
    pointerEvents: 'none',
    border: '0',
    zIndex: '-1',
  });

  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;
  if (!frameWindow) {
    frame.remove();
    return false;
  }

  /* Written with document.write rather than srcdoc.
   *
   * srcdoc loads asynchronously and, on iOS, sometimes reports the frame ready
   * before the document inside it exists — printing an empty page. An
   * explicitly opened and closed document is synchronous and observable. */
  const doc = frameWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  if (title) {
    try { doc.title = title; } catch { /* not worth failing a print over */ }
  }

  await whenReady(frameWindow);

  /* Clean-up is time-based as well as event-based.
   *
   * `afterprint` is not reliable on iOS Safari — it often never fires — so a
   * frame removed only on that event would accumulate one per print for the
   * life of the page. Removing it too eagerly is worse though: Safari renders
   * the print preview lazily, and tearing the frame down while the sheet is
   * still open prints a blank page. Hence a long delay, plus the event when it
   * does arrive. */
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    // A further tick of grace: `afterprint` fires as the sheet dismisses, and
    // Safari can still be reading the document at that moment.
    setTimeout(() => frame.remove(), 1000);
  };

  frameWindow.addEventListener?.('afterprint', cleanup, { once: true });
  setTimeout(cleanup, CLEANUP_DELAY_MS);

  try {
    // focus() before print() — Safari prints the focused document, and without
    // this it can print the admin panel behind the frame instead of the receipt.
    frameWindow.focus();

    if (isIOS()) {
      /* iOS needs the print call to leave the current task.
       *
       * Called synchronously right after document.close(), Safari raises the
       * share sheet against a document it has not finished laying out and the
       * result is a blank or half-drawn page. One frame of delay is enough and
       * is imperceptible. */
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    }

    frameWindow.print();
    return true;
  } catch {
    cleanup();
    return false;
  }
}

/**
 * Print an image (the receipt canvas) on an A4 sheet.
 *
 * Used for a receipt that has not been saved yet and therefore has no
 * server-rendered HTML to ask for. Saved orders print through
 * `printHtmlDocument` instead — real text prints sharper than a bitmap of it,
 * and the document is a fraction of the size, which matters when the device
 * doing the printing is a phone.
 */
export function buildImagePrintDocument(dataUrl, title = 'Receipt') {
  const safeTitle = String(title).replace(/[<>&"]/g, '');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  /* Sized in millimetres, not percentages: a percentage resolves against the
     viewport, which on a phone is nothing like the sheet being printed to. */
  img {
    display: block;
    width: 210mm;
    height: auto;
    max-height: 297mm;
    object-fit: contain;
    margin: 0 auto;
  }
  @media print {
    img { width: 210mm; page-break-inside: avoid; break-inside: avoid; }
  }
</style>
</head>
<body><img src="${dataUrl}" alt="${safeTitle}"></body>
</html>`;
}
