import { useState } from "react";
import { COMBUSTIBLES, MODELOS, NOTA_ELECTRICO, ars, calcularModeloComparado, masBarato, type Modelo, type UsoComparador } from "@/lib/costos";
import { SelectorVersion } from "@/components/selector-version";

const rango = ([min, max]: readonly [number, number]) => min === max ? ars(min) : `${ars(min)} – ${ars(max)}`;

export function ComparadorModelos({ uso }: { uso: UsoComparador }) {
  const inicialA = MODELOS[0];
  const inicialB = MODELOS.find((m) => m.marca !== inicialA?.marca) ?? MODELOS[1];
  const [a, setA] = useState<Modelo | null>(inicialA ?? null);
  const [b, setB] = useState<Modelo | null>(inicialB ?? null);
  if (!inicialA || !inicialB) return null;
  const costoA = a ? calcularModeloComparado(a, uso) : null;
  const costoB = b ? calcularModeloComparado(b, uso) : null;
  const filas: { nombre: string; a: [number, number]; b: [number, number] }[] = costoA && costoB ? [
    { nombre: "Total mensual", a: [costoA.mensualMin, costoA.mensualMax], b: [costoB.mensualMin, costoB.mensualMax] },
    { nombre: "Costo por km", a: [costoA.kmMin, costoA.kmMax], b: [costoB.kmMin, costoB.kmMax] },
    ...Object.entries(costoA.rubros).map(([nombre, valores]) => ({
      nombre: `${nombre} / mes`,
      a: [valores[0] / 12, valores[1] / 12] as [number, number],
      b: [(costoB.rubros[nombre]?.[0] ?? 0) / 12, (costoB.rubros[nombre]?.[1] ?? 0) / 12] as [number, number],
    })),
  ] : [];

  return (
    <section aria-labelledby="comparador-titulo" className="space-y-4">
      <h2 id="comparador-titulo" className="text-3xl">Compará dos modelos</h2>
      <div className="grid grid-cols-2 gap-4">
        {[{ inicial: inicialA, cambiar: setA, modelo: a, etiqueta: "Modelo A" }, { inicial: inicialB, cambiar: setB, modelo: b, etiqueta: "Modelo B" }].map(({ inicial, cambiar, modelo, etiqueta }) => (
          <div key={etiqueta} className="min-w-0">
            <p className="mb-1 text-sm font-medium">{etiqueta}</p>
            <SelectorVersion inicial={inicial} etiqueta={etiqueta} onChange={(m) => cambiar(m)} />
            {modelo && <p className="mt-2 break-words text-xs text-muted-foreground">{modelo.version}{modelo.combustiblePredeterminado && ` · ${COMBUSTIBLES.find((c) => c.clave === modelo.combustiblePredeterminado)?.nombre ?? ""}`}</p>}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {uso.kmAnio.toLocaleString("es-AR")} km/año; VTV, cochera, financiación y otros gastos iguales a los cargados arriba.
        Consumo, combustible recomendado, seguro y service de referencia de cada modelo. Patente estimada con ARBA 2026 sobre el precio 0km, no la valuación fiscal real.
      </p>
      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full table-fixed text-sm">
          <thead className="border-b border-border bg-muted">
            <tr>
              <th scope="col" className="w-[36%] p-3 sm:w-[28%] text-left font-medium">Costo</th>
              <th scope="col" className="p-3 text-right font-medium break-words">{a ? `${a.marca} ${a.modelo}` : "Modelo A"}</th>
              <th scope="col" className="p-3 text-right font-medium break-words">{b ? `${b.marca} ${b.modelo}` : "Modelo B"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filas.length === 0 && <tr><td colSpan={3} className="p-3 text-sm text-muted-foreground">Elegí una versión en cada lado.</td></tr>}
            {filas.map((fila) => {
              const ganador = masBarato(fila.a, fila.b);
              return (
                <tr key={fila.nombre}>
                  <th scope="row" className="p-3 text-left font-medium break-words">{fila.nombre}</th>
                  {(["a", "b"] as const).map((lado) => (
                    <td key={lado} className={`p-3 text-right tabular-nums break-words ${ganador === lado ? "bg-highlight text-highlight-foreground font-semibold" : "text-muted-foreground"}`}>
                      {rango(fila[lado])}
                       {fila.nombre === "Combustible / mes" && (lado === "a" ? a : b)?.combustible === "eléctrico" && <span className="mt-1 block text-xs font-normal text-muted-foreground">{NOTA_ELECTRICO}</span>}
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