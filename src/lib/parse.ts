// Utilitário: deriva referência, revisão e data de modificação a partir do arquivo.
export interface ParsedName {
  referencia: string;
  rev: string;
}

export interface ParsedFile extends ParsedName {
  fileName: string;
  lastModified: number;
  file: File;
}

export function parseFileName(fileName: string): ParsedName {
  const stem = fileName.replace(/\.(pdf|dwg|dxf)$/i, "");
  const m = stem.match(/-R(\d+)/i);
  if (m && m.index !== undefined) {
    return { referencia: stem.slice(0, m.index), rev: String(parseInt(m[1], 10)) };
  }
  return { referencia: stem, rev: "" };
}

// Mantém 1 entrada por referência: maior revisão e, em empate, a modificação mais recente.
export function dedupeByFiles(files: File[]): ParsedFile[] {
  const map = new Map<string, ParsedFile>();
  for (const f of files) {
    const p = parseFileName(f.name);
    const entry: ParsedFile = { ...p, fileName: f.name, lastModified: f.lastModified, file: f };
    const prev = map.get(p.referencia);
    if (!prev) {
      map.set(p.referencia, entry);
      continue;
    }
    const newer =
      parseInt(entry.rev || "0", 10) > parseInt(prev.rev || "0", 10) ||
      (entry.rev === prev.rev && entry.lastModified > prev.lastModified);
    if (newer) map.set(p.referencia, entry);
  }
  return [...map.values()].sort((a, b) => a.referencia.localeCompare(b.referencia));
}
