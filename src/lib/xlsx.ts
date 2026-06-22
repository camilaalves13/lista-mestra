import ExcelJS from "exceljs";
import type { MasterRow, ProjectMeta } from "./types";
import { LOGO_SG } from "./logos";

function toDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

type BS = ExcelJS.BorderStyle;
const side = (style: BS) => ({ style });

function estLines(text: string, widthChars: number): number {
  if (!text) return 1;
  return text.split("\n").reduce((a, l) => a + Math.max(1, Math.ceil(l.length / widthChars)), 0);
}

function applyRules(rows: MasterRow[]): MasterRow[] {
  return rows.map((r) => {
    const revNum = parseInt(r.rev || "0", 10);
    if (revNum === 0 && !(r.revisoes || "").trim()) return { ...r, revisoes: "EMISSÃO INICIAL" };
    return r;
  });
}

// Adiciona os logos. SG é a base; se houver logo de cliente, fica ao lado (A | B:D).
function placeLogos(wb: ExcelJS.Workbook, ws: ExcelJS.Worksheet, clientLogo?: string | null) {
  try {
    const idSG = wb.addImage({ base64: LOGO_SG, extension: "png" });
    if (clientLogo) {
      ws.mergeCells("A2:A6");
      ws.mergeCells("B2:D6");
      const idClient = wb.addImage({ base64: clientLogo, extension: "png" });
      ws.addImage(idSG, { tl: { col: 0.18, row: 2.55 }, ext: { width: 205, height: 65 } });
      ws.addImage(idClient, { tl: { col: 1.35, row: 1.7 }, ext: { width: 150, height: 96 } });
    } else {
      ws.mergeCells("A2:D6");
      ws.addImage(idSG, { tl: { col: 0.6, row: 2.0 }, ext: { width: 250, height: 79 } });
    }
  } catch {
    /* logos opcionais */
  }
}

