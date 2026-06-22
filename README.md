# Gerador de Lista Mestra — SG Projetos

Aplicação web (React + TypeScript + Vite + Tailwind + shadcn/ui) para gerar e atualizar a **Lista Mestra** de projetos (`LOGTRS-ARQ-001-PL-LM`) a partir dos arquivos entregues. Os dados são preenchidos pelo usuário; o app organiza, valida e exporta o `.xlsx` formatado. Processamento 100% no navegador — nada é enviado para servidores.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (componentes em `src/components/ui`)
- **ExcelJS** para gerar/ler `.xlsx`
- **lucide-react** para ícones

## Rodar localmente

```bash
npm install
npm run dev      # http://localhost:5173
```

Build de produção:

```bash
npm run build    # gera dist/
npm run preview  # serve o build localmente
```

## Como usar

1. **Dados do projeto** — obra, endereço, data, código da emissão (ex.: `E09`).
2. **Inserir arquivos** (drag-and-drop):
   - *Pasta / PDFs do projeto*: arraste a pasta inteira ou os PDFs. O app cria uma linha por arquivo (referência + revisão a partir do nome).
   - *Lista Mestra anterior* (opcional): arraste o `.xlsx` atual para carregar os itens, calcular a próxima emissão e marcar o que mudou.
3. **Conferir e editar** — preencha/edite Conteúdo, Formato e Revisões realizadas. Adicione, duplique ou remova linhas. Marcadores: `NOVO`, `REVISADO`, `=`.
4. **Gerar planilha** — exporta o `.xlsx`. Com a lista anterior importada, a nova emissão entra como **nova aba** preservando as anteriores; sem ela, cria um arquivo novo.

## Padrão de nome lido

`PREFIXO-NNN-PL-CONTEÚDO-R##.pdf` → referência = nome sem `-R##`; revisão = número após o `R`. Mantém-se a maior revisão por referência.

## Deploy

### Vercel (recomendado)
1. Suba este projeto para um repositório Git (GitHub/GitLab).
2. Em vercel.com → **Add New → Project** → importe o repositório.
3. A Vercel detecta Vite automaticamente: build `npm run build`, output `dist`. Clique em **Deploy**.

Ou via CLI: `npm i -g vercel && vercel`.

### Netlify
- Arraste a pasta `dist/` (após `npm run build`) em app.netlify.com/drop, ou conecte o repositório (build `npm run build`, publish `dist`).

### GitHub Pages
- `npm run build` e publique o conteúdo de `dist/` na branch de Pages. (Para subpasta, defina `base` no `vite.config.ts`.)

## Estrutura

```
src/
  components/
    ui/            componentes shadcn (button, input, card, table, badge, ...)
    Dropzone.tsx   área de drag-and-drop (arquivos e pastas)
    Header.tsx     cabeçalho com logo
    ProjectMetaForm.tsx
    RowsTable.tsx  tabela editável
  lib/
    types.ts       modelos de dados
    parse.ts       parser de nomes de arquivo
    xlsx.ts        exportação/importação ExcelJS
    logos.ts       logos institucionais (base64)
  App.tsx          orquestração
  main.tsx
```

## Próximos passos sugeridos

- Automatizar o Controle de Saída / Histórico (SG1303) a partir das emissões.
- Extração automática de FORMATO/revisões do carimbo do PDF (quando vetorial).
