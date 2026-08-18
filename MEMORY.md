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
- `2026-08-18` — **Layout do `.xlsx` (🟡 contrato visível)**: as linhas de dados passam a ter
  preenchimento cinza `#BFBFBF` ("Branco, plano de fundo 1, mais escuro 25%") nas 6 colunas.
  Antes: sem preenchimento. Constante exportada: `FILL_LINHAS_DADOS` em `src/lib/xlsx.ts`.
- `2026-08-18` — **Layout do `.xlsx`**: a linha do ENDEREÇO no cabeçalho deixa de ter altura
  fixa 26 e passa a crescer conforme o texto (`alturaLinhaEndereco`, mín. 26 / máx. 96).
  Motivo: com o ENDEREÇO real do LOGSLS (137 caracteres numa coluna de largura 40) o texto
  saía cortado na impressão. Endereços curtos continuam com 26 — layout inalterado.

## Failure log (what bit us — do not repeat)
<!-- A seção de maior valor. Cada entrada: o que quebrou → causa raiz → a regra agora. -->
- `2026-08-18` — **What broke:** um commit local foi feito sobre uma cópia desatualizada do
  repo (clone parado no `6baf583`), o push foi recusado como `non-fast-forward` e um
  `--force` teria apagado do GitHub as funções de DATA/TÍTULO do carimbo.
  **Root cause:** a pasta local no Windows não recebia `git fetch` desde junho; as sessões
  anteriores publicaram a partir de um clone separado. **Rule now:** `git fetch origin` +
  conferir `git status -sb` ANTES de commitar nessa pasta; nunca `push --force` nela.

## Sharp edges / gotchas
- Datas: use `toISODate`/`isAfterDay` de `src/lib/types.ts`. Manipular `Date` direto
  causou/pode causar erro de fuso (o dia "vira" perto da meia-noite).
- `parseFileName` normaliza a revisão (`-R007` → `"7"`) e trata revisão ausente como `""`
  (comparada como 0). Nomes fora do padrão `PREFIXO-...-R##` viram uma linha só com rev vazia.
- Não há ESLint: o único gate estático é o `tsc` estrito. Um import não usado quebra o build.

## Performance / cost notes
- TODO (sem números medidos ainda).
