# PROJECT MEMORY — Gerador de Lista Mestra (SG Projetos)

> Camada de memória e decisões do projeto. Cole/anexe este arquivo em uma nova sessão do
> Claude para retomar o contexto **sem precisar exportar o projeto inteiro**. Mantido
> versionado no repositório `camilaalves13/lista-mestra`.
>
> Última atualização: 2026-06-22

---

## 1. Objetivo do projeto

Automatizar a criação/atualização da **Lista Mestra de Projetos** (planilha `.xlsx`) de um
escritório de arquitetura (SG Projetos & Consultoria). A Lista Mestra cataloga todos os
arquivos entregues em um projeto, com referência, revisão, data, formato (A0/A1...), conteúdo
e descrição das revisões realizadas. A cada nova emissão do projeto, gera-se uma **nova aba**
(E00, E01, E02, ... Exx) preservando o histórico.

Projeto-piloto: **SG1303 — LOG TERESINA** (cliente LOG Commercial Properties), etapa
**Projeto Legal (PL)**, prefeitura.

Há também uma segunda planilha no escopo futuro (ainda **não** implementada): o
**Controle de Saída / Histórico (SG1303-ARQ-CONTROLE DE PROJETO.xlsx)** — ver seção 9.

---

## 2. Entregável atual

Aplicação web **React + TypeScript + Vite + Tailwind + shadcn/ui**, 100% client-side
(nenhum dado sai do navegador), publicável na Vercel.

- Repositório GitHub: **https://github.com/camilaalves13/lista-mestra** (público)
- Deploy: **Vercel** (detecta Vite automaticamente — build `npm run build`, output `dist`),
  redeploy automático a cada push na branch `main`.
- Autoria dos commits: **Camila Alves** (`camilaalves13@users.noreply.github.com`).
  Decisão explícita do usuário: commitar no nome da Camila, **não** como "ferocha".

### Fluxo do app (4 passos)
1. **Dados do projeto**: obra, endereço, projeto, etapa, data da emissão, código da emissão
   (ex.: `E09`), prefixo dos arquivos, nome do arquivo de saída.
2. **Inserir arquivos** (drag-and-drop):
   - *Pasta / PDFs do projeto* → cria 1 linha por arquivo (referência + revisão a partir do nome).
   - *Lista Mestra anterior (.xlsx)* (opcional) → carrega itens e calcula a próxima emissão.
   - Toggles: revisão automática por data, usar data de modificação, ler FORMATO do PDF,
     incluir logo do cliente (projeto LOG) + trocar logo do cliente.
3. **Conferir e editar**: tabela editável; marcadores NOVO / REVISADO / = (sem alteração).
4. **Gerar planilha**: exporta o `.xlsx`.

---

## 3. Regras de negócio (DECISÕES IMPORTANTES)

1. **Nomenclatura dos arquivos**: padrão `PREFIXO-NNN-PL-CONTEÚDO-R##.pdf`.
   - **Referência** = nome do arquivo sem o sufixo `-R##` (ex.: `LOGTRS-ARQ-001-PL-IMP`).
   - **Revisão (REV)** = número após o `R` (ex.: `R08` → 8).
   - Mantém-se sempre a **maior revisão** por referência (1 linha por arquivo); em empate de
     revisão, a modificação mais recente.

2. **Legenda de conteúdo** (códigos no nome → descrição). Base fornecida pelo usuário:
   - `G##`=Galpão ## · `PORT`=Portaria · `REST`=Restaurante · `VEST`=Vestiário
   - `ARS`=Abrigo de Resíduos · `MED`=Cabine de Medição · `GAS`=Central de Gás
   - `BOM`=Casa de Bombas · `IMP`=Implantação · `CAL`=Memória de Cálculo
   - `SIT`=Situação · `ACES`=Rota Acessível
   - Complementos inferidos: `COR`=Cortes, `COB`=Cobertura, `FAC`=Fachadas, `PLA/PLAN`=Plantas,
     `DET#`=Detalhe #, `GER`=Geral, `ELEV`=Elevações, `SUB`=Subestação, `LAZ`=Lazer,
     `ROT/ACE`=Rota Acessível, `PAV#`=#º Pavimento.
   - O usuário decidiu que o **conteúdo não precisa ser auto-preenchido**: o usuário digita os
     dados; a legenda serve só de apoio/rascunho.

