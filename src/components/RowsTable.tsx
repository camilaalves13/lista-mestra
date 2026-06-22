import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, Plus } from "lucide-react";
import type { MasterRow } from "@/lib/types";

interface Props {
  rows: MasterRow[];
  onPatch: (id: string, patch: Partial<MasterRow>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAdd: () => void;
}

const stateBadge = (s: MasterRow["estado"]) => {
  switch (s) {
    case "novo":
      return <Badge variant="new">NOVO</Badge>;
    case "revisado":
      return <Badge variant="rev">REVISADO</Badge>;
    case "igual":
      return <Badge variant="same">=</Badge>;
    default:
      return null;
  }
};

export function RowsTable({ rows, onPatch, onRemove, onDuplicate, onAdd }: Props) {
  const cellInput = "h-8 border-transparent bg-transparent px-2 hover:border-input focus-visible:bg-background";
  const cellArea =
    "min-h-[34px] border-transparent bg-transparent px-2 py-1 text-xs hover:border-input focus-visible:bg-background";
  return (
    <div className="rounded-lg border">
      <div className="max-h-[58vh] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-secondary">
            <TableRow>
              <TableHead className="w-[1%]"></TableHead>
              <TableHead className="min-w-[260px]">Arquivo</TableHead>
              <TableHead className="w-16">Rev</TableHead>
              <TableHead className="w-32">Data</TableHead>
              <TableHead className="w-20">Formato</TableHead>
              <TableHead className="min-w-[260px]">Conteúdo</TableHead>
              <TableHead className="min-w-[280px]">Revisões realizadas</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma linha. Arraste a pasta dos PDFs, importe a lista anterior ou clique em "Adicionar linha".
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pt-2">{stateBadge(r.estado)}</TableCell>
                <TableCell>
                  <Input
                    className={`${cellInput} font-mono text-xs`}
                    value={r.arquivo}
                    onChange={(e) => onPatch(r.id, { arquivo: e.target.value, estado: "manual" })}
                  />
                  {r.atualizadoEm && (
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      atualizado em {r.atualizadoEm.split("-").reverse().join("/")}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    className={`${cellInput} text-center`}
                    value={r.rev}
                    onChange={(e) => onPatch(r.id, { rev: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    className={cellInput}
                    value={r.data}
                    onChange={(e) => onPatch(r.id, { data: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className={`${cellInput} text-center`}
                    value={r.formato}
                    onChange={(e) => onPatch(r.id, { formato: e.target.value })}
                    placeholder="A0"
                  />
                </TableCell>
                <TableCell>
                  <Textarea
                    className={cellArea}
                    rows={2}
                    value={r.conteudo}
                    onChange={(e) => onPatch(r.id, { conteudo: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Textarea
                    className={cellArea}
                    rows={2}
                    value={r.revisoes}
                    onChange={(e) => onPatch(r.id, { revisoes: e.target.value })}
                  />
                </TableCell>
                <TableCell className="pt-1.5">
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={() => onDuplicate(r.id)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      title="Remover"
                      onClick={() => onRemove(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t p-2">
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Adicionar linha
        </Button>
      </div>
    </div>
  );
}
