import { describe, it, expect } from "vitest";
import { parseFileName, dedupeByFiles } from "./parse";

// Cria um File "falso" o suficiente para os testes (nome, lastModified).
function fakeFile(name: string, lastModified = 0): File {
  return { name, lastModified } as unknown as File;
}

describe("parseFileName", () => {
  it("extrai referência e revisão de um nome no padrão", () => {
    expect(parseFileName("LOGTRS-ARQ-001-PL-PLANTA-R03.pdf")).toEqual({
      referencia: "LOGTRS-ARQ-001-PL-PLANTA",
      rev: "3",
    });
  });

  it("normaliza revisões com zeros à esquerda", () => {
    expect(parseFileName("REF-R007.pdf").rev).toBe("7");
  });

  it("é case-insensitive na extensão e no marcador de revisão", () => {
    expect(parseFileName("REF-r05.PDF")).toEqual({ referencia: "REF", rev: "5" });
  });

  it("remove extensões dwg e dxf", () => {
    expect(parseFileName("CORTE-R01.dwg").referencia).toBe("CORTE");
    expect(parseFileName("CORTE-R01.dxf").referencia).toBe("CORTE");
  });

  it("retorna revisão vazia quando não há marcador -R##", () => {
    expect(parseFileName("SEM-REVISAO.pdf")).toEqual({
      referencia: "SEM-REVISAO",
      rev: "",
    });
  });
});

describe("dedupeByFiles", () => {
  it("mantém apenas a maior revisão por referência", () => {
    const out = dedupeByFiles([
      fakeFile("REF-R01.pdf"),
      fakeFile("REF-R03.pdf"),
      fakeFile("REF-R02.pdf"),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].rev).toBe("3");
  });

  it("em empate de revisão, mantém a modificação mais recente", () => {
    const out = dedupeByFiles([
      fakeFile("REF-R02.pdf", 1000),
      fakeFile("REF-R02.pdf", 5000),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].lastModified).toBe(5000);
  });

  it("agrupa referências distintas e ordena alfabeticamente", () => {
    const out = dedupeByFiles([
      fakeFile("BETA-R01.pdf"),
      fakeFile("ALFA-R01.pdf"),
    ]);
    expect(out.map((r) => r.referencia)).toEqual(["ALFA", "BETA"]);
  });

  it("trata revisão vazia como 0 na comparação", () => {
    const out = dedupeByFiles([
      fakeFile("REF.pdf"),
      fakeFile("REF-R01.pdf"),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].rev).toBe("1");
  });
});