3. **Revisão automática por data** (decisão central): ao importar a Lista Mestra anterior e
   arrastar a pasta, comparar a **data de modificação do arquivo** (`File.lastModified`) com a
   **data da emissão anterior** registrada na planilha. Se o arquivo foi modificado **depois**,
   marca como **REVISADO**, incrementa a revisão (**+1**) e usa a data de modificação como data
   da revisão. Toggle permite usar a data de emissão em vez da data do arquivo.

4. **Regra "EMISSÃO INICIAL"**: toda linha com **revisão 00** recebe automaticamente
   `EMISSÃO INICIAL` na coluna "REVISÕES REALIZADAS" (quando o campo está vazio). Aplicada
   na geração (`applyRules`) e ao criar linhas novas.

5. **FORMATO (A0, A1, A0+, A1++, ...)**: fica numa tabela no carimbo do PDF, no canto, com o
   título "FORMATO", em geral na **última página**. Decisão: extrair via pdf.js procurando o
   **rótulo "FORMATO"** e pegando o valor `A[0-4]` mais **próximo espacialmente** (usando as
   coordenadas dos itens de texto). Fallback: token A# mais frequente. Sempre editável à mão.
   - Bug corrigido: a versão antiga pegava o primeiro "A0" qualquer → todos saíam A0.

6. **Logos**:
   - **SG é a logo base, sempre presente.**
   - Projeto **LOG** → inclui a logo do cliente (LOG) ao lado: SG na coluna A (merge `A2:A6`),
     cliente em `B2:D6`.
   - Sem logo de cliente → **SG mesclada** nas duas colunas (`A2:D6`).
   - O usuário pode trocar a logo do cliente por upload (para outros clientes).

7. **Cabeçalho com bordas pontilhadas**: o documento original usa borda estilo **`hair`**
   (pontilhada) no bloco de metadados (OBRA/ENDEREÇO/PROJETO/ETAPA/DATA) e no separador
   logos↔metadados. Replicado fielmente (moldura externa `medium`, grade interna `hair`).

8. **Datas**: gravar como data **UTC pura** (sem horário) com formato `dd/mm/yyyy`, para
   evitar deslocamento de fuso (antes aparecia "03:00" por causa do timezone -03).

9. **Geração SEMPRE em arquivo novo** (decisão importante de robustez): NÃO reabrir/reescrever
   o `.xlsx` anterior (o round-trip do ExcelJS corrompia imagens/abas e o arquivo original é
   sensível/sincronizado). Em vez disso, ao importar a lista anterior, **recriar todas as abas
   de emissões antigas** (lendo os dados) + a nova emissão, em um workbook novo e limpo. Isso
   faz os logos renderizarem de forma confiável e nunca toca no arquivo original.

---

## 4. Estrutura da planilha gerada (layout de cada aba Exx)

- **Linha 1** (`A1:F1`, merge): título "LISTA MESTRA DE PROJETOS", Calibri 14 bold, centralizado,
  moldura `medium`.
- **Linhas 2–6**: bloco de cabeçalho.
  - `A2:D6` (merge): logos (SG; + LOG se projeto LOG).
  - `E2:F6`: metadados — coluna E = rótulos bold (OBRA, ENDEREÇO, PROJETO, ETAPA, DATA),
    coluna F = valores. Bordas `hair` (pontilhadas), exceto topo/base `medium` e direita `medium`.
- **Linha 7**: cabeçalho da tabela — ARQUIVO | R E V | DATA | FORMATO | CONTEÚDO |
  REVISÕES REALIZADAS. Fundo cinza `FFD9D9D9`, Calibri 10 bold, moldura `medium`.
