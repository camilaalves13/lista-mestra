import * as React from "react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  title: string;
  hint: string;
  icon: React.ReactNode;
  accept?: string; // ex.: ".xlsx" ou ".pdf"
  multiple?: boolean;
  directory?: boolean;
  filledLabel?: string | null;
  onFiles: (files: File[]) => void;
}

// Percorre recursivamente uma entrada de diretório (drag de pasta)
async function readEntry(entry: any, out: File[]): Promise<void> {
  if (entry.isFile) {
    await new Promise<void>((resolve) =>
      entry.file((f: File) => {
        out.push(f);
        resolve();
      })
    );
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    await new Promise<void>((resolve) => {
      const readBatch = () => {
        reader.readEntries(async (entries: any[]) => {
          if (!entries.length) return resolve();
          for (const e of entries) await readEntry(e, out);
          readBatch();
        });
      };
      readBatch();
    });
  }
}

export function Dropzone({
  title,
  hint,
  icon,
  accept,
  multiple,
  directory,
  filledLabel,
  onFiles,
}: DropzoneProps) {
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const items = e.dataTransfer.items;
    const out: File[] = [];
    if (items && items.length && (items[0] as any).webkitGetAsEntry) {
      const entries = Array.from(items)
        .map((it) => (it as any).webkitGetAsEntry?.())
        .filter(Boolean);
      for (const en of entries) await readEntry(en, out);
    } else {
      out.push(...Array.from(e.dataTransfer.files));
    }
    emit(out);
  };

  const emit = (files: File[]) => {
    let list = files;
    if (accept) {
      const exts = accept.split(",").map((s) => s.trim().toLowerCase());
      list = list.filter((f) => exts.some((ext) => f.name.toLowerCase().endsWith(ext)));
    }
    if (list.length) onFiles(list);
  };

  const dirProps = directory
    ? ({ webkitdirectory: "", directory: "" } as Record<string, string>)
    : {};

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors",
        over ? "border-brand-green bg-[#f3fbef]" : "border-input bg-muted/30 hover:border-brand/60 hover:bg-muted/50",
        filledLabel && "border-brand-green/70 bg-[#f6fcf2]"
      )}
    >
      <div className={cn("mb-2 text-muted-foreground transition-colors group-hover:text-brand", filledLabel && "text-brand-green")}>
        {icon}
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{filledLabel || hint}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        {...dirProps}
        className="hidden"
        onChange={(e) => emit(Array.from(e.target.files || []))}
      />
    </div>
  );
}
