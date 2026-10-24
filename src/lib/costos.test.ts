import { describe, it, expect } from "vitest";
import { MODELOS, COMBUSTIBLES, SELLOS, calcular, patentamiento } from "./costos";

describe("costos", () => {
  it("carga 22 modelos y 24 provincias", () => {
    expect(MODELOS).toHaveLength(22);
    expect(SELLOS).toHaveLength(24);
    expect(COMBUSTIBLES.find((c) => c.clave === "gnc")?.precio).toBe(680);
  });
  it("intervalos de service", () => {
    const i = (m: string) => MODELOS.find((x) => x.modelo === m)!.intervaloKm;
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
