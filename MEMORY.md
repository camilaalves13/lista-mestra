# MEMORY — Gerador de Lista Mestra (SG Projetos)

<!--
  Layer 1 (Memory), companion to CLAUDE.md.
  - CLAUDE.md = manual estável (como as coisas SÃO).
  - MEMORY.md = log append-only do que APRENDEMOS na marra (o que nos MORDEU).
  Entradas curtas e datadas. Nunca apague — risque (~~...~~) se for superado.
  Referencie entradas a partir do CLAUDE.md com [[âncoras]].
-->

## Decisions (ADR-lite)
- `2026-07-01` — Adotado **Vitest** para testes unitários da lógica pura em `src/lib/`.
  Motivo: já usa Vite, zero config extra, roda rápido. Testes co-locados como `*.test.ts`.
- `2026-07-01` — Processamento mantido **100% no navegador** (sem backend). Motivo:
  os dados dos projetos são sensíveis do cliente; nada deve sair da máquina do usuário.

## Failure log (what bit us — do not repeat)
<!-- A seção de maior valor. Cada entrada: o que quebrou → causa raiz → a regra agora. -->
- `YYYY-MM-DD` — **What broke:** (nada registrado ainda). **Root cause:** —. **Rule now:** —.

## Sharp edges / gotchas
- Datas: use `toISODate`/`isAfterDay` de `src/lib/types.ts`. Manipular `Date` direto
  causou/pode causar erro de fuso (o dia "vira" perto da meia-noite).
- `parseFileName` normaliza a revisão (`-R007` → `"7"`) e trata revisão ausente como `""`
  (comparada como 0). Nomes fora do padrão `PREFIXO-...-R##` viram uma linha só com rev vazia.
- Não há ESLint: o único gate estático é o `tsc` estrito. Um import não usado quebra o build.

## Performance / cost notes
- TODO (sem números medidos ainda).
