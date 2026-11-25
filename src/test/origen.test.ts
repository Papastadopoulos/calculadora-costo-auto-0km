import { describe, expect, it } from "vitest";
import { MODELOS, origenDe } from "@/lib/costos";

const buscar = (marca: string, modelo: string, version = "") =>
  MODELOS.find((m) => m.marca === marca && m.modelo === modelo && m.version.includes(version));

describe("origen de fabricación por modelo", () => {
  it("nacional, Brasil, México e importado según la tabla con fuente", () => {
    expect(origenDe(buscar("Fiat", "Cronos")!)).toEqual({ origen: "nacional", pais: "Argentina" });
    expect(origenDe(buscar("Toyota", "Yaris")!)?.pais).toBe("Brasil");
    expect(origenDe(buscar("Volkswagen", "Taos")!)?.origen).toBe("mexico");
    expect(origenDe(buscar("Mercedes-Benz", "GLA 200")!)?.origen).toBe("importado");
  });
  it("la Ranger Raptor es importada aunque la Ranger sea nacional", () => {
    expect(origenDe(buscar("Ford", "Ranger", "RAPTOR")!)?.origen).toBe("importado");
    expect(origenDe(MODELOS.find((m) => m.modelo === "Ranger" && !m.version.includes("RAPTOR"))!)?.origen).toBe("nacional");
  });
  it("sin fuente no hay origen", () => {
    expect(origenDe({ marca: "Otra", modelo: "Sin tabla", version: "X" })).toBeNull();
    // El Jimny 5 puertas viene de India y el de 3 puertas de Japón.
    expect(origenDe(buscar("Suzuki", "Jimny", "5P")!)?.pais).toBe("India");
    expect(origenDe(buscar("Suzuki", "Jimny", "3P")!)?.pais).toBe("Japón");
  });
  it("todos los modelos de la base tienen origen con fuente", () => {
    expect(MODELOS.filter((m) => !origenDe(m)).map((m) => `${m.marca} ${m.modelo}`)).toEqual([]);
  });
});
