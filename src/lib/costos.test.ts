import { describe, it, expect } from "vitest";
import { inicialMayuscula, MODELOS, MARCAS, modelosDeMarca, versionesDeModelo, parseCsv, COMBUSTIBLES, SELLOS, calcular, patentamiento, estimarPatenteArba, calcularModeloComparado, masBarato } from "./costos";
import matrizCsv from "@/data/base-modelos.csv?raw";
import premiumCsv from "@/data/combustible-premium.csv?raw";

describe("costos", () => {
  it("conserva todos los valores de las 745 filas del archivo", () => {
    const filas = parseCsv(matrizCsv);
    expect(filas).toHaveLength(745);
    filas.forEach((fila, i) => {
      const modelo = MODELOS[i];
      if (!modelo) throw new Error(`Falta fila ${i}`);
      expect(modelo.marca.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()).toBe(fila["marca"]?.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase());
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
  it("carga 745 versiones, 53 marcas unificadas, 312 modelos y 24 provincias", () => {
    expect(MODELOS).toHaveLength(745);
    expect(MARCAS).toHaveLength(53);
    expect(MARCAS.reduce((total, marca) => total + modelosDeMarca(marca).length, 0)).toBe(312);
    expect(new Set(MODELOS.map((m) => m.id)).size).toBe(745);
    expect(SELLOS).toHaveLength(24);
    expect(COMBUSTIBLES.find((c) => c.clave === "gnc")?.precio).toBe(680);
  });
  it.each(["Fiat", "Peugeot", "Chevrolet", "Volkswagen", "Toyota", "Renault", "Nissan", "Ford", "Jeep", "Honda", "Hyundai", "Kia", "Chery"])("reúne todas las filas de %s sin duplicar su marca", (marca) => {
    const filas = parseCsv(matrizCsv).filter((f) => f["marca"]?.toLowerCase() === marca.toLowerCase());
    expect(MARCAS).toContain(marca);
    expect(MARCAS).not.toContain(marca.toUpperCase());
    expect(MODELOS.filter((m) => m.marca === marca)).toHaveLength(filas.length);
    expect(modelosDeMarca(marca).map((m) => m.toLowerCase())).toEqual([...new Set(filas.map((f) => (f["modelo"] ?? "").toLowerCase()))].sort((a, b) => a.localeCompare(b, "es-AR")));
    for (const fila of filas) {
      expect(versionesDeModelo(marca, modelosDeMarca(marca).find((m) => m.toLowerCase() === fila["modelo"]?.toLowerCase()) ?? "").some((m) => m.version === fila["version"] && m.precio0km === Number(fila["precio_0km_ref_ARS"]))).toBe(true);
    }
  });
  it("ninguna marca queda todo en mayúsculas y los modelos conservan sus siglas", () => {
    expect(inicialMayuscula("MERCEDES-BENZ")).toBe("Mercedes-Benz");
    expect(inicialMayuscula("HILUX SW4")).toBe("Hilux SW4");
    const mayus = (s: string) => /\p{L}{2,}/u.test(s.replace(/\S*\d\S*/g, "")) && s.replace(/\S*\d\S*/g, "") === s.replace(/\S*\d\S*/g, "").toUpperCase();
    expect(MARCAS.filter(mayus)).toEqual([]);
    const modelos = new Set(MODELOS.map((m) => m.modelo));
    for (const sigla of ["DS 3", "CR-V", "CLA 200", "HS", "ZS", "GR Yaris"]) expect(modelos).toContain(sigla);
    for (const mal of ["Ds 3", "Cr-V", "Cla 200", "Hs", "Zs", "Gr Yaris"]) expect(modelos).not.toContain(mal);
  });
  it("intervalos de service", () => {
    const i = (m: string) => MODELOS.find((x) => x.modelo === m)?.intervaloKm;
    expect(i("Ranger")).toBe(16000);
    expect(i("Polo")).toBe(15000);
    expect(i("Cronos")).toBe(10000);
    expect(MODELOS.filter((m) => m.marca === "Jeep").every((m) => m.intervaloKm === 12000)).toBe(true);
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
    const resultado = calcularModeloComparado(version, { kmAnio: 15000, precios: { nafta_super: 2000, nafta_premium: 2300, gasoil: 1400, gasoil_premium: 1500 }, vtvAnual: 0, cochera: 0, otros: 0, cuota: 0 });
    expect(version.precio0km).toBe(36650000);
    expect(resultado.rubros["Seguro"]).toEqual([876000, 1320000]);
    expect(resultado.rubros["Patente"]?.[0]).toBe(877000);
  });
  it("los eléctricos tienen combustible cero sin eliminar los demás costos", () => {
    const electricos = MODELOS.filter((m) => m.combustible === "eléctrico");
    expect(electricos).toHaveLength(30);
    for (const modelo of electricos) {
      const resultado = calcularModeloComparado({ ...modelo, consumo: 100 }, { kmAnio: 15000, precios: { nafta_super: 2000, nafta_premium: 2300, gasoil: 1400, gasoil_premium: 1500 }, vtvAnual: 114106, cochera: 0, otros: 0, cuota: 0 });
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
    const uso = { kmAnio: 15000, precios: { nafta_super: 2000, nafta_premium: 2300, gasoil: 1400, gasoil_premium: 1500 }, vtvAnual: 120000, cochera: 10000, otros: 50000, cuota: 0 };
    const a = calcularModeloComparado(cronos, uso);
    const b = calcularModeloComparado(hilux, uso);
    expect(a.rubros.Combustible[0]).toBeCloseTo(2_610_000);
    expect(b.rubros.Combustible[0]).toBeCloseTo(1_777_500);
    expect(a.rubros["Seguro"]).toEqual([1_020_000, 1_710_000]);
    expect(a.rubros["Service"]).toEqual([651_000, 651_000]);
    expect(a.rubros["Patente"]?.[0]).toBe(1_201_400);
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

describe("combustible predeterminado", () => {
  const premium = parseCsv<"marca" | "modelo" | "version" | "fuente" | "fecha_actualizacion">(premiumCsv);
  it("cada versión premium existe una sola vez en la base y tiene fuente y fecha", () => {
    const filas = parseCsv<"marca" | "modelo" | "version">(matrizCsv);
    expect(premium.length).toBe(92);
    for (const p of premium) {
      expect(filas.filter((f) => f.marca === p.marca && f.modelo === p.modelo && f.version === p.version)).toHaveLength(1);
      expect(p.fuente.length).toBeGreaterThan(20);
      expect(p.fecha_actualizacion).toBe("2026-11-04");
    }
    expect(MODELOS.filter((m) => m.combustiblePredeterminado === "nafta_premium")).toHaveLength(92);
  });
  it("diésel → gasoil premium, eléctrico → ninguno, resto súper", () => {
    for (const m of MODELOS) {
      if (m.combustible === "diésel") expect(m.combustiblePredeterminado).toBe("gasoil_premium");
      else if (m.combustible === "eléctrico") expect(m.combustiblePredeterminado).toBeNull();
      else expect(["nafta_super", "nafta_premium"]).toContain(m.combustiblePredeterminado);
    }
    expect(MODELOS.find((m) => m.modelo === "Cronos")?.combustiblePredeterminado).toBe("nafta_super");
    expect(MODELOS.filter((m) => m.marca === "Porsche" && m.combustible !== "eléctrico" && !m.modelo.startsWith("Macan")).every((m) => m.combustiblePredeterminado === "nafta_premium")).toBe(true);
  });
  it("el comparador usa el combustible de cada versión", () => {
    const precios = { nafta_super: 2000, nafta_premium: 2300, gasoil: 1400, gasoil_premium: 1500 };
    const gr = MODELOS.find((m) => m.modelo === "GR Yaris" || m.version.includes("1,6 T GR"));
    if (!gr) throw new Error("Falta GR Yaris");
    const r = calcularModeloComparado(gr, { kmAnio: 10000, precios, vtvAnual: 0, cochera: 0, otros: 0, cuota: 0 });
    expect(r.rubros.Combustible[0]).toBeCloseTo(100 * gr.consumo * 2300);
  });
});

describe("modelos bien distribuidos (corrección 4-nov-2026)", () => {
  it("cada versión está en su modelo y con su combustible", () => {
    expect(modelosDeMarca("Audi")).toEqual(expect.arrayContaining(["A6 Allroad", "S3", "S5"]));
    expect(modelosDeMarca("Audi")).not.toContain("Allroad");
    expect(modelosDeMarca("Audi")).not.toContain("S");
    expect(versionesDeModelo("Bmw", "M135").map((m) => m.version)).toEqual(["5P 2,0 T XDRIVE 8AT 2025"]);
    expect(modelosDeMarca("Bmw")).toEqual(expect.arrayContaining(["M340i", "M440i", "220i", "430i"]));
    expect(modelosDeMarca("Bmw")).not.toContain("135");
    expect(versionesDeModelo("Chevrolet", "Onix").every((m) => m.version.startsWith("5P"))).toBe(true);
    expect(modelosDeMarca("Gwm").some((m) => m.startsWith("Haval"))).toBe(false);
    expect(versionesDeModelo("Toyota", "Yaris").some((m) => m.version.includes("GR"))).toBe(false);
    expect(versionesDeModelo("Toyota", "GR Yaris")).toHaveLength(2);
    expect(MODELOS.filter((m) => m.modelo === "Sprinter").every((m) => m.combustible === "diésel")).toBe(true);
    expect(versionesDeModelo("Ford", "Mustang Mach-E")[0]?.combustible).toBe("eléctrico");
    expect(versionesDeModelo("Toyota", "bZ4X")[0]?.combustible).toBe("eléctrico");
    expect(modelosDeMarca("Toyota")).not.toContain("86");
    expect(versionesDeModelo("Toyota", "GR86")[0]?.combustiblePredeterminado).toBe("nafta_premium");
    expect(versionesDeModelo("Porsche", "Taycan Cross Turismo")[0]?.combustible).toBe("eléctrico");
  });
});
