import ExcelJS from "exceljs";
import type { MasterRow, ProjectMeta } from "./types";
import { LOGO_SG } from "./logos";

// Converte yyyy-mm-dd para Date em UTC (evita deslocamento de fuso / horário no Excel)
function toDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

type BS = ExcelJS.BorderStyle;
const side = (style: BS) => ({ style });

// Estima a altura da linha a partir do conteúdo (quebras + wrap nas colunas largas)
function estLines(text: string, widthChars: number): number {
  if (!text) return 1;
  return text
    .split("\n")
    .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / widthChars)), 0);
}

// Aplica a regra: revisão 00 -> "EMISSÃO INICIAL" quando o campo estiver vazio
function applyRules(rows: MasterRow[]): MasterRow[] {
  return rows.map((r) => {
    const revNum = parseInt(r.rev || "0", 10);
    if (revNum === 0 && !(r.revisoes || "").trim()) {
      return { ...r, revisoes: "EMISSÃO INICIAL" };
    }
    return r;
  });
}

function placeLogos(wb: ExcelJS.Workbook, ws: ExcelJS.Worksheet, clientLogo?: string | null) {
  try {
    const idSG = wb.addImage({ base64: LOGO_SG, extension: "png" });
    if (clientLogo) {
      // SG na coluna A, logo do cliente em B:D
      ws.mergeCells("A2:A6");
      ws.mergeCells("B2:D6");
      const idClient = wb.addImage({ base64: clientLogo, extension: "png" });
      ws.addImage(idSG, { tl: { col: 0.12, row: 2.7 }, ext: { width: 140, height: 52 } });
      ws.addImage(idClient, { tl: { col: 1.15, row: 1.5 }, ext: { width: 120, height: 78 } });
    } else {
      // Apenas SG, mesclado nas duas colunas (A:D)
      ws.mergeCells("A2:D6");
      ws.addImage(idSG, { tl: { col: 0.7, row: 2.4 }, ext: { width: 180, height: 66 } });
    }
  } catch {
    /* logos opcionais */
  }
}

function buildSheet(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  meta: ProjectMeta,
  rows: MasterRow[],
  clientLogo?: string | null
) {
  ws.views = [{ showGridLines: false }];
  const widths = [39, 8, 14.5, 12.5, 50, 40];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  // Título
  ws.mergeCells("A1:F1");
  const title = ws.getCell("A1");
  title.value = "LISTA MESTRA DE PROJETOS";
  title.font = { name: "Calibri", size: 14, bold: true };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.border = { top: side("medium"), left: side("medium"), right: side("medium"), bottom: side("medium") };
  ws.getRow(1).height = 20;

  // Bloco de logos + metadados
  placeLogos(wb, ws, clientLogo);
  ws.getRow(3).height = 30;
  ws.getRow(4).height = 30;
  const metaRows: [string, string | Date | null][] = [
    ["OBRA", meta.obra],
    ["ENDEREÇO", meta.endereco],
    ["PROJETO", meta.projeto],
    ["ETAPA", meta.etapa],
    ["DATA", toDate(meta.data)],
  ];
  metaRows.forEach((mr, k) => {
    const r = 2 + k;
    const ce = ws.getCell("E" + r);
    ce.value = mr[0];
    ce.font = { name: "Calibri", size: 11, bold: true };
    ce.alignment = { vertical: "middle" };
    const cf = ws.getCell("F" + r);
    cf.value = mr[1] as ExcelJS.CellValue;
    if (mr[0] === "DATA") cf.numFmt = "dd/mm/yyyy";
    cf.font = { name: "Calibri", size: 11 };
    cf.alignment = { vertical: "middle" };
  });

  // Cabeçalho da tabela (linha 7)
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

  // Linhas de dados a partir da 8 — grade limpa com moldura externa média
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
    row.height = Math.min(90, Math.max(18, lines * 13.5));
  });

  ws.pageSetup = {
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
}

export interface ExportOptions {
  clientLogo?: string | null;
}

export async function exportMasterList(
  meta: ProjectMeta,
  rows: MasterRow[],
  previousFile: File | null,
  opts: ExportOptions = {}
): Promise<string> {
  let wb: ExcelJS.Workbook;
  if (previousFile) {
    wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await previousFile.arrayBuffer());
    const existing = wb.getWorksheet(meta.emissao);
    if (existing) wb.removeWorksheet(existing.id);
  } else {
    wb = new ExcelJS.Workbook();
    wb.creator = "SG Projetos";
  }
  const ws = wb.addWorksheet(meta.emissao);
  buildSheet(wb, ws, meta, rows, opts.clientLogo);

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

export interface ImportedPrev {
  proximaEmissao: string;
  rows: MasterRow[];
}

export async function importPrevious(file: File): Promise<ImportedPrev> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  let best: ExcelJS.Worksheet | null = null;
  let bestN = -1;
  wb.eachSheet((ws) => {
    const m = ws.name.match(/E(\d+)/i);
    const n = m ? parseInt(m[1], 10) : -1;
    if (n > bestN) {
      bestN = n;
      best = ws;
    }
  });
  const rows: MasterRow[] = [];
  if (best) {
    const sheet = best as ExcelJS.Worksheet;
    let headerRow = -1;
    const col: Record<string, number> = {};
    sheet.eachRow((row, rn) => {
      row.eachCell((cell, cn) => {
        const v = (cell.value == null ? "" : String(cell.value)).toUpperCase().replace(/\s/g, "");
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
    if (headerRow > 0) {
      const txt = (row: ExcelJS.Row, c?: number) => {
        if (!c) return "";
        const cell = row.getCell(c);
        const val = cell?.value as any;
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
  }
  const next = bestN >= 0 ? "E" + String(bestN + 1).padStart(2, "0") : "E00";
  return { proximaEmissao: next, rows };
}
