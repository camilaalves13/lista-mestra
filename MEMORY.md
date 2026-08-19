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
- `2026-08-19` — **Layout do `.xlsx`**: valores do cabeçalho com `horizontal: "left"` explícito.
  A DATA é um valor de data e o Excel a alinhava à direita, destoando de OBRA/ENDEREÇO/PROJETO/ETAPA.
- `2026-08-19` — **Logos centralizados, com tamanho definido pela Camila**: SG 5,63 × 1,5 cm e
  cliente 3,4 × 2,56 cm (`TAMANHO_LOGO_SG` / `TAMANHO_LOGO_CLIENTE`, em cm — o documento de
  referência da SG usa essas medidas). `centralizarImagem()` converte para px (96 dpi) e calcula
  a âncora a partir das larguras das colunas e das alturas REAIS das linhas do cabeçalho, então o
  centro acompanha a linha variável do ENDEREÇO. Antes as dimensões e a âncora eram fixas no
  código e a logo do cliente saía esticada. Obs.: 5,63 × 1,5 é levemente mais largo que a
  proporção do PNG da SG (385×122); mantido assim por ser a medida do documento oficial.

## Failure log (what bit us — do not repeat)
<!-- A seção de maior valor. Cada entrada: o que quebrou → causa raiz → a regra agora. -->
- `2026-08-18` — **What broke:** um commit local foi feito sobre uma cópia desatualizada do
  repo (clone parado no `6baf583`), o push foi recusado como `non-fast-forward` e um
  `--force` teria apagado do GitHub as funções de DATA/TÍTULO do carimbo.
  **Root cause:** a pasta local no Windows não recebia `git fetch` desde junho; as sessões
  anteriores publicaram a partir de um clone separado. **Rule now:** `git fetch origin` +
  conferir `git status -sb` ANTES de commitar nessa pasta; nunca `push --force` nela.
- `2026-08-18` — **What broke:** ao arrastar a pasta com 29 pranchas, a última
  (`LOGSLS-ARQ-311-PE-SUB2_GER`) veio sem FORMATO e sem CONTEÚDO, e com a data de
  modificação do arquivo (17/03) em vez da data do carimbo (12/03).
  **Root cause:** cada campo abria o próprio documento pdf.js (3 aberturas por prancha,
  87 no total) e nenhuma chamava `doc.destroy()`; o worker acumulava documentos e as
  últimas leituras falhavam. O `catch` devolvia `""` em silêncio e a linha caía para o
  `lastModified` do arquivo. O PDF em si está íntegro — lido isoladamente extrai normal.
  **Rule now:** `extractCarimbo()` abre o PDF UMA vez por prancha, libera com `destroy()`
  no `finally` e tenta de novo se vier tudo vazio; a UI passa a listar por nome as
  pranchas cujo carimbo não foi lido, em vez de só contar.

## Sharp edges / gotchas
- Datas: use `toISODate`/`isAfterDay` de `src/lib/types.ts`. Manipular `Date` direto
  causou/pode causar erro de fuso (o dia "vira" perto da meia-noite).
- `parseFileName` normaliza a revisão (`-R007` → `"7"`) e trata revisão ausente como `""`
  (comparada como 0). Nomes fora do padrão `PREFIXO-...-R##` viram uma linha só com rev vazia.
- Não há ESLint: o único gate estático é o `tsc` estrito. Um import não usado quebra o build.

## Performance / cost notes
- TODO (sem números medidos ainda).
