import { describe, it, expect } from "vitest";
import { inicialMayuscula, MODELOS, MARCAS, modelosDeMarca, versionesDeModelo, parseCsv, COMBUSTIBLES, SELLOS, calcular, patentamiento, estimarPatenteArba, calcularModeloComparado, masBarato } from "./costos";
import matrizCsv from "@/data/base-modelos.csv?raw";

describe("costos", () => {
  it("conserva todos los valores de las 754 filas del archivo", () => {
    const filas = parseCsv(matrizCsv);
    expect(filas).toHaveLength(754);
    filas.forEach((fila, i) => {
      const modelo = MODELOS[i];
      if (!modelo) throw new Error(`Falta fila ${i}`);
      expect(modelo.marca.toLowerCase()).toBe(fila["marca"]?.toLowerCase());
      expect(modelo.modelo.toLowerCase()).toBe(fila["modelo"]?.toLowerCase());
      expect(modelo.version).toBe(fila["version"]);
      expect(modelo.combustible).toBe(fila["combustible"]);
      expect(modelo.consumo).toBe(Number(fila["consumo_mixto_l_100km"]));
      expect(modelo.precio0km).toBe(Number(fila["precio_0km_ref_ARS"]));
      expect(modelo.seguroMin).toBe(Number(fila["seguro_mensual_min_ARS"]));
      expect(modelo.seguroMax).toBe(Number(fila["seguro_mensual_max_ARS"]));
      expect(modelo.service).toBe(Number(fila["service_10k_ref_ARS"]));
      expect(modelo.fuente).toBe(fila["fuente"]);
      expect(modelo.fechaActualizacion).toBe(fila["fecha_actualizacion"]);
      expect(versionesDeModelo(modelo.marca, modelo.modelo).some((m) => m.id === modelo.id)).toBe(true);
    });
  });
  it("carga 754 versiones, 54 marcas unificadas, 311 modelos y 24 provincias", () => {
    expect(MODELOS).toHaveLength(754);
    expect(MARCAS).toHaveLength(54);
    expect(MARCAS.reduce((total, marca) => total + modelosDeMarca(marca).length, 0)).toBe(311);
    expect(new Set(MODELOS.map((m) => m.id)).size).toBe(754);
    expect(SELLOS).toHaveLength(24);
    expect(COMBUSTIBLES.find((c) => c.clave === "gnc")?.precio).toBe(680);
  });
  it.each(["Fiat", "Peugeot", "Chevrolet", "Volkswagen", "Toyota", "Renault", "Nissan", "Ford", "Jeep", "Honda", "Hyundai", "Kia", "Chery"])("reúne todas las filas de %s sin duplicar su marca", (marca) => {
    const filas = parseCsv(matrizCsv).filter((f) => f["marca"]?.toLowerCase() === marca.toLowerCase());
    expect(MARCAS).toContain(marca);
    expect(MARCAS).not.toContain(marca.toUpperCase());
    expect(MODELOS.filter((m) => m.marca === marca)).toHaveLength(filas.length);
    expect(modelosDeMarca(marca)).toEqual([...new Set(filas.map((f) => f["modelo"]))].sort((a, b) => (a ?? "").localeCompare(b ?? "", "es-AR")));
    for (const fila of filas) {
      expect(versionesDeModelo(marca, fila["modelo"] ?? "").some((m) => m.version === fila["version"] && m.precio0km === Number(fila["precio_0km_ref_ARS"]))).toBe(true);
    }
  });
  it("ninguna marca ni modelo queda todo en mayúsculas", () => {
    expect(inicialMayuscula("MERCEDES-BENZ")).toBe("Mercedes-Benz");
    expect(inicialMayuscula("HILUX SW4")).toBe("Hilux SW4");
    const mayus = (s: string) => /\p{L}{2,}/u.test(s.replace(/\S*\d\S*/g, "")) && s.replace(/\S*\d\S*/g, "") === s.replace(/\S*\d\S*/g, "").toUpperCase();
    expect(MARCAS.filter(mayus)).toEqual([]);
    expect([...new Set(MODELOS.map((m) => m.modelo))].filter(mayus)).toEqual([]);
  });
  it("intervalos de service", () => {
    const i = (m: string) => MODELOS.find((x) => x.modelo === m)?.intervaloKm;
    expect(i("Ranger")).toBe(16000);
    expect(i("Polo")).toBe(15000);
    expect(i("Cronos")).toBe(10000);
  });
  it("combustible anual = km/100 × consumo × precio", () => {
    const r = calcular({ kmAnio: 15000, consumo: 8, precioLitro: 2000, seguroMin: 0, seguroMax: 0, serviceMin: 0, serviceMax: 0, intervaloKm: 10000, patente: 0, patenteFrecuencia: "mensual", vtvAnual: 0, cochera: 0, otros: 0, cuota: 0 });
    expect(r.rubros.Combustible[0]).toBe(2400000);
  });
  it("patentamiento 1% / 0,8% digital + Formulario 01 según origen", () => {
    expect(patentamiento(10_000_000, 2.5, false).total).toBe(374070);
    expect(patentamiento(10_000_000, 0, true).arancel).toBe(80000);
    expect(patentamiento(10_000_000, 2.5, false, "importado").formulario).toBe(43370);
    expect(patentamiento(10_000_000, 2.5, false, "mexico").formulario).toBe(43370);
    expect(
      patentamiento(10_000_000, 2.5, false, "importado").total -
      patentamiento(10_000_000, 2.5, false, "nacional").total
    ).toBe(19300);
  });
  it("extras mensuales suman ×1 al mes y ×12 al año (sin multiplicador fantasma)", () => {
    const base = { kmAnio: 15000, consumo: 8, precioLitro: 2000, seguroMin: 0, seguroMax: 0, serviceMin: 0, serviceMax: 0, intervaloKm: 10000, patente: 0, patenteFrecuencia: "mensual" as const, vtvAnual: 0, cochera: 0, otros: 0, cuota: 0 };
    const sin = calcular(base);
    const con = calcular({ ...base, otros: 50000 });
    expect(con.mensualMin - sin.mensualMin).toBe(50000);
    expect(con.rubros["Otros"]?.[0]).toBe(600000);
  });
});

