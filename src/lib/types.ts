export interface ProjectMeta {
  obra: string;
  endereco: string;
  projeto: string;
  etapa: string;
  data: string; // yyyy-mm-dd
  emissao: string; // ex.: E09
  prefixo: string; // ex.: LOGTRS-ARQ
  nomeArquivo: string; // base do arquivo de saída
}

export type RowState = "novo" | "revisado" | "igual" | "manual";

export interface MasterRow {
  id: string;
  arquivo: string;
  rev: string;
  data: string; // data da revisão (yyyy-mm-dd)
  formato: string;
  conteudo: string;
  revisoes: string;
  estado: RowState;
  atualizadoEm?: string; // última modificação do arquivo (yyyy-mm-dd)
}

export const emptyMeta = (): ProjectMeta => ({
  obra: "",
  endereco: "",
  projeto: "ARQUITETÔNICO",
  etapa: "PROJETO LEGAL",
  data: new Date().toISOString().slice(0, 10),
  emissao: "E00",
  prefixo: "LOGTRS-ARQ",
  nomeArquivo: "LISTA-MESTRA",
});

export const emptyRow = (data: string): MasterRow => ({
  id: crypto.randomUUID(),
  arquivo: "",
  rev: "",
  data,
  formato: "",
  conteudo: "",
  revisoes: "",
  estado: "manual",
});

// Converte um timestamp/Date para string yyyy-mm-dd no fuso local
export function toISODate(input: number | Date): string {
  const d = typeof input === "number" ? new Date(input) : input;
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

// Compara apenas a parte de data. Retorna true se "a" é posterior a "b".
export function isAfterDay(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a > b;
}
