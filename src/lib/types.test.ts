import { describe, it, expect } from "vitest";
import { toISODate, isAfterDay, emptyMeta, emptyRow } from "./types";

describe("toISODate", () => {
  it("formata um Date como yyyy-mm-dd no fuso local", () => {
    // Meio-dia evita que o deslocamento de fuso mude o dia.
    const d = new Date(2026, 0, 15, 12, 0, 0);
    expect(toISODate(d)).toBe("2026-01-15");
  });

  it("aceita timestamp numérico", () => {
    const ts = new Date(2026, 5, 30, 12, 0, 0).getTime();
    expect(toISODate(ts)).toBe("2026-06-30");
  });
});

describe("isAfterDay", () => {
  it("retorna true quando a data a é posterior a b", () => {
    expect(isAfterDay("2026-02-01", "2026-01-31")).toBe(true);
  });

  it("retorna false para datas iguais", () => {
    expect(isAfterDay("2026-01-01", "2026-01-01")).toBe(false);
  });

  it("retorna false quando alguma data está vazia", () => {
    expect(isAfterDay("", "2026-01-01")).toBe(false);
    expect(isAfterDay("2026-01-01", "")).toBe(false);
  });
});

describe("emptyMeta / emptyRow", () => {
  it("emptyMeta traz os padrões esperados", () => {
    const m = emptyMeta();
    expect(m.projeto).toBe("ARQUITETÔNICO");
    expect(m.emissao).toBe("E00");
    expect(m.prefixo).toBe("LOGTRS-ARQ");
    expect(m.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("emptyRow usa a data informada e estado manual", () => {
    const r = emptyRow("2026-03-10");
    expect(r.data).toBe("2026-03-10");
    expect(r.estado).toBe("manual");
    expect(r.id).toBeTruthy();
  });
});
