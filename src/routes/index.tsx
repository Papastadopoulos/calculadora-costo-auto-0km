import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ComparadorModelos } from "@/components/comparador-modelos";
import { SelectorVersion } from "@/components/selector-version";
import {
  MODELOS, COMBUSTIBLES, SELLOS, VTV_REF, EQUIPO_GNC_DEFAULT,
  ars, calcular, patentamiento, gnc, estimarPatenteArba, fuenteConsumo, NOTA_ELECTRICO, type Modelo, type Combustible, type Origen,
} from "@/lib/costos";

const TITLE = "¿Cuánto te va a costar tu próximo auto? | Calculadora de costo por km";
const DESC = "Calculá el costo real de tu auto: combustible, seguro, patente, VTV, service y más. Precios de referencia noviembre 2026.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

/* ---------- Piezas de UI chiquitas ---------- */

const Estimado = () => (
  <span className="ml-1.5 border-b border-dotted border-estimado text-[10px] font-medium uppercase tracking-wider text-estimado">
    estimado
  </span>
);

function Campo({ label, children, nota, est }: { label: string; children: ReactNode; nota?: ReactNode; est?: boolean | undefined }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center text-sm font-medium">{label}{est && <Estimado />}</span>
      {children}
      {nota && <span className="mt-1 block text-xs text-muted-foreground">{nota}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

/**
 * Campo numérico sin flechitas: se tipea directo por teclado.
 * Al enfocar se selecciona todo el valor; al salir se formatea con separador de miles.
 * El valor mensual se usa tal cual (×1) en el total por mes; el ×12 aparece solo en el desglose anual.
 */
function Num({ value, onChange, step = 1, ariaLabel }: { value: number; onChange: (n: number) => void; step?: number; ariaLabel?: string }) {
  const decimales = step < 1 ? Math.max(1, (String(value).split(".")[1] ?? "").length) : 0;
  const [txt, setTxt] = useState<string | null>(null);
  const fmt = (n: number) =>
    (Number.isFinite(n) ? n : 0).toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  const parse = (s: string) => {
    const t = s.replace(/[^\d.,]/g, "");
    if (decimales === 0) return Number(t.replace(/\D/g, "")) || 0;
    const lastC = t.lastIndexOf(","), lastD = t.lastIndexOf(".");
    const norm = lastC > lastD ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
    const n = Number(norm);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={ariaLabel}
      className={inputCls}
      value={txt ?? fmt(value)}
      onFocus={(e) => {
        setTxt(String(Number.isFinite(value) ? value : 0).replace(".", ","));
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => { setTxt(e.target.value); onChange(parse(e.target.value)); }}
      onBlur={() => setTxt(null)}
    />
  );
}

const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-sm border border-border bg-card p-5 ${className}`}>{children}</div>
);

const COLORES = Array.from({ length: 8 }, (_, i) => `var(--chart-${i + 1})`);
const FECHA_PRECIOS = COMBUSTIBLES[0]?.fecha ?? "2026-10";

/* ---------- Página ---------- */

function Index() {
  const inicial = MODELOS[0];
  if (!inicial) throw new Error("No hay modelos disponibles");
  const [modeloId, setModeloId] = useState(inicial.id);
  const [version, setVersion] = useState(inicial.version);
  const [combustible, setCombustible] = useState<Combustible>(inicial.combustible);
  const [consumo, setConsumo] = useState(inicial.consumo);
  const [precio0km, setPrecio0km] = useState(inicial.precio0km);
  const [seguroMin, setSeguroMin] = useState(inicial.seguroMin);
  const [seguroMax, setSeguroMax] = useState(inicial.seguroMax);
  const [serviceMin, setServiceMin] = useState(inicial.serviceMin);
  const [serviceMax, setServiceMax] = useState(inicial.serviceMax);
  const [intervaloKm, setIntervaloKm] = useState(inicial.intervaloKm);
  const [patenteManual, setPatenteManual] = useState<number | null>(null);
  const [patenteFrec, setPatenteFrec] = useState<"mensual" | "bimestral">("bimestral");
  const [vtvJur, setVtvJur] = useState<"PBA" | "CABA">("PBA");
  const [vtv, setVtv] = useState(VTV_REF.PBA);
  const [kmAnio, setKmAnio] = useState(15000);
  const [cochera, setCochera] = useState(0);
  const [otros, setOtros] = useState(0);
  const [cuota, setCuota] = useState(0);
  const [precios, setPrecios] = useState(() => Object.fromEntries(COMBUSTIBLES.map((c) => [c.clave, c.precio])) as Record<string, number>);
  const [tipoNafta, setTipoNafta] = useState<"nafta_super" | "nafta_premium">(inicial.combustiblePredeterminado === "nafta_premium" ? "nafta_premium" : "nafta_super");
  const [tipoGasoil, setTipoGasoil] = useState<"gasoil" | "gasoil_premium">(inicial.combustiblePredeterminado === "gasoil_premium" ? "gasoil_premium" : "gasoil");
  const [provincia, setProvincia] = useState("Buenos Aires");
  const [origen, setOrigen] = useState<Origen>("nacional");
  const [digital, setDigital] = useState(false);
  const [equipoGnc, setEquipoGnc] = useState(EQUIPO_GNC_DEFAULT);
  const [copiado, setCopiado] = useState(false);

  const modelo = MODELOS.find((m) => m.id === modeloId);

  /** Al elegir modelo, autocompleta desde el CSV (todo queda editable). */
  function elegirModelo(m: Modelo | null, manual: boolean) {
    setModeloId(m?.id ?? (manual ? "otro" : ""));
    setPatenteManual(null);
    if (!m) {
      // Sin versión o "Otro (manual)": se vacía todo para no arrastrar datos del auto anterior.
      setVersion(""); setConsumo(0); setPrecio0km(0); setSeguroMin(0); setSeguroMax(0); setServiceMin(0); setServiceMax(0);
      setIntervaloKm(10000); return;
    }
    setVersion(m.version); setCombustible(m.combustible); setConsumo(m.consumo);
    if (m.combustiblePredeterminado === "gasoil_premium") setTipoGasoil("gasoil_premium");
    else if (m.combustiblePredeterminado) setTipoNafta(m.combustiblePredeterminado);
    setPatenteManual(null);
    setPrecio0km(m.precio0km); setSeguroMin(m.seguroMin); setSeguroMax(m.seguroMax);
    setServiceMin(m.serviceMin); setServiceMax(m.serviceMax); setIntervaloKm(m.intervaloKm);
  }

  const patenteEstimada = patenteManual === null;
  const patenteAnualEstimada = estimarPatenteArba(precio0km);
  const patente = patenteManual ?? patenteAnualEstimada / (patenteFrec === "mensual" ? 12 : 6);

  const claveComb = combustible === "diésel" ? tipoGasoil : tipoNafta;
  const precioLitro = combustible === "eléctrico" ? 0 : precios[claveComb] ?? 0;
  const consumoCalculado = combustible === "eléctrico" ? 0 : consumo;

  const r = useMemo(() => calcular({
    kmAnio, consumo: consumoCalculado, precioLitro, seguroMin, seguroMax, serviceMin, serviceMax, intervaloKm,
    patente, patenteFrecuencia: patenteFrec, vtvAnual: vtv, cochera, otros, cuota,
  }), [kmAnio, consumoCalculado, precioLitro, seguroMin, seguroMax, serviceMin, serviceMax, intervaloKm, patente, patenteFrec, vtv, cochera, otros, cuota]);

  const sellosPct = SELLOS.find((s) => s.provincia === provincia)?.pct ?? 0;
  const pat = patentamiento(precio0km, sellosPct, digital, origen);
  const g = combustible === "nafta" ? gnc(kmAnio, consumo, precios[tipoNafta] ?? 0, precios["gnc"] ?? 0, equipoGnc) : null;

  const torta = Object.entries(r.rubros)
    .map(([name, [a, b]]) => ({ name, value: (a + b) / 2 }))
    .filter((d) => d.value > 0);

  const nombreAuto = modelo ? `${modelo.marca} ${modelo.modelo}` : "mi auto";
  /** Sin versión elegida (o en "Otro" sin consumo ni precio) no hay resultado que mostrar ni compartir. */
  const faltaDato = modeloId === "otro"
    ? precio0km <= 0 || (combustible !== "eléctrico" && consumo <= 0)
    : !modelo;
  const avisoFalta = modeloId === "otro" ? "Cargá el consumo y el precio 0km para ver el resultado" : "Elegí una versión para ver el resultado";
  const fuenteCons = modelo && combustible === modelo.combustible && consumo === modelo.consumo ? fuenteConsumo(modelo.fuente) : null;
  const notaConsumo = combustible === "eléctrico"
    ? "Eléctrico: sin consumo de combustible."
    : modeloId === "otro" ? "Cargá el consumo de tu auto."
    : fuenteCons ? `Fuente: ${fuenteCons.texto}` : modelo ? "Valor editado a mano." : null;

  /** En el celular, barra fija con el resultado mientras la tarjeta no está a la vista. */
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const [tarjetaVisible, setTarjetaVisible] = useState(true);
  useEffect(() => {
    const el = tarjetaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setTarjetaVisible(!!e?.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function compartir() {
    if (faltaDato) return;
    const auto = modeloId === "otro" ? (version.trim() || "mi auto") : modelo ? `${modelo.marca} ${modelo.modelo} ${modelo.version}` : "mi auto";
    const url = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
    const txt = `Mantener ${auto} me sale entre ${ars(r.mensualMin)} y ${ars(r.mensualMax)} por mes (${ars(r.anualMin)}–${ars(r.anualMax)} al año), o sea ${ars(r.kmMin)}–${ars(r.kmMax)} por km, manejando ${kmAnio.toLocaleString("es-AR")} km/año. Calculado con "¿Cuánto te va a costar tu próximo auto?" (precios de referencia nov-2026)${url ? `: ${url}` : "."}`;
    navigator.clipboard?.writeText(txt).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2500); });
  }

  return (
    <div className={`min-h-screen ${tarjetaVisible ? "" : "pb-14 lg:pb-0"}`}>
      {/* 1. Hero */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-5 pb-12 pt-10 md:pb-20 md:pt-14">
          <div className="flex items-center justify-between border-b border-foreground pb-3 text-xs uppercase tracking-[0.18em]">
            <span>Costo real · Argentina</span>
            <span className="text-muted-foreground">Ref. noviembre 2026</span>
          </div>
          <h1 className="mt-10 text-5xl leading-[0.95] md:text-8xl">¿Cuánto te va a costar<br /><em className="text-accent">tu próximo auto?</em></h1>
          <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <p className="max-w-lg text-lg text-muted-foreground">
              Antes de comprar tu 0km, descubrí cuánto te va a costar cada kilómetro: combustible, seguro, patente, VTV, service y más.
            </p>
            <a href="#calculadora" className="inline-flex w-fit border-b-2 border-accent pb-1 font-medium transition hover:text-accent">
              Ir a la calculadora ↓
            </a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Precios de referencia actualizados a noviembre 2026.</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-14 px-5 py-12">
        {/* 2. Calculadora + 4. Resultados */}
        <section id="calculadora" className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-6">
            <Card>
              <h2 className="mb-4 text-2xl">Tu auto</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <SelectorVersion inicial={inicial} manual onChange={elegirModelo} />
                </div>
                {modeloId === "otro" && <div className="sm:col-span-2">
                  <Campo label="Versión">
                      <input className={inputCls} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Describí la versión" />
                  </Campo>
                </div>}
                <Campo label="Combustible">
                  <select className={inputCls} value={combustible} onChange={(e) => {
                    // Al cambiar el combustible a mano, el tipo vuelve al predeterminado de la versión (o súper / gasoil premium).
                    setCombustible(e.target.value as Combustible);
                    setTipoNafta(modelo?.combustiblePredeterminado === "nafta_premium" ? "nafta_premium" : "nafta_super");
                    setTipoGasoil("gasoil_premium");
                  }}>
                    <option value="nafta">Nafta</option><option value="diésel">Diésel</option><option value="híbrido">Híbrido</option><option value="eléctrico">Eléctrico</option>
                  </select>
                </Campo>
                {combustible !== "eléctrico" && <Campo label={combustible === "diésel" ? "Tipo de gasoil" : "Tipo de nafta"}>
                  {combustible === "diésel" ? (
                    <select className={inputCls} value={tipoGasoil} onChange={(e) => setTipoGasoil(e.target.value as typeof tipoGasoil)}>
                      <option value="gasoil">Gasoil</option><option value="gasoil_premium">Gasoil premium</option>
                    </select>
                  ) : (
                    <select className={inputCls} value={tipoNafta} onChange={(e) => setTipoNafta(e.target.value as typeof tipoNafta)}>
                      <option value="nafta_super">Súper</option><option value="nafta_premium">Premium</option>
                    </select>
                  )}
                </Campo>}
                <Campo label="Consumo (L/100 km)" est={!!fuenteCons?.estimado} nota={notaConsumo}>
                  <Num value={consumoCalculado} step={0.1} onChange={setConsumo} />
                </Campo>
                <Campo label="Precio 0km ($)"><Num value={precio0km} onChange={setPrecio0km} /></Campo>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-2xl">Gastos fijos</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Seguro mensual mín." est nota="Terceros completo. Ajustalo con tu cotización.">
                  <Num value={seguroMin} onChange={setSeguroMin} />
                </Campo>
                <Campo label="Seguro mensual máx." est><Num value={seguroMax} onChange={setSeguroMax} /></Campo>
                <Campo label={modelo?.serviceEstimado ? "Service mín." : "Costo de service"} est={!!modelo?.serviceEstimado}
                  nota={modelo?.primerServiceBonificado ? "El 1er service viene bonificado (no se descuenta del cálculo anual)." : null}>
                  <Num value={serviceMin} onChange={(n) => { setServiceMin(n); if (!modelo?.serviceEstimado) setServiceMax(n); }} />
                </Campo>
                {modelo?.serviceEstimado ? (
                  <Campo label="Service máx." est><Num value={serviceMax} onChange={setServiceMax} /></Campo>
                ) : (
                  <Campo label="Service cada (km)"><Num value={intervaloKm} step={1000} onChange={setIntervaloKm} /></Campo>
                )}
                {modelo?.serviceEstimado && (
                  <Campo label="Service cada (km)"><Num value={intervaloKm} step={1000} onChange={setIntervaloKm} /></Campo>
                )}
                <Campo label="Patente ($)" est={patenteEstimada} nota={<>
                  ARBA 2026 (PBA): escala progresiva sobre el precio 0km como aproximación de la valuación fiscal. El monto queda editable.
                  <span className="mt-1 block">Estimación anual: {ars(patenteAnualEstimada)}.</span>
                </>}>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1"><Num value={patente} onChange={setPatenteManual} ariaLabel="Patente ($)" /></div>
                    <select aria-label="Frecuencia de patente" className={`${inputCls.replace("w-full", "w-28")} shrink-0`} value={patenteFrec} onChange={(e) => {
                      const frecuencia = e.target.value as typeof patenteFrec;
                      if (patenteManual !== null) setPatenteManual(patenteManual * (patenteFrec === "mensual" ? 12 : 6) / (frecuencia === "mensual" ? 12 : 6));
                      setPatenteFrec(frecuencia);
                    }}>
                      <option value="mensual">mensual</option><option value="bimestral">bimestral</option>
                    </select>
                  </div>
                </Campo>
                <Campo label="VTV anual ($)" nota="Referencia oct-2026, editable.">
                  <div className="flex gap-2">
                    <select aria-label="Jurisdicción de la VTV" className={`${inputCls} w-28`} value={vtvJur} onChange={(e) => { const j = e.target.value as "PBA" | "CABA"; setVtvJur(j); setVtv(VTV_REF[j]); }}>
                      <option>PBA</option><option>CABA</option>
                    </select>
                    <Num value={vtv} onChange={setVtv} ariaLabel="VTV anual ($)" />
                  </div>
                </Campo>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-2xl">Uso y extras</h2>
              <Campo label={`Kilómetros por año: ${kmAnio.toLocaleString("es-AR")} km`}>
                <input type="range" min={1000} max={60000} step={1000} value={kmAnio} onChange={(e) => setKmAnio(Number(e.target.value))} className="w-full accent-primary" />
              </Campo>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Campo label="Cochera mensual"><Num value={cochera} onChange={setCochera} /></Campo>
                <Campo label="Otros gastos/mes"><Num value={otros} onChange={setOtros} /></Campo>
                <Campo label="Cuota financiación"><Num value={cuota} onChange={setCuota} /></Campo>
              </div>
            </Card>
          </div>

          {/* Resultados */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <div ref={tarjetaRef} id="resultado" className="scroll-mt-4">
            <Card className="bg-primary text-primary-foreground">
              <p className="text-sm opacity-80">Mantener {nombreAuto} te sale</p>
              <p className="mt-1 min-h-[2.5em] font-display text-4xl leading-tight">
                {faltaDato ? <span className="text-2xl">{avisoFalta}</span> : <>
                  entre {ars(r.mensualMin)} y {ars(r.mensualMax)} <span className="text-lg font-medium opacity-80">por mes</span>
                </>}
              </p>
              <p className="mt-2 text-sm opacity-80">{faltaDato ? "—" : `${ars(r.anualMin)} – ${ars(r.anualMax)} al año`}</p>
              <div className="mt-5 rounded-sm bg-highlight p-4 text-highlight-foreground">
                <p className="text-xs font-bold uppercase tracking-wide">Costo por km</p>
                <p className="font-display text-3xl">{faltaDato ? "—" : `${ars(r.kmMin)} – ${ars(r.kmMax)}`}</p>
              </div>
              <button onClick={compartir} disabled={faltaDato} className="mt-5 w-full rounded-md border border-primary-foreground/30 px-4 py-2 text-sm font-medium transition hover:bg-primary-foreground/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent">
                {copiado ? "¡Copiado al portapapeles!" : "Compartir mi resultado"}
              </button>
            </Card>
            </div>

          <Card>
            <h2 className="text-xl">Costo único de compra: patentamiento</h2>
            <p className="mt-1 text-sm text-muted-foreground">No entra en el costo mensual ni por km.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo label="Provincia" nota="Cambia solo los sellos. La patente de arriba se estima con ARBA (PBA).">
                <select aria-label="Provincia" className={inputCls} value={provincia} onChange={(e) => setProvincia(e.target.value)}>
                  {SELLOS.map((s) => <option key={s.provincia}>{s.provincia}</option>)}
                </select>
              </Campo>
              <Campo label="Origen">
                <select aria-label="Origen" className={inputCls} value={origen} onChange={(e) => setOrigen(e.target.value as Origen)}>
                  <option value="nacional">Nacional / Mercosur</option><option value="mexico">México</option><option value="importado">Importado</option>
                </select>
              </Campo>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" aria-label="Trámite digital (0,8%)" checked={digital} onChange={(e) => setDigital(e.target.checked)} className="accent-primary" />
                Trámite digital (0,8%)
              </label>
            </div>
            <dl className="mt-5 divide-y divide-border rounded-lg border border-border text-sm">
              <div className="flex justify-between p-3"><dt>Arancel registral ({digital ? "0,8" : "1"}% de {ars(precio0km)})</dt><dd className="tabular-nums">{ars(pat.arancel)}</dd></div>
              <div className="flex justify-between p-3"><dt>Sellos {provincia} ({sellosPct.toLocaleString("es-AR")}%)</dt><dd className="tabular-nums">{ars(pat.sellos)}</dd></div>
              <div className="flex justify-between p-3"><dt>Formulario 01 ({origen === "nacional" ? "Nacional/Mercosur" : "Importado"})</dt><dd className="tabular-nums">{ars(pat.formulario)}</dd></div>
              <div className="flex justify-between bg-muted p-3 font-bold"><dt>Total estimado</dt><dd className="tabular-nums">{ars(pat.total)}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">Alícuotas de sellos según fuente de {SELLOS[0]?.fecha}: verificar vigencia. El Formulario 01 cuesta $24.070 (nacional/Mercosur) o $43.370 (importado, México incluido).</p>
          </Card>

            <Card>
              <h3 className="mb-2 text-xl">Desglose anual (promedio)</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={torta} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2} isAnimationActive={false}>
                      {torta.map((d) => <Cell key={d.name} fill={COLORES[Object.keys(r.rubros).indexOf(d.name)]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => ars(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1 text-sm">
                {Object.entries(r.rubros).map(([k, [a, b]], i) => (
                  <li key={k} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORES[i] }} />{k}
                      {(k === "Seguro" || (k === "Patente" && patenteEstimada) || (k === "Service" && modelo?.serviceEstimado)) && <Estimado />}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{a === b ? ars(a) : `${ars(a)} – ${ars(b)}`}</span>
                  </li>
                ))}
              </ul>
              {combustible === "eléctrico" && <p className="mt-2 text-xs text-muted-foreground">{NOTA_ELECTRICO}</p>}
            </Card>

          </div>
        </section>

        <ComparadorModelos uso={{ kmAnio, vtvAnual: vtv, cochera, otros, cuota, precios }} />

            {g && (
              <Card>
                <h3 className="text-xl">¿Y a GNC?</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-muted p-3"><p className="text-muted-foreground">Nafta / km</p><p className="font-bold">{ars(g.kmNafta)}</p></div>
                  <div className="rounded-md bg-muted p-3"><p className="text-muted-foreground">GNC / km</p><p className="font-bold">{ars(g.kmGnc)}</p></div>
                </div>
                <div className="mt-3"><Campo label="Costo del equipo ($)"><Num value={equipoGnc} onChange={setEquipoGnc} ariaLabel="Costo del equipo GNC ($)" /></Campo></div>
                <p className="mt-3 text-sm">
                  Ahorrás ~{ars(g.ahorroMes)}/mes: recuperás el equipo en{" "}
                  <strong>{Number.isFinite(g.meses) ? `${Math.ceil(g.meses)} meses` : "—"}</strong>.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Supone 1 m³ de GNC ≈ 1 L de nafta.</p>
              </Card>
            )}

        {/* 3. Precios de referencia */}
        <section>
          <h2 className="text-3xl">Precios de combustible de referencia</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Valor más alto observado entre las principales estaciones de servicio de CABA (YPF, Shell, Axion y Puma), actualizado el {FECHA_PRECIOS.split("-").reverse().join("/")}. Varían por provincia y por estación: cargá tu precio local.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {COMBUSTIBLES.map((c) => (
                  <tr key={c.clave}>
                    <td className="p-3 font-medium">{c.nombre}</td>
                    <td className="p-3"><div className="ml-auto w-36"><Num value={precios[c.clave] ?? 0} onChange={(n) => setPrecios((p) => ({ ...p, [c.clave]: n }))} ariaLabel={`Precio ${c.nombre} ($/${c.unidad})`} /></div></td>
                    <td className="w-16 p-3 text-muted-foreground">{c.unidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Cómo lo calculamos */}
        <section className="space-y-3">
          <h2 className="text-3xl">Cómo lo calculamos</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
            <li><strong>Combustible anual</strong> = (km por año ÷ 100) × consumo × precio por litro.</li>
            <li><strong>Service anual</strong> = (km por año ÷ intervalo de service) × costo del service. Cuando no hay precio oficial publicado lo marcamos <Estimado />: en la mayoría de esos casos es un rango calculado sobre el 0,75% del precio 0km por service, y en algunos se ancla en un modelo hermano de la marca.</li>
            <li><strong>Seguro</strong> <Estimado />: rango orientativo de terceros completo, con una regla calibrada con cotizaciones de prensa (se recotiza cada trimestre).</li>
            <li><strong>Patente, VTV, cochera, cuota y otros</strong>: pasados a valor anual.</li>
            <li><strong>Rango total</strong>: el mínimo suma todos los mínimos; el máximo suma todos los máximos. El costo por km es ese total dividido por los km anuales.</li>
            <li>Los valores de precio, consumo, seguro y service corresponden a la versión elegida: cada versión tiene sus propios datos.</li>
            <li>Autos eléctricos: el consumo de combustible es 0 y no se pondera. El costo de la carga eléctrica no está incluido en el resultado porque varía según la tarifa, el tipo de carga y el uso de cada persona.</li>
            <li>Datos de referencia: noviembre 2026.</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Fuentes: consumo de cada versión según su propia fuente (homologado IRAM/AITA, WLTP, EPA, Inmetro, Chile MTT, medido en pruebas o estimado con ancla), indicada debajo del campo de consumo; service de concesionario oficial o estimado (0,75% del precio o anclado en hermano de marca); combustibles: se toma el valor más alto observado entre las principales estaciones de servicio de CABA (YPF, Shell, Axion y Puma) (precio vigente de cada estación) según datos oficiales de la Secretaría de Energía, Res. 314/2016, para no subestimar el gasto; el GNC sigue el mismo criterio; seguro con regla calibrada (recotización trimestral).
          </p>
        </section>

        {/* 6. FAQ */}
        <section>
          <h2 className="mb-3 text-3xl">Preguntas frecuentes</h2>
          {[
            ["¿Cuánto cuesta mantener un auto por mes en Argentina?", "Depende del modelo y de cuánto manejes. Para un 0km chico manejando 15.000 km al año, sumando combustible, seguro, patente, VTV y service, el costo suele ir de varios cientos de miles de pesos por mes. Elegí tu modelo arriba para ver tu rango."],
            ["¿Cómo se calcula el costo por kilómetro?", "Sumamos todos los gastos del año (fijos y variables) y los dividimos por los kilómetros que hacés en ese año. Por eso, cuanto más manejás, más se diluyen los gastos fijos."],
            ["¿Conviene pasar el auto a GNC?", "Si manejás mucho, el ahorro por km suele recuperar el equipo en pocos meses. Usá el comparador \"¿Y a GNC?\" con tu costo de instalación real. Solo se ofrece para autos a nafta: no aplica a diésel ni a eléctricos, y en híbridos no es habitual."],
          ].map(([q, a]) => (
            <details key={q} className="border-b border-border py-3">
              <summary className="cursor-pointer font-medium">{q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </section>
      </main>

      {/* Resultado fijo abajo: solo en pantallas chicas y mientras la tarjeta no se ve */}
      {!tarjetaVisible && (
        <a href="#resultado" className="fixed inset-x-0 bottom-0 z-30 flex items-baseline justify-between gap-3 border-t border-primary-foreground/20 bg-primary px-5 py-3 text-primary-foreground lg:hidden">
          <span className="text-xs opacity-80">{faltaDato ? "Resultado" : "Por mes"}</span>
          <span className={faltaDato ? "text-sm" : "font-display text-xl tabular-nums"}>{faltaDato ? avisoFalta : `${ars(r.mensualMin)} – ${ars(r.mensualMax)}`}</span>
        </a>
      )}

      {/* 8. Footer */}
      <footer className="border-t border-border bg-secondary">
        <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-muted-foreground">
          <p>Valores orientativos, no una cotización. Precios de referencia actualizados a noviembre 2026.</p>
        </div>
      </footer>
    </div>
  );
}
