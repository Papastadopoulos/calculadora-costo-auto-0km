import { useState } from "react";
import { MARCAS, ars, modelosDeMarca, versionesDeModelo, type Modelo } from "@/lib/costos";

const selectCls = "w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
// Búsqueda sin tildes, mayúsculas ni signos: "crv" encuentra "CR-V".
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function SelectorVersion({ inicial, onChange, manual = false, etiqueta = "", className = "space-y-4" }: {
  inicial: Modelo; onChange: (modelo: Modelo | null, manual: boolean) => void;
  manual?: boolean; etiqueta?: string; className?: string;
}) {
  const [marca, setMarca] = useState(inicial.marca);
  const [modelo, setModelo] = useState(inicial.modelo);
  const [versionId, setVersionId] = useState(inicial.id);
  const [busqueda, setBusqueda] = useState("");
  const modelos = modelosDeMarca(marca);
  const versiones = versionesDeModelo(marca, modelo);
  const nombre = (campo: string) => etiqueta ? `${campo} ${etiqueta}` : campo;
  const coinciden = (texto: string) => modelos.filter((m) => normalizar(m).includes(normalizar(texto)));
  const coincidentes = coinciden(busqueda);
  // El modelo elegido sigue en la lista aunque no coincida, para no perder la selección.
  const visibles = modelos.filter((m) => m === modelo || coincidentes.includes(m));
  function buscar(texto: string) {
    setBusqueda(texto);
    const encontrados = coinciden(texto);
    if (texto.trim() && encontrados.length === 1 && encontrados[0]) cambiarModelo(encontrados[0]);
  }
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
          setMarca(e.target.value); setModelo(""); setVersionId(""); setBusqueda(""); onChange(null, false);
        }}>
          {MARCAS.map((m) => <option key={m}>{m}</option>)}
        </select>
      </label>
      <div className="block min-w-0">
        <span className="mb-1 block text-sm font-medium">Modelo</span>
        <input type="search" aria-label={nombre("Buscar modelo")} placeholder="Buscar modelo…" autoComplete="off"
          className={`${selectCls} mb-2`} value={busqueda} onChange={(e) => buscar(e.target.value)} />
        <select aria-label={nombre("Modelo")} className={selectCls} value={modelo} onChange={(e) => cambiarModelo(e.target.value)}>
          <option value="">{coincidentes.length ? "Elegí un modelo" : "Ningún modelo coincide"}</option>
          {visibles.map((m) => <option key={m} value={m}>{m}</option>)}
          {manual && <option value="otro">Otro (manual)</option>}
        </select>
      </div>
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