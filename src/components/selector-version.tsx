import { useId, useState } from "react";
import { MARCAS, ars, modelosDeMarca, versionesDeModelo, type Modelo } from "@/lib/costos";

const selectCls = "w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
// Búsqueda sin tildes, mayúsculas ni signos: "crv" encuentra "CR-V".
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const CATALOGO = MARCAS.flatMap((marca) => modelosDeMarca(marca).map((modelo) => ({ marca, modelo, clave: normalizar(`${marca}${modelo}`), claveModelo: normalizar(modelo) })));
const MAX_SUGERENCIAS = 8;

/** Modelos de cualquier marca que contienen todas las palabras buscadas; primero los que empiezan con lo buscado. */
function sugerir(texto: string) {
  const palabras = texto.split(/\s+/).map(normalizar).filter(Boolean);
  if (!palabras.length) return [];
  const junto = palabras.join("");
  const orden = (s: (typeof CATALOGO)[number]) => (s.claveModelo.startsWith(junto) ? 0 : s.clave.startsWith(junto) ? 1 : 2);
  return CATALOGO.filter((s) => palabras.every((p) => s.clave.includes(p)))
    .sort((a, b) => orden(a) - orden(b) || a.modelo.localeCompare(b.modelo, "es-AR") || a.marca.localeCompare(b.marca, "es-AR"));
}

export function SelectorVersion({ inicial, onChange, manual = false, etiqueta = "", className = "space-y-4" }: {
  inicial: Modelo; onChange: (modelo: Modelo | null, manual: boolean) => void;
  manual?: boolean; etiqueta?: string; className?: string;
}) {
  const [marca, setMarca] = useState(inicial.marca);
  const [modelo, setModelo] = useState(inicial.modelo);
  const [versionId, setVersionId] = useState(inicial.id);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);
  const listaId = useId();
  const modelos = modelosDeMarca(marca);
  const versiones = versionesDeModelo(marca, modelo);
  const coincidencias = sugerir(busqueda);
  const sugerencias = coincidencias.slice(0, MAX_SUGERENCIAS);
  const mostrar = abierto && busqueda.trim() !== "";
  const nombre = (campo: string) => etiqueta ? `${campo} ${etiqueta}` : campo;
  function cambiarModelo(valor: string, enMarca = marca) {
    const elegido = modelosDeMarca(enMarca).find((m) => m === valor) ?? (manual && valor === "otro" ? "otro" : "");
    if (enMarca === marca && elegido === modelo) return;
    setMarca(enMarca);
    setModelo(elegido);
    const opciones = versionesDeModelo(enMarca, elegido);
    const unica = opciones.length === 1 ? opciones[0] : undefined;
    setVersionId(unica?.id ?? "");
    onChange(unica ?? null, elegido === "otro");
  }
  function elegirSugerencia(s: (typeof CATALOGO)[number]) {
    cambiarModelo(s.modelo, s.marca);
    setBusqueda(""); setAbierto(false);
  }
  return (
    <div className={className}>
      <div className="relative block min-w-0">
        <span className="mb-1 block text-sm font-medium">Buscar auto</span>
        <input type="search" role="combobox" aria-label={nombre("Buscar auto")} aria-expanded={mostrar} aria-controls={listaId} aria-autocomplete="list"
          aria-activedescendant={mostrar && sugerencias[activa] ? `${listaId}-${activa}` : undefined}
          placeholder="Ej: Cronos" autoComplete="off" className={selectCls} value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); setActiva(0); }}
          onFocus={() => setAbierto(true)} onBlur={() => setAbierto(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault(); setAbierto(true);
              const paso = e.key === "ArrowDown" ? 1 : -1;
              setActiva((i) => sugerencias.length ? (i + paso + sugerencias.length) % sugerencias.length : 0);
            } else if (e.key === "Enter" && mostrar && sugerencias[activa]) {
              e.preventDefault(); elegirSugerencia(sugerencias[activa]);
            } else if (e.key === "Escape") setAbierto(false);
          }} />
        {mostrar && <ul id={listaId} role="listbox" aria-label={nombre("Sugerencias")} className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-input bg-card py-1 text-sm shadow-md">
          {sugerencias.length === 0 && <li className="px-3 py-2 text-muted-foreground">Ningún modelo coincide</li>}
          {sugerencias.map((s, i) => (
            <li key={`${s.marca}|${s.modelo}`} id={`${listaId}-${i}`} role="option" aria-selected={i === activa}
              className={`cursor-pointer px-3 py-2 ${i === activa ? "bg-muted" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); elegirSugerencia(s); }} onMouseEnter={() => setActiva(i)}>
              <span className="font-medium">{s.modelo}</span> <span className="text-muted-foreground">{s.marca}</span>
            </li>
          ))}
          {coincidencias.length > sugerencias.length && <li role="presentation" className="px-3 py-2 text-xs text-muted-foreground">
            Mostrando {sugerencias.length} de {coincidencias.length}. Escribí más para afinar.
          </li>}
        </ul>}
      </div>
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
