import { describe, it, expect } from "vitest";
import { FILL_LINHAS_DADOS, alturaLinhaEndereco } from "./xlsx";

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
