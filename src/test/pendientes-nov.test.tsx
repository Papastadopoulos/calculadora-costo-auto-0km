import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/index";
import { ComparadorModelos } from "@/components/comparador-modelos";
import { MODELOS, fuenteConsumo } from "@/lib/costos";

vi.mock("recharts", () => ({
  ResponsiveContainer: () => null, PieChart: () => null, Pie: () => null, Cell: () => null, Tooltip: () => null,
}));

afterEach(cleanup);

function abrir() {
  const Component = Route.options.component;
  if (!Component) throw new Error("Falta la calculadora");
  render(<Component />);
}
const elegir = (nombre: string, valor: string) =>
  fireEvent.change(screen.getAllByRole("combobox", { name: nombre })[0]!, { target: { value: valor } });

describe("resultado sin versión elegida", () => {
  it("no muestra un rango ni deja compartir hasta elegir versión", () => {
    abrir();
    elegir("Marca", "Toyota");
    expect(screen.getByText("Elegí una versión para ver el resultado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compartir mi resultado" })).toBeDisabled();
  });
  it("en Otro (manual) pide consumo y precio y no arrastra los datos del auto anterior", () => {
    abrir();
    elegir("Modelo", "otro");
    expect(screen.getByText("Cargá el consumo y el precio 0km para ver el resultado")).toBeInTheDocument();
    expect(screen.getByLabelText("Precio 0km ($)")).toHaveValue("0");
    fireEvent.change(screen.getByLabelText("Precio 0km ($)"), { target: { value: "30000000" } });
    fireEvent.change(screen.getByLabelText(/Consumo \(L\/100 km\)/), { target: { value: "7" } });
    expect(screen.getByRole("button", { name: "Compartir mi resultado" })).toBeEnabled();
  });
});

describe("fuente del consumo por versión", () => {
  it("toma el ciclo de la columna fuente, sin fijar IRAM/AITA", () => {
    expect(fuenteConsumo("consumo: homologado IRAM/AITA (etiqueta oficial). radiohache")?.texto).toBe("homologado IRAM/AITA (etiqueta oficial)");
    expect(fuenteConsumo("CCA oct-2026; consumo: fábrica (WLTP, punto medio de 12,0–12,7). Porsche")?.texto).toBe("fábrica (WLTP, punto medio de 12,0–12,7)");
    expect(fuenteConsumo("x; consumo: homologado IRAM/AITA. motor distinto; consumo [ESTIMADO] igual al del modelo, a verificar")?.estimado).toBe(true);
  });
  it("ignora el texto viejo guardado después de ANTERIOR:", () => {
    const f = "consumo: homologado IRAM/AITA 10274-2, ciclo mixto 5,8 (urbano 7,5 / extraurbano 4,8). Etiqueta oficial: toyota.com.ar. | ANTERIOR: x; consumo [ESTIMADO] igual al del modelo, a verificar";
    expect(fuenteConsumo(f)).toEqual({ texto: "homologado IRAM/AITA 10274-2, ciclo mixto 5,8 (urbano 7,5 / extraurbano 4,8)", estimado: false });
  });
  it("ninguna fila corregida con etiqueta muestra el aviso de consumo copiado", () => {
    const corregidas = MODELOS.filter((m) => m.fuente.includes("ANTERIOR:"));
    expect(corregidas.length).toBeGreaterThan(0);
    expect(corregidas.filter((m) => fuenteConsumo(m.fuente)?.estimado)).toEqual([]);
  });
  it("todas las versiones no eléctricas tienen una fuente de consumo para mostrar", () => {
    expect(MODELOS.filter((m) => m.combustible !== "eléctrico" && !fuenteConsumo(m.fuente))).toEqual([]);
  });
});

describe("comparador con eléctrico", () => {
  it("no declara ganador del total ni del costo por km", () => {
    const electrico = MODELOS.find((m) => m.combustible === "eléctrico");
    if (!electrico) throw new Error("Falta eléctrico");
    render(<ComparadorModelos uso={{ kmAnio: 15000, precios: { nafta_super: 2000, nafta_premium: 2300, gasoil: 1400, gasoil_premium: 1500 }, vtvAnual: 114106, cochera: 0, otros: 0, cuota: 0 }} />);
    fireEvent.change(screen.getByLabelText("Marca Modelo A"), { target: { value: electrico.marca } });
    fireEvent.change(screen.getByLabelText("Modelo Modelo A"), { target: { value: electrico.modelo } });
    const version = screen.getByLabelText("Versión Modelo A") as HTMLSelectElement;
    if (!version.value) fireEvent.change(version, { target: { value: electrico.id } });
    for (const nombre of [/Total mensual/, /Costo por km/]) {
      const fila = screen.getByRole("row", { name: nombre });
      expect(within(fila).queryByText("Menor promedio")).not.toBeInTheDocument();
    }
    expect(within(screen.getByRole("row", { name: /Total mensual/ })).getByText("Sin costo de carga")).toBeInTheDocument();
  });
});

describe("eléctricos: el resultado avisa que falta la carga", () => {
  const electrico = MODELOS.find((m) => m.combustible === "eléctrico");
  const aviso = "Sin el costo de carga eléctrica, que no se puede calcular de forma única.";
  it("muestra el aviso en la tarjeta con un eléctrico y no con un naftero", () => {
    if (!electrico) throw new Error("Falta eléctrico");
    abrir();
    expect(screen.queryByText(aviso)).not.toBeInTheDocument();
    elegir("Marca", electrico.marca);
    elegir("Modelo", electrico.modelo);
    const version = screen.getAllByRole("combobox", { name: "Versión" })[0] as HTMLSelectElement;
    if (!version.value) fireEvent.change(version, { target: { value: electrico.id } });
    expect(screen.getByText(aviso)).toBeInTheDocument();
  });  it("la barra fija del celular dice que falta la carga", () => {
    if (!electrico) throw new Error("Falta eléctrico");
    // La tarjeta del resultado fuera de la pantalla: aparece la barra fija.
    vi.stubGlobal("IntersectionObserver", class {
      constructor(private cb: (e: { isIntersecting: boolean }[]) => void) {}
      observe() { this.cb([{ isIntersecting: false }]); }
      disconnect() {}
    });
    abrir();
    elegir("Marca", electrico.marca);
    elegir("Modelo", electrico.modelo);
    const version = screen.getAllByRole("combobox", { name: "Versión" })[0] as HTMLSelectElement;
    if (!version.value) fireEvent.change(version, { target: { value: electrico.id } });
    expect(screen.getByText("Por mes, sin carga eléctrica")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe("comparador con rangos superpuestos", () => {
  it("Cronos contra 208: no resalta el total mensual y dice que está dentro del margen", () => {
    render(<ComparadorModelos uso={{ kmAnio: 15000, precios: { nafta_super: 2239, nafta_premium: 2522, gasoil: 2399, gasoil_premium: 2719 }, vtvAnual: 114106, cochera: 0, otros: 0, cuota: 0 }} />);
    const fila = screen.getByRole("row", { name: /Total mensual/ });
    expect(within(fila).queryByText("Menor promedio")).not.toBeInTheDocument();
    expect(within(fila).getAllByText("Diferencia dentro del margen")).toHaveLength(2);
  });
});
