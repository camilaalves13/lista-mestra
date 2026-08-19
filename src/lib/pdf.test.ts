import { describe, it, expect, afterEach } from "vitest";
import { extractCarimbo, _setPdfjsLoaderForTests } from "./pdf";

// pdf.js falso: um "documento" de uma página com os itens de texto do carimbo.
function fakePdfjs(opts: { falharAte?: number; itens?: any[] } = {}) {
  const estado = { aberturas: 0, destruicoes: 0 };
  const itens =
    opts.itens ??
    [
      { str: "FORMATO", transform: [1, 0, 0, 1, 100, 100], width: 30 },
      { str: "A1", transform: [1, 0, 0, 1, 100, 90], width: 10 },
      { str: "DATA", transform: [1, 0, 0, 1, 200, 100], width: 20 },
      { str: "12/03/2026", transform: [1, 0, 0, 1, 200, 90], width: 40 },
      { str: "TÍTULO:", transform: [0, 1, -1, 0, 300, 100], width: 30 },
      { str: "SUBESTAÇÃO 2", transform: [0, 1, -1, 0, 310, 100], width: 30 },
    ];

  const lib = {
    GlobalWorkerOptions: { workerSrc: "" },
    getDocument() {
      estado.aberturas++;
      if (opts.falharAte && estado.aberturas <= opts.falharAte) {
        return { promise: Promise.reject(new Error("worker sem memória")) };
      }
      const doc = {
        numPages: 1,
        getPage: async () => ({ getTextContent: async () => ({ items: itens }) }),
        destroy: async () => {
          estado.destruicoes++;
        },
      };
      return { promise: Promise.resolve(doc) };
    },
  };
  return { lib, estado };
}

const arquivoFake = { arrayBuffer: async () => new ArrayBuffer(8) } as unknown as File;

afterEach(() => _setPdfjsLoaderForTests(null));

describe("extractCarimbo", () => {
  it("lê FORMATO, DATA e TÍTULO abrindo o PDF uma única vez", async () => {
    const { lib, estado } = fakePdfjs();
    _setPdfjsLoaderForTests(async () => lib);

    const c = await extractCarimbo(arquivoFake);

    expect(c.formato).toBe("A1");
    expect(c.data).toBe("2026-03-12");
    expect(c.titulo).toBe("SUBESTAÇÃO 2");
    expect(estado.aberturas).toBe(1);
  });

  it("libera o documento (destroy) depois de ler", async () => {
    const { lib, estado } = fakePdfjs();
    _setPdfjsLoaderForTests(async () => lib);

    await extractCarimbo(arquivoFake);

    expect(estado.destruicoes).toBe(1);
  });

  it("tenta de novo quando a primeira abertura falha", async () => {
    const { lib, estado } = fakePdfjs({ falharAte: 1 });
    _setPdfjsLoaderForTests(async () => lib);

    const c = await extractCarimbo(arquivoFake);

    expect(estado.aberturas).toBe(2);
    expect(c.formato).toBe("A1");
  });

  it("devolve campos vazios quando o PDF não abre de jeito nenhum", async () => {
    const { lib } = fakePdfjs({ falharAte: 99 });
    _setPdfjsLoaderForTests(async () => lib);

    expect(await extractCarimbo(arquivoFake)).toEqual({ formato: "", data: "", titulo: "" });
  });

  it("respeita os toggles de DATA e TÍTULO", async () => {
    const { lib } = fakePdfjs();
    _setPdfjsLoaderForTests(async () => lib);

    const c = await extractCarimbo(arquivoFake, { data: false, titulo: false });

    expect(c.formato).toBe("A1");
    expect(c.data).toBe("");
    expect(c.titulo).toBe("");
  });
});
