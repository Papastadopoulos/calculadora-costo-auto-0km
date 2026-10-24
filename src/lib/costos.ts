/**
 * Datos y fórmulas de la calculadora "¿Cuánto cuesta tu auto?".
 * Todos los valores salen de los CSV en src/data — no se inventa nada:
 * lo que no está en los CSV queda como campo manual para el usuario.
 */
import modelosCsv from "@/data/base-modelos.csv?raw";
import combustiblesCsv from "@/data/precios-combustibles.csv?raw";
import sellosCsv from "@/data/sellos-provincias.csv?raw";

/** Parser CSV mínimo con soporte de comillas dobles. */
export function parseCsv<K extends string = string>(text: string): Record<K, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v !== "")) rows.push(row);
  const [head = [], ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])) as Record<K, string>);
}

export type Combustible = "nafta" | "diésel" | "híbrido";

export interface Modelo {
  id: string;
  marca: string;
  modelo: string;
  version: string;
  combustible: Combustible;
  consumo: number;
  precio0km: number;
  seguroMin: number;
  seguroMax: number;
  service: number;
  serviceMin: number;
  serviceMax: number;
  serviceEstimado: boolean;
  intervaloKm: number;
  primerServiceBonificado: boolean;
  fuente: string;
}

const toNum = (s: string) => Number(s.replace(/\./g, "")) || 0;

/** Intervalo de service: 10.000 km salvo Ranger (16.000) y Polo/Nivus (15.000). */
function intervalo(modelo: string) {
  if (modelo === "Ranger") return 16000;
  if (modelo === "Polo" || modelo === "Nivus") return 15000;
  return 10000;
}

export const MODELOS: Modelo[] = parseCsv<"marca" | "modelo" | "version" | "combustible" | "consumo_mixto_l_100km" | "precio_0km_ref_ARS" | "seguro_mensual_min_ARS" | "seguro_mensual_max_ARS" | "service_10k_ref_ARS" | "fuente">(modelosCsv).map((r) => {
  const fuenteService = r.fuente.split("| seguro")[0] ?? "";
  const rango = fuenteService.match(/\[ESTIMADO\]\s*\$([\d.]+)-\$([\d.]+)/);
  const service = Number(r.service_10k_ref_ARS);
  return {
    id: `${r.marca} ${r.modelo}`,
    marca: r.marca,
    modelo: r.modelo,
    version: r.version,
    combustible: r.combustible as Combustible,
    consumo: Number(r.consumo_mixto_l_100km),
    precio0km: Number(r.precio_0km_ref_ARS),
    seguroMin: Number(r.seguro_mensual_min_ARS),
    seguroMax: Number(r.seguro_mensual_max_ARS),
    service,
    serviceMin: rango ? toNum(rango[1] ?? "") : service,
    serviceMax: rango ? toNum(rango[2] ?? "") : service,
    serviceEstimado: /\[ESTIMADO\]|\[EST\]/.test(fuenteService),
    intervaloKm: intervalo(r.modelo),
    primerServiceBonificado: r.modelo === "Nivus" || r.modelo === "Amarok",
    fuente: r.fuente,
  };
});

export interface PrecioCombustible { clave: string; nombre: string; precio: number; unidad: string; fecha: string; fuente: string }
const NOMBRES: Record<string, string> = {
  nafta_super: "Nafta súper", nafta_premium: "Nafta premium", gasoil: "Gasoil",
  gasoil_premium: "Gasoil premium", gnc: "GNC",
};
export const COMBUSTIBLES: PrecioCombustible[] = parseCsv<"combustible" | "precio_ARS" | "unidad" | "fuente" | "fecha">(combustiblesCsv).map((r) => ({
  clave: r.combustible, nombre: NOMBRES[r.combustible] ?? r.combustible,
  precio: Number(r.precio_ARS), unidad: r.unidad, fecha: r.fecha, fuente: r.fuente,
}));

export const SELLOS = parseCsv<"provincia" | "alicuota_sellos_pct" | "fecha">(sellosCsv).map((r) => ({
  provincia: r.provincia, pct: Number(r.alicuota_sellos_pct), fecha: r.fecha,
}));

/** VTV anual de referencia (oct-2026). */
export const VTV_REF = { PBA: 114106, CABA: 96968 };
export const EQUIPO_GNC_DEFAULT = 1500000;

export const ars = (n: number) =>
  "$" + Math.round(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });

export interface Entradas {
  kmAnio: number;
  consumo: number;
  precioLitro: number;
  seguroMin: number;
  seguroMax: number;
  serviceMin: number;
  serviceMax: number;
  intervaloKm: number;
  patente: number;
  patenteFrecuencia: "mensual" | "bimestral";
  vtvAnual: number;
  cochera: number;
  otros: number;
  cuota: number;
}

/** Costos anuales por rubro, cada uno como [mín, máx]. */
export function calcular(e: Entradas) {
  const combustible = (e.kmAnio / 100) * e.consumo * e.precioLitro;
  const services = e.intervaloKm > 0 ? e.kmAnio / e.intervaloKm : 0;
  const patenteAnual = e.patente * (e.patenteFrecuencia === "mensual" ? 12 : 6);
  const rubros = {
    Combustible: [combustible, combustible],
    Seguro: [e.seguroMin * 12, e.seguroMax * 12],
    Patente: [patenteAnual, patenteAnual],
    VTV: [e.vtvAnual, e.vtvAnual],
    Service: [services * e.serviceMin, services * e.serviceMax],
    Cochera: [e.cochera * 12, e.cochera * 12],
    Financiación: [e.cuota * 12, e.cuota * 12],
    Otros: [e.otros * 12, e.otros * 12],
  } satisfies Record<string, [number, number]> as Record<string, [number, number]> & { Combustible: [number, number] };
  const anualMin = Object.values(rubros).reduce((a, r) => a + r[0], 0);
  const anualMax = Object.values(rubros).reduce((a, r) => a + r[1], 0);
  return {
    rubros, anualMin, anualMax,
    mensualMin: anualMin / 12, mensualMax: anualMax / 12,
    kmMin: e.kmAnio ? anualMin / e.kmAnio : 0,
    kmMax: e.kmAnio ? anualMax / e.kmAnio : 0,
  };
}

export type Origen = "nacional" | "mexico" | "importado";

/** Formulario 01: $24.070 nacional/Mercosur vs $43.370 importado (México incluido). Fuente: elcerokm nov-2025. */
const FORMULARIO_01: Record<Origen, number> = { nacional: 24070, mexico: 43370, importado: 43370 };

/** Patentamiento: arancel 1% (0,8% digital) + sellos provinciales + Formulario 01 según origen. */
export function patentamiento(valor: number, sellosPct: number, digital: boolean, origen: Origen = "nacional") {
  const arancel = valor * (digital ? 0.008 : 0.01);
  const sellos = valor * (sellosPct / 100);
  const formulario = FORMULARIO_01[origen] ?? FORMULARIO_01.nacional;
  return { arancel, sellos, formulario, total: arancel + sellos + formulario };
}

/** GNC: m³ ≈ litros de nafta (equivalencia 1:1 simplificada). */
export function gnc(kmAnio: number, consumo: number, precioNafta: number, precioGnc: number, equipo: number) {
  const kmNafta = (consumo / 100) * precioNafta;
  const kmGnc = (consumo / 100) * precioGnc;
  const ahorroMes = ((kmNafta - kmGnc) * kmAnio) / 12;
  return { kmNafta, kmGnc, ahorroMes, meses: ahorroMes > 0 ? equipo / ahorroMes : Infinity };
}
