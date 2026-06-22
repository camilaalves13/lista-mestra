// Extração do FORMATO (A0, A1, A0+, ...) a partir do carimbo do PDF.
// O pdf.js é carregado sob demanda via CDN (não é dependência de build).
const PDFJS_VERSION = "4.5.136";
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

const FORMAT_RE = /\bA[0-4]\+{0,3}\b/g;
const FORMAT_EXACT = /^A[0-4]\+{0,3}$/;

interface Item {
  str: string;
  x: number;
  y: number;
}

let pdfjsPromise: Promise<any> | null = null;
async function loadPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* @vite-ignore */ PDFJS_URL).then((mod: any) => {
      const lib = mod.default || mod;
      lib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      return lib;
    });
  }
  return pdfjsPromise;
}

function pickByLabel(items: Item[]): string | null {
  for (const it of items) {
    if (/FORMATO/i.test(it.str)) {
      const after = it.str.replace(/.*FORMATO[:\s]*/i, "");
      const m = after.match(FORMAT_RE);
      if (m && m.length) return m[0].toUpperCase();
    }
  }
  const labels = items.filter((i) => /^FORMATO\b/i.test(i.str.trim()));
  const values = items.filter((i) => FORMAT_EXACT.test(i.str.trim().toUpperCase()));
  if (labels.length && values.length) {
    let best: { v: string; d: number } | null = null;
    for (const lb of labels) {
      for (const vl of values) {
        const d = Math.hypot(lb.x - vl.x, lb.y - vl.y);
        if (!best || d < best.d) best = { v: vl.str.trim().toUpperCase(), d };
      }
    }
    if (best) return best.v;
  }
  return null;
}

function mostFrequent(items: Item[]): string | null {
  const freq: Record<string, number> = {};
  for (const it of items) {
    const m = it.str.toUpperCase().match(FORMAT_RE);
    if (m) for (const t of m) freq[t] = (freq[t] || 0) + 1;
  }
  const keys = Object.keys(freq);
  if (!keys.length) return null;
  keys.sort((a, b) => freq[b] - freq[a] || b.length - a.length);
  return keys[0];
}

async function pageItems(page: any): Promise<Item[]> {
  const tc = await page.getTextContent();
  return tc.items
    .map((i: any) => ({ str: String(i.str || ""), x: i.transform?.[4] ?? 0, y: i.transform?.[5] ?? 0 }))
    .filter((i: Item) => i.str.trim().length > 0);
}

export async function extractFormato(file: File): Promise<string> {
  try {
    const pdfjs = await loadPdfjs();
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const order = doc.numPages > 1 ? [doc.numPages, 1] : [1];
    for (const n of order) {
      const page = await doc.getPage(n);
      const items = await pageItems(page);
      const byLabel = pickByLabel(items);
      if (byLabel) return byLabel;
    }
    const page = await doc.getPage(doc.numPages);
    const items = await pageItems(page);
    return mostFrequent(items) || "";
  } catch {
    return "";
  }
}
