# AUTHORING — Gerador de Lista Mestra (SG Projetos)

<!--
  Layer 1, referenciado SOB DEMANDA — não é auto-carregado em toda sessão.
  Carregue quando for construir uma nova feature/módulo. Não mantenha em contexto fora disso.
-->

Load this on demand when building a new **feature/módulo**; not auto-loaded.

## Purpose & boundary

| File | Concern |
|------|---------|
| `CLAUDE.md` | Como **operar** o repo (stack, comandos, convenções, do-not-touch). |
| `MEMORY.md` | O que **decidimos / aprendemos** — ADR-lite + failure log. |
| `AUTHORING.md` (este) | Como **construir uma nova feature** seguindo a estrutura e o loop Spec→Plan→Work→Review→Release. |

---

## Where new code goes

```
lista-mestra/
├── src/
│   ├── lib/                    # LÓGICA PURA (sem React) — testável, co-located *.test.ts
│   │   ├── parse.ts            #   parser de nomes de arquivo → referência/revisão
│   │   ├── xlsx.ts             #   export/import .xlsx (ExcelJS)
│   │   ├── types.ts            #   modelos de dados + utilitários de data
│   │   ├── pdf.ts / logos.ts   #   leitura de PDF / logos institucionais (base64)
│   │   └── *.test.ts           #   testes Vitest, ao lado do módulo
│   ├── components/             # UI React
│   │   ├── ui/                 #   primitivos shadcn (button, input, card, table, ...)
│   │   └── *.tsx               #   Dropzone, Header, ProjectMetaForm, RowsTable
│   ├── App.tsx                 # orquestra o fluxo inteiro
│   └── main.tsx                # entry point
└── (config na raiz: vite/tailwind/tsconfig/package.json)
```

- Nova lógica de negócio (regra, parsing, cálculo, formatação) → `src/lib/` como função pura.
- Novo pedaço de UI → `src/components/`; primitivos genéricos reusáveis → `src/components/ui/`.
- Arquivo de teste: co-located `*.test.ts` ao lado do módulo em `src/lib/`.

---

## Conventions a new feature MUST follow

### Naming & structure
- Lógica testável vive em `src/lib/` como função pura, **sem dependência de React**.
  A UI só orquestra e renderiza; a regra fica na lib.
- Import via alias `@/` para `src/` (ex.: `import { parseFileName } from "@/lib/parse"`).
- Comentários, labels e textos de UI em **português**.

### Layering & boundaries
- `src/lib/` não importa de `src/components/`. A dependência é sempre UI → lib, nunca o contrário.
- Nada de I/O de rede: o app é offline-first no navegador. Entrada/saída só via arquivos do usuário.

### Error handling
- Datas: sempre pelos helpers de `types.ts` (`toISODate`, `isAfterDay`), nunca `Date` cru.
- Entradas fora do padrão (nome de arquivo, `.xlsx` malformado) devem degradar graciosamente
  — nunca derrubar a UI. Ex.: `parseFileName` retorna rev `""` em vez de lançar.

### Test expectations
- Toda função pública nova em `src/lib/` ganha pelo menos um teste de caminho feliz e um de falha.
- O typecheck estrito (`tsc`) é parte do "verde": import não usado / any implícito quebram o build.

---

## Build-a-new-feature checklist

Rode `/feature` para o loop completo. Manualmente:

- [ ] **Spec (01)** — defina o resultado e os critérios de aceite antes de tocar código.
- [ ] **Plan (02)** — fatie o trabalho; cada fatia com Definition of Done. Uma fatia não cruza mais de um limite de módulo.
- [ ] **Work (03)** — implemente só a fatia aprovada. TDD no que toca parsing/geração de `.xlsx`: teste que falha primeiro.
- [ ] **Self-verify (03-post)** — `npm test` + `npm run build` limpos antes da próxima fatia.
- [ ] **Review (04)** — passe ao subagente `reviewer` (ou `/review`). Independência vence auto-revisão.
- [ ] **Release (05)** — `/walkthrough` para empacotar evidência; abra o PR. Sem `TODO` sem issue.
- [ ] **Atualize este arquivo** — se a feature virar exemplar, adicione na seção Exemplars.

---

## Definition of done

A Definition of done do `CLAUDE.md` se aplica. Além disso, uma nova feature está pronta quando:
- [ ] A lista de Exemplars abaixo está atualizada, se a feature for representativa.
- [ ] Se introduziu uma nova convenção, a seção Conventions do `CLAUDE.md` foi atualizada.

---

## Exemplars

- `src/lib/parse.ts` + `src/lib/parse.test.ts` — modelo canônico de **lógica pura testável**:
  função pequena, entrada/saída explícitas, testes cobrindo caminho feliz, variações e falha.
- `src/lib/types.ts` — modelos de dados + fábricas (`emptyMeta`, `emptyRow`) e helpers de data;
  bom modelo de onde colocar tipos compartilhados e utilitários sem React.
