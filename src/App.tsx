import { useState } from "react";
import { Header } from "@/components/Header";
import { ProjectMetaForm } from "@/components/ProjectMetaForm";
import { RowsTable } from "@/components/RowsTable";
import { Dropzone } from "@/components/Dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileSpreadsheet, Download, FileText, Image as ImageIcon } from "lucide-react";
import { emptyMeta, emptyRow, toISODate, isAfterDay, type MasterRow, type ProjectMeta } from "@/lib/types";
import { dedupeByFiles, type ParsedFile } from "@/lib/parse";
import { extractFormato, extractDataCarimbo } from "@/lib/pdf";
import { exportMasterList, importPrevious } from "@/lib/xlsx";
import { LOGO_LOG } from "@/lib/logos";

const isInitial = (rev: string) => (parseInt(rev || "0", 10) || 0) === 0;

export default function App() {
  const [meta, setMeta] = useState<ProjectMeta>(emptyMeta());
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [prevFile, setPrevFile] = useState<File | null>(null);
  const [prevCount, setPrevCount] = useState(0);
  const [folderCount, setFolderCount] = useState(0);
  const [status, setStatus] = useState<{ kind: "info" | "error" | "ok"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Opções de detecção
  const [autoRevise, setAutoRevise] = useState(true);
  const [useFileDate, setUseFileDate] = useState(true);
  const [extractPdf, setExtractPdf] = useState(true);
  const [stampDate, setStampDate] = useState(true);
  // Logo do cliente (SG é sempre a base). Projeto LOG -> inclui a logo da LOG.
  const [includeClientLogo, setIncludeClientLogo] = useState(true);
  const [clientLogo, setClientLogo] = useState<string>(LOGO_LOG); // base64 sem prefixo
  const [clientLogoName, setClientLogoName] = useState<string>("LOG (padrão)");

  const patchMeta = (patch: Partial<ProjectMeta>) => setMeta((m) => ({ ...m, ...patch }));
  const patchRow = (id: string, patch: Partial<MasterRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const duplicateRow = (id: string) =>
    setRows((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      if (i < 0) return rs;
      const copy = { ...rs[i], id: crypto.randomUUID(), estado: "manual" as const };
      return [...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)];
    });
  const addRow = () => setRows((rs) => [...rs, emptyRow(meta.data)]);

  const onClientLogo = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.split(",")[1] || "";
      setClientLogo(base64);
      setClientLogoName(f.name);
      setIncludeClientLogo(true);
    };
    reader.readAsDataURL(f);
  };

  const runFormatoExtraction = async (parsed: ParsedFile[]) => {
    setStatus({ kind: "info", msg: "Lendo FORMATO e DATA dos PDFs…" });
    let okF = 0;
    let okD = 0;
    for (const p of parsed) {
      const [fmt, dataCarimbo] = await Promise.all([
        extractFormato(p.file),
        stampDate ? extractDataCarimbo(p.file) : Promise.resolve(""),
      ]);
      if (fmt) okF++;
      if (dataCarimbo) okD++;
      if (fmt || dataCarimbo) {
        setRows((rs) =>
          rs.map((r) => {
            if (r.arquivo !== p.referencia) return r;
            let nr = r;
            if (fmt && !r.formato) nr = { ...nr, formato: fmt };
            if (dataCarimbo) nr = { ...nr, data: dataCarimbo };
            return nr;
          })
        );
      }
    }
    setStatus({
      kind: okF || okD ? "ok" : "info",
      msg: `FORMATO: ${okF}/${parsed.length} PDF(s)${stampDate ? ` · DATA do carimbo: ${okD}/${parsed.length}` : ""}. Confira os que ficaram em branco.`,
    });
  };

  const onFolder = (files: File[]) => {
    const pdfs = files.filter((f) => /\.pdf$/i.test(f.name));
    if (!pdfs.length) {
      setStatus({ kind: "error", msg: "Nenhum PDF encontrado na seleção." });
      return;
    }
    setFolderCount(pdfs.length);
    const parsed = dedupeByFiles(pdfs);
    setRows((prev) => {
      const byRef = new Map(prev.map((r) => [r.arquivo, r] as const));
      const result: MasterRow[] = prev.map((r) => ({ ...r }));
      const idx = new Map(result.map((r, i) => [r.arquivo, i] as const));
      let added = 0;
      let revised = 0;
      let unchanged = 0;
      const hadBaseline = prev.length > 0 || prevCount > 0;

      for (const p of parsed) {
        const fileDate = toISODate(p.lastModified);
        const existing = byRef.get(p.referencia);

        if (existing) {
          const i = idx.get(p.referencia)!;
          const mudou = autoRevise && isAfterDay(fileDate, existing.data);
          if (mudou) {
            const nextRev = String((parseInt(existing.rev || "0", 10) || 0) + 1);
            result[i] = {
              ...existing,
              rev: nextRev,
              data: useFileDate ? fileDate : meta.data,
              atualizadoEm: fileDate,
              revisoes: "",
              estado: "revisado",
            };
            revised++;
          } else {
            result[i] = { ...existing, atualizadoEm: fileDate, estado: hadBaseline ? "igual" : existing.estado };
            unchanged++;
          }
        } else {
          const rev = p.rev || "0";
          result.push({
            ...emptyRow(meta.data),
            arquivo: p.referencia,
            rev,
            data: useFileDate ? fileDate : meta.data,
            atualizadoEm: fileDate,
            revisoes: isInitial(rev) ? "EMISSÃO INICIAL" : "",
            estado: hadBaseline ? "novo" : "manual",
          });
          added++;
        }
      }

      setStatus({
        kind: "ok",
        msg: hadBaseline
          ? `${parsed.length} arquivo(s) analisado(s): ${revised} revisado(s), ${added} novo(s), ${unchanged} sem alteração.`
          : `${parsed.length} arquivo(s) lido(s). Importe a Lista Mestra anterior para detectar revisões pela data.`,
      });
      return result;
    });

    if (extractPdf) void runFormatoExtraction(parsed);
  };

  const onPrev = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    try {
      const { proximaEmissao, rows: imported } = await importPrevious(file);
      setPrevFile(file);
      setPrevCount(imported.length);
      setRows(imported);
      patchMeta({ emissao: proximaEmissao });
      setStatus({
        kind: "ok",
        msg: `Lista anterior importada: ${imported.length} item(ns). Próxima emissão: ${proximaEmissao}.`,
      });
    } catch (e) {
      setStatus({ kind: "error", msg: "Falha ao ler a lista anterior: " + (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const onExport = async () => {
    if (!rows.length) {
      setStatus({ kind: "error", msg: "Adicione ao menos uma linha antes de gerar." });
      return;
    }
    setBusy(true);
    try {
      const name = await exportMasterList(meta, rows, prevFile, {
        clientLogo: includeClientLogo ? clientLogo : null,
      });
      setStatus({ kind: "ok", msg: "Planilha gerada: " + name });
    } catch (e) {
      setStatus({ kind: "error", msg: "Erro ao gerar: " + (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const Toggle = ({
    checked,
    onChange,
    title,
    desc,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    title: string;
    desc: string;
  }) => (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[#c0392b]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </label>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container space-y-5 py-6">
        <ProjectMetaForm meta={meta} onChange={patchMeta} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white">2</span>
              Inserir arquivos
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Dropzone
              title="Pasta / PDFs do projeto"
              hint="Arraste a pasta ou os PDFs aqui — ou clique para selecionar"
              icon={<FolderOpen className="h-7 w-7" />}
              accept=".pdf"
              multiple
              directory
              filledLabel={folderCount ? `${folderCount} PDF(s) carregado(s)` : null}
              onFiles={onFolder}
            />
            <Dropzone
              title="Lista Mestra anterior (.xlsx)"
              hint="Opcional — arraste para reaproveitar dados e criar nova aba"
              icon={<FileSpreadsheet className="h-7 w-7" />}
              accept=".xlsx"
              filledLabel={prevFile ? `${prevFile.name} (${prevCount} itens)` : null}
              onFiles={onPrev}
            />

            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 text-sm md:col-span-2">
              <Toggle
                checked={autoRevise}
                onChange={setAutoRevise}
                title="Gerar revisão automática por data"
                desc="Arquivos modificados após a data da emissão anterior são marcados como revisados (revisão +1)."
              />
              <Toggle
                checked={useFileDate}
                onChange={setUseFileDate}
                title="Usar a data de modificação do arquivo como data da revisão"
                desc="Se desmarcado, usa a data da emissão informada no passo 1."
              />
              <Toggle
                checked={extractPdf}
                onChange={setExtractPdf}
                title="Ler o FORMATO do carimbo do PDF"
                desc="Procura o rótulo FORMATO na prancha e usa o valor ao lado dele. Ajustável manualmente."
              />
              <Toggle
                checked={stampDate}
                onChange={setStampDate}
                title="Usar a DATA do carimbo do PDF na coluna DATA"
                desc="Lê o campo DATA do carimbo da prancha e usa como data da revisão (prioridade sobre a data do arquivo)."
              />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 text-sm md:col-span-2">
              <Toggle
                checked={includeClientLogo}
                onChange={setIncludeClientLogo}
                title="Incluir logo do cliente (projeto LOG)"
                desc="SG é a logo base. Marque para colocar a logo do cliente ao lado; desmarque para usar apenas a SG mesclada nas duas colunas."
              />
              {includeClientLogo && (
                <div className="flex items-center gap-3 pl-6">
                  <span className="text-xs text-muted-foreground">Logo atual: <strong>{clientLogoName}</strong></span>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs hover:bg-accent">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Trocar logo do cliente
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => onClientLogo(Array.from(e.target.files || []))}
                    />
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white">3</span>
              Conferir e editar
              {rows.length > 0 && <Badge variant="secondary">{rows.length} linha(s)</Badge>}
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Badge variant="new">NOVO</Badge> inédito
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="rev">REVISADO</Badge> mudou
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="same">=</Badge> sem alteração
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <RowsTable rows={rows} onPatch={patchRow} onRemove={removeRow} onDuplicate={duplicateRow} onAdd={addRow} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white">4</span>
              Gerar planilha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="success" size="lg" disabled={busy} onClick={onExport}>
                <Download className="h-4 w-4" /> Exportar Lista Mestra (.xlsx)
              </Button>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {prevFile
                  ? `Nova aba ${meta.emissao} adicionada preservando as anteriores.`
                  : `Arquivo novo com a aba ${meta.emissao}.`}
              </span>
            </div>
            {status && (
              <div
                className={
                  "rounded-md px-3 py-2 text-sm " +
                  (status.kind === "error"
                    ? "bg-destructive/10 text-destructive"
                    : status.kind === "ok"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-muted text-muted-foreground")
                }
              >
                {status.msg}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="container py-6 text-center text-xs text-muted-foreground">
        Processamento 100% local no navegador · SG Projetos &amp; Consultoria
      </footer>
    </div>
  );
}
