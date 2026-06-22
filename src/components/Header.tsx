import { LOGO_SG } from "@/lib/logos";

export function Header() {
  return (
    <header className="border-b bg-brand-dark text-white">
      <div className="container flex items-center gap-4 py-4">
        <div className="rounded-md bg-white px-3 py-2">
          <img src={`data:image/png;base64,${LOGO_SG}`} alt="SG Projetos" className="h-8" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Gerador de Lista Mestra</h1>
          <p className="text-xs text-zinc-300">
            Controle de saída · Projeto Legal — SG Projetos &amp; Consultoria
          </p>
        </div>
      </div>
    </header>
  );
}