describe("patente ARBA 2026", () => {
  it("hasta $14.100.000 aplica 1%", () => {
    expect(estimarPatenteArba(10_000_000)).toBe(100_000);
    expect(estimarPatenteArba(14_100_000)).toBe(141_000);
  });
  it("hasta $18.700.000 aplica $141.000 + 2% del excedente", () => {
    expect(estimarPatenteArba(15_100_000)).toBe(161_000);
    expect(estimarPatenteArba(18_700_000)).toBe(233_000);
  });
  it("hasta $26.100.000 aplica $233.000 + 3% del excedente", () => {
    expect(estimarPatenteArba(19_700_000)).toBe(263_000);
    expect(estimarPatenteArba(26_100_000)).toBe(455_000);
  });
  it("hasta $53.900.000 aplica $455.000 + 4% del excedente", () => {
    expect(estimarPatenteArba(42_870_000)).toBe(1_125_800);
    expect(estimarPatenteArba(53_900_000)).toBe(1_567_000);
  });
  it("más de $53.900.000 aplica $1.567.000 + 4,5% del excedente", () => {
    expect(estimarPatenteArba(56_180_000)).toBe(1_669_600);
    expect(estimarPatenteArba(54_900_000)).toBe(1_612_000);
  });
  it("conserva el costo anual al prorratear por mes o bimestre", () => {
    const base = { kmAnio: 15000, consumo: 0, precioLitro: 0, seguroMin: 0, seguroMax: 0, serviceMin: 0, serviceMax: 0, intervaloKm: 10000, vtvAnual: 0, cochera: 0, otros: 0, cuota: 0 };
    const anual = estimarPatenteArba(42_870_000);
    expect(calcular({ ...base, patente: anual / 6, patenteFrecuencia: "bimestral" }).rubros["Patente"]).toEqual([1_125_800, 1_125_800]);
    expect(calcular({ ...base, patente: anual / 12, patenteFrecuencia: "mensual" }).anualMin).toBe(1_125_800);
  });
});

describe("comparador de modelos", () => {
  it("calcula la fila de la versión elegida y no otra del mismo modelo", () => {
    const version = versionesDeModelo("Fiat", "Cronos").find((m) => m.version === "4P 1,3 LIKE GSE 2025");
    if (!version) throw new Error("Falta la versión");
    const resultado = calcularModeloComparado(version, { kmAnio: 15000, precioNafta: 2000, precioGasoil: 1500, vtvAnual: 0, cochera: 0, otros: 0, cuota: 0 });
    expect(version.precio0km).toBe(35100000);
    expect(resultado.rubros["Seguro"]).toEqual([840000, 1260000]);
    expect(resultado.rubros["Patente"]?.[0]).toBe(815000);
  });
  it("los eléctricos tienen combustible cero sin eliminar los demás costos", () => {
    const electricos = MODELOS.filter((m) => m.combustible === "eléctrico");
    expect(electricos).toHaveLength(28);
    for (const modelo of electricos) {
      const resultado = calcularModeloComparado({ ...modelo, consumo: 100 }, { kmAnio: 15000, precioNafta: 2000, precioGasoil: 1500, vtvAnual: 114106, cochera: 0, otros: 0, cuota: 0 });
      expect(resultado.rubros.Combustible).toEqual([0, 0]);
      expect(resultado.rubros["VTV"]).toEqual([114106, 114106]);
      expect(resultado.rubros["Seguro"]).toEqual([modelo.seguroMin * 12, modelo.seguroMax * 12]);
      expect(resultado.rubros["Patente"]?.[0]).toBe(estimarPatenteArba(modelo.precio0km));
    }
  });
  it("usa consumo, seguro, service y valuación propios de cada modelo", () => {
    const cronos = MODELOS.find((m) => m.modelo === "Cronos");
    const hilux = MODELOS.find((m) => m.modelo === "Hilux");
    if (!cronos || !hilux) throw new Error("Faltan modelos de prueba");
    const uso = { kmAnio: 15000, precioNafta: 2000, precioGasoil: 1500, vtvAnual: 120000, cochera: 10000, otros: 50000, cuota: 0 };
    const a = calcularModeloComparado(cronos, uso);
    const b = calcularModeloComparado(hilux, uso);
    expect(a.rubros.Combustible[0]).toBeCloseTo(2_610_000);
    expect(b.rubros.Combustible[0]).toBeCloseTo(1_777_500);
    expect(a.rubros["Seguro"]).toEqual([1_020_000, 1_710_000]);
    expect(a.rubros["Service"]).toEqual([651_000, 651_000]);
    expect(a.rubros["Patente"]?.[0]).toBe(1_125_800);
    expect(a.rubros["Otros"]).toEqual(b.rubros["Otros"]);
    expect(a.kmMin).toBe(a.anualMin / 15000);
    expect(a.mensualMax).toBe(a.anualMax / 12);
  });
  it("resalta el promedio menor de cada fila y deja empates sin ganador", () => {
    expect(masBarato([100, 200], [140, 180])).toBe("a");
    expect(masBarato([200, 300], [100, 180])).toBe("b");
    expect(masBarato([100, 200], [150, 150])).toBeNull();
  });
});
