# Gerador de Lista Mestra (SG Projetos) — Operating Manual for Claude

<!--
  Auto-loaded into EVERY Claude session and inherited by every subagent.
  Keep it tight. Update the moment a convention changes — treat drift as a bug.
  Use `#` in a live session to append a memory here without leaving the chat.
-->

## What this is
Aplicação web que gera e atualiza a **Lista Mestra** de projetos de arquitetura
(`LOGTRS-ARQ-001-PL-LM`) a partir dos arquivos entregues (PDF/DWG). O usuário
preenche os dados; o app organiza, valida e exporta um `.xlsx` formatado.
**Processamento 100% no navegador — nada é enviado a servidores.**

## Stack
- Language: TypeScript
- Framework: React 18 + Vite 5
- UI: Tailwind CSS + shadcn/ui (componentes em `src/components/ui`)
- Libs-chave: ExcelJS (gera/lê `.xlsx`), lucide-react (ícones)
- Package manager: **npm** (`package-lock.json`)
- Testes: Vitest

## How to run things
```bash
# Install
npm install

# Dev server
npm run dev            # http://localhost:5173

# Tests (rápidos — os agentes rodam isto o tempo todo)
npm test               # vitest run
npm run test:watch     # vitest (modo watch)

# Typecheck + build (o self-check antes de declarar "pronto")
npm run build          # tsc -b && vite build  (falha se houver erro de tipo)
npx tsc -b             # só o typecheck, sem gerar o build
```
> Não há ESLint configurado neste repo. O "lint" é o typecheck estrito do TS
> (`strict`, `noUnusedLocals`, `noUnusedParameters` em `tsconfig.json`).

## Architecture (the 5-line version)
- Entry points: `src/main.tsx` → `src/App.tsx` (orquestra todo o fluxo)
- Lógica pura: `src/lib/` — `parse.ts` (nomes de arquivo), `xlsx.ts` (export/import
  ExcelJS), `types.ts` (modelos + utilitários de data), `pdf.ts`, `logos.ts`
- UI: `src/components/` — `Dropzone`, `Header`, `ProjectMetaForm`, `RowsTable` + `ui/`
- Data stores: **nenhum** — estado em memória no navegador; entrada/saída via arquivos
- External services: **nenhum** em runtime; deploy hospedado na Vercel

## Conventions (the non-obvious ones only)
- Toda a lógica testável mora em `src/lib/` como funções puras (sem React). Testes
  ficam co-locados como `*.test.ts` ao lado do módulo (ex.: `parse.test.ts`).
- Datas trafegam como string `yyyy-mm-dd`; use `toISODate`/`isAfterDay` de `types.ts`
  em vez de manipular `Date` direto (evita bugs de fuso).
- Alias de import `@/` → `src/` (configurado em `tsconfig.json` e `vite.config.ts`).
- Comentários e UI em **português** — mantenha o padrão do repo.

## Decision authority & defaults
- **Default posture:** proceed autonomously; escale APENAS 🔴 one-way doors.
- **Documented defaults (apply without asking):**
  - Novos componentes de UI, layout interno de módulos, estratégia de teste = 🟢 decida.
  - Nova dependência de runtime = 🟡 — prefira stdlib/libs existentes; se adicionar, registre em MEMORY.md.
  - Mudar o formato/layout do `.xlsx` exportado = 🟡 — é o contrato visível do produto; documente o antes/depois.
  - Deploy em produção na Vercel (`vercel --prod`, promote) = 🔴 — nunca pelo agente; sai pelo push normal para `main`.
- **Escalation channel:** comente no PR / avise o dono do repo.

## Definition of done
A change is done when:
- [ ] `npm test` passa e o novo comportamento tem teste
- [ ] `npm run build` limpo (typecheck + build sem erros)
- [ ] Nenhum `TODO` novo sem issue de rastreio
- [ ] Walkthrough gerado para mudanças não-triviais (`/walkthrough`)

## Do NOT touch / land-mines
- `src/lib/logos.ts` contém logos institucionais em base64 — não reescreva/otimize sem pedir.
- Não faça deploy de produção pelo agente (Vercel `--prod`/`promote`) — bloqueado pelo hook.
- Push para `main` dispara deploy automático na Vercel — trate push como ação de release.

## Useful entry points for exploration
- "Como um nome de arquivo vira linha?" → `src/lib/parse.ts` (`parseFileName`, `dedupeByFiles`)
- "Onde o `.xlsx` é gerado/lido?" → `src/lib/xlsx.ts`
- "Onde o estado do formulário é orquestrado?" → `src/App.tsx`
- "Onde ficam os testes?" → `src/lib/*.test.ts` (Vitest)
