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
let loaderOverride: (() => Promise<any>) | null = null;

// Injeta um pdf.js falso nos testes. Em produção fica sempre nulo (usa o CDN).
export function _setPdfjsLoaderForTests(fn: (() => Promise<any>) | null): void {
  loaderOverride = fn;
  pdfjsPromise = null;
}

async function loadPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = (loaderOverride ? loaderOverride() : import(/* @vite-ignore */ PDFJS_URL)).then((mod: any) => {
      const lib = mod.default || mod;
      if (lib.GlobalWorkerOptions) lib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      return lib;
    });
  }
  return pdfjsPromise;
}

// Abre o PDF, roda a leitura e SEMPRE libera o documento (doc.destroy()).
// Sem isso, uma pasta com dezenas de pranchas acumula documentos abertos no
// worker do pdf.js e as últimas leituras começam a falhar em silêncio.
async function comDocumento<T>(file: File, fn: (doc: any) => Promise<T>): Promise<T> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const doc = await task.promise;
  try {
    return await fn(doc);
  } finally {
    try {
      await doc.destroy();
    } catch {
      /* liberar é best-effort */
    }
  }
}

// Páginas na ordem em que o carimbo costuma estar: última primeiro, depois a primeira.
function ordemPaginas(doc: any): number[] {
  return doc.numPages > 1 ? [doc.numPages, 1] : [1];
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

async function lerFormato(doc: any): Promise<string> {
  for (const n of ordemPaginas(doc)) {
    const items = await pageItems(await doc.getPage(n));
    const byLabel = pickByLabel(items);
    if (byLabel) return byLabel;
  }
  const items = await pageItems(await doc.getPage(doc.numPages));
  return mostFrequent(items) || "";
}

export async function extractFormato(file: File): Promise<string> {
  return (await extractCarimbo(file)).formato;
}


// Extração da DATA do carimbo (campo "DATA" do bloco de identificação da prancha).
const DATE_RE = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/;

function toISODateStr(d: string, m: string, y: string): string {
  if (y.length === 2) y = "20" + y;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// Escolhe a data mais próxima (espacialmente) de um rótulo "DATA"; sem rótulo, a mais frequente.
function pickDateByLabel(items: Item[]): string | null {
  const labels = items.filter((i) => /^DATA\b/i.test(i.str.trim()));
  const dated: { iso: string; x: number; y: number }[] = [];
  for (const it of items) {
    const m = it.str.match(DATE_RE);
    if (m) dated.push({ iso: toISODateStr(m[1], m[2], m[3]), x: it.x, y: it.y });
  }
  if (!dated.length) return null;
  if (!labels.length) {
    const freq: Record<string, number> = {};
    for (const d of dated) freq[d.iso] = (freq[d.iso] || 0) + 1;
    return Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
  }
  let best: { iso: string; d: number } | null = null;
  for (const lb of labels) {
    for (const dt of dated) {
      const dist = Math.hypot(lb.x - dt.x, lb.y - dt.y);
      if (!best || dist < best.d) best = { iso: dt.iso, d: dist };
    }
  }
  return best ? best.iso : null;
}

async function lerData(doc: any): Promise<string> {
  for (const n of ordemPaginas(doc)) {
    const items = await pageItems(await doc.getPage(n));
    const d = pickDateByLabel(items);
    if (d) return d;
  }
  return "";
}

export async function extractDataCarimbo(file: File): Promise<string> {
  return (await extractCarimbo(file)).data;
}


// Extração do TÍTULO do carimbo (canto do carimbo, rótulo "TÍTULO:").
// O carimbo é rotacionado; usamos a geometria do item (transform + width) para
// achar as linhas adjacentes ao rótulo que sobrepõem sua faixa vertical.
interface TLine { str: string; x: number; yTop: number; yBot: number; }

async function lineItems(page: any): Promise<TLine[]> {
  const tc = await page.getTextContent();
  const out: TLine[] = [];
  for (const it of tc.items as any[]) {
    const str = String(it.str || "");
    if (!str.trim()) continue;
    const t = it.transform || [1, 0, 0, 1, 0, 0];
    const a = t[0], b = t[1], e = t[4], f = t[5];
    const w = it.width || 0;
    const fs = Math.hypot(a, b) || 1;
    const yEnd = f + (b / fs) * w; // extensão ao longo da direção do texto
    out.push({ str, x: e, yTop: Math.max(f, yEnd), yBot: Math.min(f, yEnd) });
  }
  return out;
}

function pickTitulo(items: TLine[]): string {
  const label = items.find((i) => /^T[IÍ]TULO/i.test(i.str.trim()));
  if (!label) return "";
  const cands: { x: number; y: number; str: string }[] = [];
  const inline = label.str.replace(/.*T[IÍ]TULO[:\s]*/i, "").trim();
  if (inline) cands.push({ x: label.x, y: label.yTop, str: inline });
  const ly0 = label.yBot, ly1 = label.yTop;
  for (const it of items) {
    if (it === label) continue;
    if (it.x <= label.x + 2 || it.x > label.x + 170) continue;
    const ov = Math.min(ly1, it.yTop) - Math.max(ly0, it.yBot);
    if (ov > 3) cands.push({ x: it.x, y: it.yTop, str: it.str.trim() });
  }
  cands.sort((p, q) => p.x - q.x || q.y - p.y);
  return cands.map((c) => c.str).join(" ").replace(/\s+/g, " ").trim();
}


// Correção de digitação (extensível) + normalização leve de espaçamento do TÍTULO.
const TITULO_TYPOS: Record<string, string> = {
  FACAHDAS: "FACHADAS",
};

function normalizeTitulo(s: string): string {
  if (!s) return "";
  let t = s.replace(/\s+/g, " ").trim();
  for (const wrong in TITULO_TYPOS) {
    t = t.replace(new RegExp("\\b" + wrong + "\\b", "gi"), TITULO_TYPOS[wrong]);
  }
  t = t.replace(/,(?=\S)/g, ", ");          // espaço após vírgula
  t = t.replace(/\s*-\s+|\s+-\s*/g, " - ");  // hífen separador -> " - "
  return t.trim();
}

async function lerTitulo(doc: any): Promise<string> {
  for (const n of ordemPaginas(doc)) {
    const items = await lineItems(await doc.getPage(n));
    const t = pickTitulo(items);
    if (t) return normalizeTitulo(t);
  }
  return "";
}

export async function extractTitulo(file: File): Promise<string> {
  return (await extractCarimbo(file)).titulo;
}

// ---- leitura única do carimbo ----

export interface Carimbo {
  formato: string;
  data: string;
  titulo: string;
}

export interface CarimboOpcoes {
  data?: boolean;   // ler a DATA do carimbo (padrão: true)
  titulo?: boolean; // ler o TÍTULO do carimbo (padrão: true)
}

const CARIMBO_VAZIO: Carimbo = { formato: "", data: "", titulo: "" };

// Lê FORMATO, DATA e TÍTULO abrindo o PDF UMA única vez.
// Antes cada campo abria o próprio documento (3 aberturas por prancha, nenhuma
// liberada): numa pasta com dezenas de arquivos as últimas leituras voltavam
// vazias e a linha caía para a data de modificação do arquivo.
// Se a leitura falhar ou vier completamente vazia, tenta mais uma vez.
export async function extractCarimbo(file: File, opts: CarimboOpcoes = {}): Promise<Carimbo> {
  const querData = opts.data !== false;
  const querTitulo = opts.titulo !== false;

  const tentativa = async (): Promise<Carimbo> =>
    comDocumento(file, async (doc) => ({
      formato: await lerFormato(doc),
      data: querData ? await lerData(doc) : "",
      titulo: querTitulo ? await lerTitulo(doc) : "",
    }));

  const vazio = (c: Carimbo) => !c.formato && !c.data && !c.titulo;

  try {
    const c = await tentativa();
    if (!vazio(c)) return c;
  } catch {
    /* cai na segunda tentativa */
  }
  try {
    return await tentativa();
  } catch {
    return { ...CARIMBO_VAZIO };
  }
}
