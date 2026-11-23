import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/index";
import { MODELOS } from "@/lib/costos";

vi.mock("recharts", () => ({
  ResponsiveContainer: () => null, PieChart: () => null, Pie: () => null, Cell: () => null, Tooltip: () => null,
}));
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

function abrir() {
  const Component = Route.options.component;
  if (!Component) throw new Error("Falta la calculadora");
  render(<Component />);
}

describe("buscador con errores de tipeo", () => {
  it("'corola' sugiere el Corolla y avisa que es aproximado", () => {
    abrir();
    fireEvent.change(screen.getAllByRole("combobox", { name: "Buscar auto" })[0]!, { target: { value: "corola" } });
    expect(screen.getByText("¿Quisiste decir…?")).toBeInTheDocument();
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toContain("Toyota Corolla");
  });
  it("'cronso' (dos letras invertidas) sugiere primero el Fiat Cronos", () => {
    abrir();
    fireEvent.change(screen.getAllByRole("combobox", { name: "Buscar auto" })[0]!, { target: { value: "cronso" } });
    expect(screen.getAllByRole("option")[0]!.textContent).toBe("Fiat Cronos");
  });
});

describe("link compartido", () => {
  it("abre con el auto y los km del link", () => {
    const hilux = MODELOS.find((m) => m.modelo === "Hilux")!;
    window.history.replaceState(null, "", `/?${new URLSearchParams({ marca: hilux.marca, modelo: hilux.modelo, version: hilux.version, km: "30000" })}`);
    abrir();
    expect(screen.getByText("Mantener Toyota Hilux te sale")).toBeInTheDocument();
    expect(screen.getByText("Kilómetros por año: 30.000 km")).toBeInTheDocument();
  });
  it("si la versión del link ya no existe, avisa y muestra el ejemplo", () => {
    window.history.replaceState(null, "", "/?marca=Toyota&modelo=Hilux&version=X&km=30000");
    abrir();
    expect(screen.getByText(/El auto del link ya no está en la base/)).toBeInTheDocument();
  });
  it("sin parámetros arranca con el auto de ejemplo", () => {
    abrir();
    expect(screen.getByText(/Ejemplo con un Fiat Cronos/)).toBeInTheDocument();
  });
});