- **Linha 8+**: dados. Coluna A = Calibri 11; demais = Arial 9; wrap; bordas `thin` com moldura
  externa `medium`. Altura por linha calculada pelo conteúdo (mín. 32, máx. 110).
- Larguras de coluna: A=39, B=8, C=14.5, D=12.5, E=50, F=40.
- `showGridLines: false`; pageSetup retrato, fit-to-width.

Nome do arquivo de saída: `${nomeArquivo}_${emissao}.xlsx` (ex.: `LOGTRS-ARQ-001-PL-LM_E09.xlsx`).

---

## 5. Arquitetura de código (onde mexer)

```
src/
  App.tsx                  Orquestração: estado, handlers (onFolder, onPrev, onExport), UI dos 4 passos
  components/
    Dropzone.tsx           Drag-and-drop nativo (arquivos e PASTAS via webkitGetAsEntry)
    Header.tsx             Cabeçalho da página (usa LOGO_SG)
    ProjectMetaForm.tsx    Formulário de metadados (passo 1)
    RowsTable.tsx          Tabela editável (passo 3) + add/duplicar/remover linha
    ui/                    Componentes shadcn (button, input, card, table, badge, textarea, label)
  lib/
    types.ts               ProjectMeta, MasterRow, emptyMeta/emptyRow, toISODate, isAfterDay
    parse.ts               parseFileName, dedupeByFiles (referência + rev + lastModified + File)
    pdf.ts                 extractFormato (pdf.js via CDN, dynamic import; sem dep de build)
    xlsx.ts                buildSheet, exportMasterList, importPrevious, readAllEmissions, applyRules
    logos.ts               LOGO_SG e LOGO_LOG em base64 (PNG)
    utils.ts               cn() (tailwind-merge)
```

- **pdf.js é carregado via CDN** (`cdn.jsdelivr.net/npm/pdfjs-dist@4.5.136`) com `import()` e
  `/* @vite-ignore */` — **não** é dependência do `package.json` (evita instalação pesada e
  mantém o build limpo). Requer internet apenas para a extração de FORMATO.
- **ExcelJS** faz a leitura/escrita do `.xlsx` (suporta estilos, merges, imagens).

---

## 6. Logos (detalhe que deu muito trabalho)

- `LOGO_SG`: deve ser a logo **recortada** "SG PROJETOS E CONSULTORIA" com **fundo branco**.
  - Fonte correta: arquivo **`Imagem1.png`** fornecido pelo usuário (estava na pasta de teste).
  - Processamento: abrir como RGBA → **compor sobre branco** (`alpha_composite`) → converter RGB →
    recortar bordas brancas → base64 → `LOGO_SG`. Dimensão resultante ~385×122 (aspecto ~3.15:1).
  - **Armadilhas já resolvidas**:
    1. A logo SG embutida originalmente era o **papel timbrado A4 inteiro** (logo no topo +
       rodapé) → aparecia minúscula/deslocada. Solução: usar só a logo recortada.
    2. `convert("RGB")` direto numa PNG com transparência preenche o fundo de **preto** → a logo
       saía como caixa preta com só "E CONSULTORIA" vermelho visível. Solução: **compor sobre
       branco antes**.
- `LOGO_LOG`: logo "LOG commercial properties" (arquivo `image2.png` extraído do `.xlsx` original).
- Tamanhos no `xlsx.ts > placeLogos` (ajustáveis): projeto LOG → SG 205×65 em A, LOG 150×96 em B:D;
  só SG → 250×79 em A:D.

---

## 7. Ambiente / armadilhas técnicas (para a próxima sessão saber)

