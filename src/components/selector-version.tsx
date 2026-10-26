import { useId, useState } from "react";
import { MARCAS, ars, modelosDeMarca, versionesDeModelo, type Modelo } from "@/lib/costos";

const selectCls = "w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function SelectorVersion({ inicial, onChange, manual = false, etiqueta = "", className = "space-y-4" }: {
  inicial: Modelo; onChange: (modelo: Modelo | null, manual: boolean) => void;
  manual?: boolean; etiqueta?: string; className?: string;
}) {
  const listaId = useId();
  const [marca, setMarca] = useState(inicial.marca);
  const [modelo, setModelo] = useState(inicial.modelo);
  const [busqueda, setBusqueda] = useState(inicial.modelo);
  const [versionId, setVersionId] = useState(inicial.id);
  const modelos = modelosDeMarca(marca);
  const versiones = versionesDeModelo(marca, modelo);
  const nombre = (campo: string) => etiqueta ? `${campo} ${etiqueta}` : campo;
  function cambiarModelo(valor: string) {
    setBusqueda(valor);
    const elegido = modelos.find((m) => m === valor) ?? (manual && valor === "Otro (manual)" ? "otro" : "");
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
          setMarca(e.target.value); setModelo(""); setBusqueda(""); setVersionId(""); onChange(null, false);
        }}>
          {MARCAS.map((m) => <option key={m}>{m}</option>)}
        </select>
      </label>
      <label className="block min-w-0">
        <span className="mb-1 block text-sm font-medium">Modelo</span>
        <input role="combobox" aria-label={nombre("Modelo")} aria-autocomplete="list" aria-expanded={false} list={listaId} className={selectCls}
          value={busqueda} onFocus={(e) => e.target.select()} onChange={(e) => cambiarModelo(e.target.value)} autoComplete="off" />
        <datalist id={listaId}>
          {modelos.filter((m) => m.toLocaleLowerCase("es-AR").includes(busqueda.toLocaleLowerCase("es-AR"))).map((m) => <option key={m} value={m} />)}
          {manual && <option value="Otro (manual)" />}
        </datalist>
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