// Constrói uma aba de emissão completa (cabeçalho + logos + tabela).
function buildSheet(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  meta: ProjectMeta,
  metaDate: string,
  rows: MasterRow[],
  clientLogo?: string | null
) {
  ws.views = [{ showGridLines: false }];
  [39, 8, 14.5, 12.5, 50, 40].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  ws.mergeCells("A1:F1");
  const title = ws.getCell("A1");
  title.value = "LISTA MESTRA DE PROJETOS";
  title.font = { name: "Calibri", size: 14, bold: true };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.border = { top: side("medium"), left: side("medium"), right: side("medium"), bottom: side("medium") };
  ws.getRow(1).height = 20;

  placeLogos(wb, ws, clientLogo);
  ws.getRow(2).height = 26;
  ws.getRow(3).height = 26;
  ws.getRow(4).height = 26;
  ws.getRow(5).height = 26;
  ws.getRow(6).height = 26;

  const mrows: [string, string | Date | null][] = [
    ["OBRA", meta.obra],
    ["ENDEREÇO", meta.endereco],
    ["PROJETO", meta.projeto],
    ["ETAPA", meta.etapa],
    ["DATA", toDate(metaDate)],
  ];
  mrows.forEach((m, k) => {
    const r = 2 + k;
    const ce = ws.getCell("E" + r);
    ce.value = m[0];
    ce.font = { name: "Calibri", size: 11, bold: true };
    ce.alignment = { vertical: "middle" };
    const cf = ws.getCell("F" + r);
    cf.value = m[1] as ExcelJS.CellValue;
    if (m[0] === "DATA") cf.numFmt = "dd/mm/yyyy";
    cf.font = { name: "Calibri", size: 11 };
    cf.alignment = { vertical: "middle", wrapText: true };
  });

  // Bordas pontilhadas (hair) no bloco do cabeçalho, como no documento original.
  const hair = side("hair");
  const med = side("medium");
  // Bloco de logos (mesclado A2:D6): moldura externa + separador pontilhado p/ os metadados
  ws.getCell("A2").border = { left: med, right: hair, top: med, bottom: med };
  // Metadados E2:F6: grade pontilhada; topo (linha 2) e base (linha 6) médios; direita média (borda da tabela)
  for (let r = 2; r <= 6; r++) {
    const top = r === 2 ? med : hair;
    const bottom = r === 6 ? med : hair;
    ws.getCell("E" + r).border = { left: hair, right: hair, top, bottom };
    ws.getCell("F" + r).border = { left: hair, right: med, top, bottom };
  }

  const head = ["ARQUIVO", "R E V", "DATA", "FORMATO", "CONTEÚDO", "REVISÕES REALIZADAS"];
  const hr = ws.getRow(7);
  head.forEach((h, k) => {
    const c = hr.getCell(k + 1);
    c.value = h;
    c.font = { name: "Calibri", size: 10, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = { top: side("medium"), left: side("medium"), right: side("medium"), bottom: side("medium") };
  });
  hr.height = 18;

  const finalRows = applyRules(rows);
  const first = 8;
  const last = first + finalRows.length - 1;
  finalRows.forEach((x, n) => {
    const r = first + n;
    const isLast = r === last;
    const row = ws.getRow(r);
    row.getCell(1).value = x.arquivo;
    row.getCell(2).value = x.rev === "" ? null : Number(x.rev);
    row.getCell(3).value = toDate(x.data);
    row.getCell(3).numFmt = "dd/mm/yyyy";
    row.getCell(4).value = x.formato;
    row.getCell(5).value = x.conteudo;
    row.getCell(6).value = x.revisoes;
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.font = c === 1 ? { name: "Calibri", size: 11 } : { name: "Arial", size: 9 };
      cell.alignment = { horizontal: c === 2 || c === 4 ? "center" : "left", vertical: "middle", wrapText: true };
      cell.border = {
        top: side("thin"),
        bottom: side(isLast ? "medium" : "thin"),
        left: side(c === 1 ? "medium" : "thin"),
        right: side(c === 6 ? "medium" : "thin"),
      };
    }
    const lines = Math.max(estLines(x.conteudo, 48), estLines(x.revisoes, 38), 1);
    row.height = Math.min(110, Math.max(32, lines * 15));
  });

  ws.pageSetup = {
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
}

// ---- leitura de uma planilha anterior ----
interface Emission {
  name: string;
  data: string; // data da emissão (yyyy-mm-dd) lida do cabeçalho
  rows: MasterRow[];
}

function readSheetRows(sheet: ExcelJS.Worksheet): { data: string; rows: MasterRow[] } {
  let headerRow = -1;
  const col: Record<string, number> = {};
  let headerDate = "";
  sheet.eachRow((row, rn) => {
    row.eachCell((cell, cn) => {
      const raw = cell.value;
      const v = (raw == null ? "" : String(raw)).toUpperCase().replace(/\s/g, "");
      if (v === "DATA" && headerRow < 0) {
        // data do cabeçalho (coluna ao lado)
        const next = row.getCell(cn + 1).value;
        if (next instanceof Date) headerDate = next.toISOString().slice(0, 10);
      }
      if (v === "ARQUIVO") {
        headerRow = rn;
        col.arq = cn;
      }
      if (headerRow === rn) {
        if (v.startsWith("REV") && !v.startsWith("REVIS")) col.rev = cn;
        if (v === "DATA") col.data = cn;
        if (v === "FORMATO") col.fmt = cn;
        if (v.startsWith("CONTE")) col.cont = cn;
        if (v.startsWith("REVIS")) col.revs = cn;
      }
    });
  });
  const rows: MasterRow[] = [];
  if (headerRow > 0) {
    const txt = (row: ExcelJS.Row, c?: number) => {
      if (!c) return "";
      const val = row.getCell(c)?.value as any;
      if (val == null) return "";
      if (val.richText) return val.richText.map((t: any) => t.text).join("");
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      return String(val);
    };
    sheet.eachRow((row, rn) => {
      if (rn <= headerRow) return;
      const arq = col.arq ? row.getCell(col.arq).value : null;
      if (!arq) return;
      const dataVal = col.data ? row.getCell(col.data).value : null;
      const dataStr = dataVal instanceof Date ? dataVal.toISOString().slice(0, 10) : "";
      rows.push({
        id: crypto.randomUUID(),
        arquivo: String(arq).trim(),
        rev: col.rev ? String(row.getCell(col.rev).value ?? "") : "",
        data: dataStr,
        formato: txt(row, col.fmt),
        conteudo: txt(row, col.cont),
        revisoes: txt(row, col.revs),
        estado: "igual",
      });
    });
  }
  return { data: headerDate, rows };
}

async function readAllEmissions(file: File): Promise<Emission[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ems: Emission[] = [];
  wb.eachSheet((ws) => {
    if (/E\d+/i.test(ws.name)) {
      const { data, rows } = readSheetRows(ws);
      ems.push({ name: ws.name, data, rows });
    }
  });
  ems.sort((a, b) => a.name.localeCompare(b.name));
  return ems;
}

export interface ImportedPrev {
  proximaEmissao: string;
  rows: MasterRow[];
}

export async function importPrevious(file: File): Promise<ImportedPrev> {
  const ems = await readAllEmissions(file);
  let bestN = -1;
  let latest: Emission | null = null;
  for (const e of ems) {
    const m = e.name.match(/E(\d+)/i);
    const n = m ? parseInt(m[1], 10) : -1;
    if (n > bestN) {
      bestN = n;
      latest = e;
    }
  }
  const next = bestN >= 0 ? "E" + String(bestN + 1).padStart(2, "0") : "E00";
  return { proximaEmissao: next, rows: latest ? latest.rows : [] };
}

export interface ExportOptions {
  clientLogo?: string | null;
}

// Gera SEMPRE um arquivo novo (não reescreve o arquivo anterior).
// Se houver arquivo anterior, recria todas as emissões antigas como abas + a nova emissão.
export async function exportMasterList(
  meta: ProjectMeta,
  rows: MasterRow[],
  previousFile: File | null,
  opts: ExportOptions = {}
): Promise<string> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SG Projetos";

  if (previousFile) {
    const ems = await readAllEmissions(previousFile);
    for (const e of ems) {
      if (e.name === meta.emissao) continue; // nao duplicar a emissao atual
      const ws = wb.addWorksheet(e.name);
      buildSheet(wb, ws, meta, e.data || meta.data, e.rows, opts.clientLogo);
    }
  }

  const ws = wb.addWorksheet(meta.emissao);
  buildSheet(wb, ws, meta, meta.data, rows, opts.clientLogo);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const name = `${meta.nomeArquivo}_${meta.emissao}.xlsx`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  return name;
}
