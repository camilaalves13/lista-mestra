import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectMeta } from "@/lib/types";

interface Props {
  meta: ProjectMeta;
  onChange: (patch: Partial<ProjectMeta>) => void;
}

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <Label>{label}</Label>
    <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  </div>
);

export function ProjectMetaForm({ meta, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white">1</span>
          Dados do projeto
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Obra" value={meta.obra} onChange={(v) => onChange({ obra: v })} placeholder="Ex.: LOG TERESINA" />
        <Field label="Endereço" value={meta.endereco} onChange={(v) => onChange({ endereco: v })} />
        <Field label="Projeto" value={meta.projeto} onChange={(v) => onChange({ projeto: v })} />
        <Field label="Etapa" value={meta.etapa} onChange={(v) => onChange({ etapa: v })} />
        <Field label="Data da emissão" type="date" value={meta.data} onChange={(v) => onChange({ data: v })} />
        <Field label="Código da emissão (aba)" value={meta.emissao} onChange={(v) => onChange({ emissao: v })} placeholder="E09" />
        <Field label="Prefixo dos arquivos" value={meta.prefixo} onChange={(v) => onChange({ prefixo: v })} />
        <Field label="Nome do arquivo de saída" value={meta.nomeArquivo} onChange={(v) => onChange({ nomeArquivo: v })} />
      </CardContent>
    </Card>
  );
}