- A pasta de trabalho do usuário fica em **OneDrive/ACC Docs sincronizado** → gravações podem
  ter **lag de sincronização** e **truncar arquivos** ou corromper com **byte nulo** quando
  escritos pelas ferramentas de arquivo. **Mitigação**: escrever arquivos grandes via `bash`
  (heredoc) e **sempre validar** com `tsc --noEmit` + checar balanço de chaves após editar
  `xlsx.ts`/`App.tsx`. Vários truncamentos já ocorreram em `xlsx.ts`, `App.tsx`, `package.json`,
  `parse.ts`, `pdf.ts`, `types.ts`, `RowsTable.tsx`.
- Build de produção: se o `dist/` antigo estiver travado pela sincronização, buildar para um
  diretório local: `vite build --outDir /tmp/dist --emptyOutDir`.
- `npm install` do pdfjs travava por rede → por isso a decisão de **CDN dynamic import**.
- **Validação visual**: para conferir o `.xlsx` de verdade, renderizar com **LibreOffice headless**
  (`soffice --headless --convert-to pdf`) → `pdftoppm` → ver a imagem. Cuidado: **openpyxl
  descarta imagens** ao reabrir/salvar (aviso "DrawingML support incomplete") — não use openpyxl
  para isolar abas antes de renderizar (deu falso "cabeçalho vazio").
- Para reproduzir o output exato do app no Node (sem navegador): transpilar `xlsx.ts` com
  `esbuild --bundle --external:exceljs` e chamar `exportMasterList` com stubs de
  `Blob`/`URL`/`document` (capturar o buffer no construtor de `Blob`).

---

## 8. Pastas e arquivos de referência

- Pasta da **empresa** (sensível, sincronizada — **NÃO modificar**): `.../3 - PROJETO LEGAL (PL)/1 - PREFEITURA`.
- Pasta de **teste** (onde colocamos entregas/protótipos): `.../3 - PROJETO LEGAL (PL)/TESTE LISTA MESTRA--1 - PREFEITURA`.
- Planilhas de referência: `LOGTRS-ARQ-001-PL-LM_E08.xlsx` (Lista Mestra real, 9 abas E00–E08),
  `SG1303-ARQ-CONTROLE DE PROJETO.xlsx` (Controle de Saída).
- Estilo de bordas do original: bloco de cabeçalho usa `hair`; cabeçalho da tabela usa `medium`.

---

## 9. Backlog / próximos passos

- [ ] **Controle de Saída / Histórico (SG1303)**: automatizar a 2ª planilha
  (abas "HISTÓRICO" e "DADOS DE SAÍDA"), alimentada a partir das emissões.
- [ ] (Opcional) Estender o pontilhado a outras áreas, se solicitado.
- [ ] (Opcional) CI no GitHub Actions rodando `npm run build` a cada push.
- [ ] (Opcional) Persistir a legenda de nomenclatura editável.

---

## 10. Histórico de commits relevantes (main)

- `cc47b0f` — App React+TS+Vite inicial (revisão por data, FORMATO via PDF, logos, EMISSÃO INICIAL).
- `0bf6414` — Geração sempre em arquivo novo (logos renderizam; não reescreve o original).
- `b7fc6f4` — Logo SG corrigida (Imagem1.png recortada sobre branco, não o timbrado A4).
- `aecf131` — Ajuste de formato: logos maiores/centralizados, linhas e cabeçalho mais altos.
- `1d41ed6` — Cabeçalho com bordas pontilhadas (hair) no bloco de metadados.

---

## 11. Como retomar em outra sessão do Claude

1. Anexe/cole este `PROJECT_MEMORY.md`.
2. Diga em que ponto está (ex.: "continuar o Controle de Saída" ou "ajustar o layout X").
3. Se for mexer no código, peça para clonar `https://github.com/camilaalves13/lista-mestra`
   ou anexe os arquivos relevantes de `src/lib/` (`xlsx.ts`, `parse.ts`, `pdf.ts`, `types.ts`).
4. Lembre o Claude das armadilhas da seção 7 (truncamento por sync; validar com tsc; render com
   LibreOffice; openpyxl descarta imagens).
