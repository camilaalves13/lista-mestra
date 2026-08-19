import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  FILL_LINHAS_DADOS,
  LARGURAS,
  TAMANHO_LOGO_CLIENTE,
  TAMANHO_LOGO_SG,
  alturaLinhaEndereco,
  centralizarImagem,
  cmParaPx,
  exportMasterList,
  tamanhoPng,
} from "./xlsx";
import { LOGO_SG, LOGO_LOG } from "./logos";
import { emptyMeta, emptyRow, type ProjectMeta } from "./types";

const ENDERECO_LOGSLS =
  "DISTRITO DE SÃO JOAQUIM DO BACANGA - KM 11, BR-135, GLEBA BACABAL - À MARGEM ESQUERDA DA RODOVIA SÃO LUÍS-TERESINA - SÃO LUÍS/MA";

describe("FILL_LINHAS_DADOS", () => {
  it('é o cinza "Branco, plano de fundo 1, mais escuro 25%"', () => {
    expect(FILL_LINHAS_DADOS).toBe("FFBFBFBF");
  });
});

describe("alturaLinhaEndereco", () => {
  it("usa a altura padrão do cabeçalho quando não há endereço", () => {
    expect(alturaLinhaEndereco("")).toBe(26);
  });

  it("usa a altura padrão para endereços curtos", () => {
    expect(alturaLinhaEndereco("RUA A, 100 - SÃO LUÍS/MA")).toBe(26);
  });

  it("cresce para o endereço não sair cortado", () => {
    expect(alturaLinhaEndereco(ENDERECO_LOGSLS)).toBe(68);
  });

  it("nunca passa do teto de 96", () => {
    expect(alturaLinhaEndereco("X".repeat(5000))).toBe(96);
  });
});

// ---- teste de ponta a ponta do cabeçalho gerado ----

async function gerarWorkbook(meta: Partial<ProjectMeta> = {}) {
  const capturado: { blob: Blob | null } = { blob: null };
  const urlOriginal = globalThis.URL.createObjectURL;
  globalThis.URL.createObjectURL = ((blob: Blob) => {
    capturado.blob = blob;
    return "blob:teste";
  }) as typeof globalThis.URL.createObjectURL;
  globalThis.URL.revokeObjectURL = (() => {}) as typeof globalThis.URL.revokeObjectURL;
  (globalThis as any).document = { createElement: () => ({ href: "", download: "", click() {} }) };

  await exportMasterList(
    { ...emptyMeta(), obra: "LOG SÃO LUÍS", data: "2026-03-12", emissao: "E01", ...meta },
    [{ ...emptyRow("2026-03-12"), arquivo: "LOGSLS-ARQ-100-PE-IMP", rev: "0", formato: "A1", conteudo: "IMPLANTAÇÃO" }],
    null
  );
  globalThis.URL.createObjectURL = urlOriginal;
  if (!capturado.blob) throw new Error("workbook não capturado");
  const buf = await capturado.blob.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb.getWorksheet("E01")!;
}

describe("cabeçalho da aba", () => {
  it("alinha a DATA à esquerda, como os demais campos", async () => {
    const ws = await gerarWorkbook();
    const alinhamentos = ["F2", "F3", "F4", "F5", "F6"].map((c) => ws.getCell(c).alignment?.horizontal);
    expect(alinhamentos).toEqual(["left", "left", "left", "left", "left"]);
  });

  it("mantém a DATA como data formatada dd/mm/yyyy", async () => {
    const ws = await gerarWorkbook();
    expect(ws.getCell("F6").numFmt).toBe("dd/mm/yyyy");
    expect(ws.getCell("F6").value).toBeInstanceOf(Date);
  });

  it("aplica o cinza nas células de dados", async () => {
    const ws = await gerarWorkbook();
    const fill = ws.getRow(8).getCell(1).fill as any;
    expect(fill?.fgColor?.argb).toBe(FILL_LINHAS_DADOS);
  });
});

// ---- logos ----

const colPx = (w: number) => Math.round(w * 7 + 5);
const linhaPx = (h: number) => (h * 4) / 3;

describe("tamanhoPng", () => {
  it("lê as dimensões reais das logos embutidas", () => {
    expect(tamanhoPng(LOGO_SG)).toEqual({ width: 385, height: 122 });
    expect(tamanhoPng(LOGO_LOG)).toEqual({ width: 967, height: 740 });
  });
});

describe("centralizarImagem", () => {
  const alturas = [26, 68, 26, 26, 26]; // bloco do cabeçalho (linhas 2..6)

  it("usa exatamente o tamanho pedido em cm", () => {
    const a = centralizarImagem(LARGURAS.slice(1, 4), alturas, TAMANHO_LOGO_CLIENTE, 1, 1);
    expect(a.ext.width).toBeCloseTo(cmParaPx(TAMANHO_LOGO_CLIENTE.largura), 3);
    expect(a.ext.height).toBeCloseTo(cmParaPx(TAMANHO_LOGO_CLIENTE.altura), 3);
  });

  it("cabe dentro do bloco mesclado", () => {
    const larguras = LARGURAS.slice(0, 1);
    const a = centralizarImagem(larguras, alturas, TAMANHO_LOGO_SG, 0, 1);
    const totalW = larguras.reduce((s, w) => s + colPx(w), 0);
    const totalH = alturas.reduce((s, h) => s + linhaPx(h), 0);
    expect(a.ext.width).toBeLessThanOrEqual(totalW);
    expect(a.ext.height).toBeLessThanOrEqual(totalH);
  });

  it("encolhe mantendo a proporção pedida quando o bloco é menor", () => {
    const a = centralizarImagem([4], [10], TAMANHO_LOGO_SG, 0, 1);
    expect(a.ext.width / a.ext.height).toBeCloseTo(
      TAMANHO_LOGO_SG.largura / TAMANHO_LOGO_SG.altura,
      3
    );
  });

  it("sobra a mesma margem dos dois lados (centralizado)", () => {
    const larguras = LARGURAS.slice(1, 4);
    const a = centralizarImagem(larguras, alturas, TAMANHO_LOGO_CLIENTE, 1, 1);
    const colsPx = larguras.map(colPx);
    const totalW = colsPx.reduce((s, w) => s + w, 0);
    // reconstrói o deslocamento a partir da âncora fracionária
    let desloc = 0;
    const inteiro = Math.floor(a.tl.col) - 1;
    for (let i = 0; i < inteiro; i++) desloc += colsPx[i];
    desloc += (a.tl.col - Math.floor(a.tl.col)) * colsPx[inteiro];
    expect(desloc).toBeCloseTo((totalW - a.ext.width) / 2, 1);
  });

  it("ancora dentro do bloco, nunca antes dele", () => {
    const a = centralizarImagem(LARGURAS.slice(0, 4), alturas, TAMANHO_LOGO_SG, 0, 1);
    expect(a.tl.col).toBeGreaterThanOrEqual(0);
    expect(a.tl.col).toBeLessThan(4);
    expect(a.tl.row).toBeGreaterThanOrEqual(1);
    expect(a.tl.row).toBeLessThan(6);
  });
});
