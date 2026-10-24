import { useState } from "react";
import { MODELOS, ars, calcularModeloComparado, masBarato, type UsoComparador } from "@/lib/costos";

const selectCls = "w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const rango = ([min, max]: readonly [number, number]) => min === max ? ars(min) : `${ars(min)} – ${ars(max)}`;

export function ComparadorModelos({ uso }: { uso: UsoComparador }) {
  const [idA, setIdA] = useState(MODELOS[0]?.id ?? "");
  const [idB, setIdB] = useState(MODELOS[1]?.id ?? "");
  const a = MODELOS.find((m) => m.id === idA);
  const b = MODELOS.find((m) => m.id === idB);
  if (!a || !b) return null;
  const costoA = calcularModeloComparado(a, uso);
  const costoB = calcularModeloComparado(b, uso);
  const filas: { nombre: string; a: [number, number]; b: [number, number] }[] = [
    { nombre: "Total mensual", a: [costoA.mensualMin, costoA.mensualMax], b: [costoB.mensualMin, costoB.mensualMax] },
    { nombre: "Costo por km", a: [costoA.kmMin, costoA.kmMax], b: [costoB.kmMin, costoB.kmMax] },
    ...Object.entries(costoA.rubros).map(([nombre, valores]) => ({
      nombre: `${nombre} / mes`,
      a: [valores[0] / 12, valores[1] / 12] as [number, number],
      b: [(costoB.rubros[nombre]?.[0] ?? 0) / 12, (costoB.rubros[nombre]?.[1] ?? 0) / 12] as [number, number],
    })),
  ];

  return (
    <section aria-labelledby="comparador-titulo" className="space-y-4">
      <h2 id="comparador-titulo" className="text-3xl">Compará dos modelos</h2>
      <div className="grid grid-cols-2 gap-4">
        {[{ id: idA, cambiar: setIdA, modelo: a, etiqueta: "Modelo A" }, { id: idB, cambiar: setIdB, modelo: b, etiqueta: "Modelo B" }].map(({ id, cambiar, modelo, etiqueta }) => (
          <div key={etiqueta} className="min-w-0">
            <label className="block text-sm font-medium">
              <span className="mb-1 block">{etiqueta}</span>
              <select className={selectCls} value={id} onChange={(e) => cambiar(e.target.value)}>
                {MODELOS.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
              </select>
            </label>
            <p className="mt-2 break-words text-xs text-muted-foreground">{modelo.version}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {uso.kmAnio.toLocaleString("es-AR")} km/año; VTV, cochera, financiación y otros gastos iguales a los cargados arriba.
        Consumo, seguro y service de referencia de cada modelo. Patente estimada con ARBA 2026 sobre el precio 0km, no la valuación fiscal real.
      </p>
      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full table-fixed text-sm">
          <thead className="border-b border-border bg-muted">
            <tr>
              <th scope="col" className="w-[28%] p-3 text-left font-medium">Costo</th>
              <th scope="col" className="p-3 text-right font-medium break-words">{a.id}</th>
              <th scope="col" className="p-3 text-right font-medium break-words">{b.id}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filas.map((fila) => {
              const ganador = masBarato(fila.a, fila.b);
              return (
                <tr key={fila.nombre}>
                  <th scope="row" className="p-3 text-left font-medium break-words">{fila.nombre}</th>
                  {(["a", "b"] as const).map((lado) => (
                    <td key={lado} className={`p-3 text-right tabular-nums break-words ${ganador === lado ? "bg-highlight text-highlight-foreground font-semibold" : "text-muted-foreground"}`}>
                      {rango(fila[lado])}
                      {ganador === lado && <span className="mt-1 block text-[10px] font-medium">Menor promedio</span>}
                      {ganador === null && <span className="mt-1 block text-[10px]">Igual</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Se resalta el menor promedio de cada rango; los rangos pueden superponerse.</p>
    </section>
  );
}