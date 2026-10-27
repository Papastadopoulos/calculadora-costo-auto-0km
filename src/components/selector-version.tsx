import { useState } from "react";
import { MARCAS, ars, modelosDeMarca, versionesDeModelo, type Modelo } from "@/lib/costos";

const selectCls = "w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function SelectorVersion({ inicial, onChange, manual = false, etiqueta = "", className = "space-y-4" }: {
  inicial: Modelo; onChange: (modelo: Modelo | null, manual: boolean) => void;
  manual?: boolean; etiqueta?: string; className?: string;
}) {
  const [marca, setMarca] = useState(inicial.marca);
  const [modelo, setModelo] = useState(inicial.modelo);
  const [versionId, setVersionId] = useState(inicial.id);
  const modelos = modelosDeMarca(marca);
  const versiones = versionesDeModelo(marca, modelo);
  const nombre = (campo: string) => etiqueta ? `${campo} ${etiqueta}` : campo;
  function cambiarModelo(valor: string) {
    const elegido = modelos.find((m) => m === valor) ?? (manual && valor === "otro" ? "otro" : "");
    if (elegido === modelo) return;
    setModelo(elegido);
    const opciones = versionesDeModelo(marca, elegido);
    const unica = opciones.length === 1 ? opciones[0] : undefined;
    setVersionId(unica?.id ?? "");
    onChange(unica ?? null, elegido === "otro");
  }
  return (
    <div className={className}>
      <label className="block min-w-0">
        <span className="mb-1 block text-sm font-medium">Marca</span>
        <select aria-label={nombre("Marca")} className={selectCls} value={marca} onChange={(e) => {
          setMarca(e.target.value); setModelo(""); setVersionId(""); onChange(null, false);
        }}>
          {MARCAS.map((m) => <option key={m}>{m}</option>)}
        </select>
      </label>
      <label className="block min-w-0">
        <span className="mb-1 block text-sm font-medium">Modelo</span>
        <select aria-label={nombre("Modelo")} className={selectCls} value={modelo} onChange={(e) => cambiarModelo(e.target.value)}>
          <option value="">Elegí un modelo</option>
          {modelos.map((m) => <option key={m} value={m}>{m}</option>)}
          {manual && <option value="otro">Otro (manual)</option>}
        </select>
      </label>
      {modelo !== "otro" && <label className="block min-w-0">
        <span className="mb-1 block text-sm font-medium">Versión</span>
        <select aria-label={nombre("Versión")} className={selectCls} value={versionId} disabled={!modelo} onChange={(e) => {
          setVersionId(e.target.value); onChange(versiones.find((m) => m.id === e.target.value) ?? null, false);
        }}>
          <option value="">Elegí una versión</option>
          {versiones.map((m) => <option key={m.id} value={m.id}>{m.version} — {ars(m.precio0km)}</option>)}
        </select>
      </label>}
    </div>
  );
}