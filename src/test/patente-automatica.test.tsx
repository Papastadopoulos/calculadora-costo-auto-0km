import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/index";

vi.mock("recharts", () => ({
  ResponsiveContainer: () => null,
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
}));

afterEach(cleanup);

function abrirCalculadora() {
  const Component = Route.options.component;
  if (!Component) throw new Error("Falta la calculadora");
  render(<Component />);
  return screen.getByLabelText(/Patente \(\$\)/);
}

describe("patente automática editable", () => {
  it("inicia con ARBA del Cronos prorrateada en seis bimestres", () => {
    const patente = abrirCalculadora();
    expect(patente).toHaveValue("187.633");
    fireEvent.change(screen.getByLabelText("Frecuencia de patente"), { target: { value: "mensual" } });
    expect(patente).toHaveValue("93.817");
  });

  it("recalcula al cambiar precio 0km y modelo", () => {
    const patente = abrirCalculadora();
    fireEvent.change(screen.getByLabelText("Precio 0km ($)"), { target: { value: "14100000" } });
    expect(patente).toHaveValue("23.500");
    fireEvent.change(screen.getByLabelText("Marca", { exact: true }), { target: { value: "Peugeot" } });
    fireEvent.change(screen.getByLabelText("Modelo", { exact: true }), { target: { value: "208" } });
    const opcion = screen.getByRole("option", { name: "5P 1,6 ALLURE TIPT6 2026 — $43.810.000" });
    fireEvent.change(screen.getByLabelText("Versión", { exact: true }), { target: { value: opcion.getAttribute("value") } });
    expect(patente).toHaveValue("193.900");
  });

  it("conserva la edición manual y su costo anual al cambiar frecuencia", () => {
    const patente = abrirCalculadora();
    fireEvent.change(patente, { target: { value: "60000" } });
    fireEvent.blur(patente);
    fireEvent.change(screen.getByLabelText("Precio 0km ($)"), { target: { value: "14100000" } });
    expect(patente).toHaveValue("60.000");
    fireEvent.change(screen.getByLabelText("Frecuencia de patente"), { target: { value: "mensual" } });
    expect(patente).toHaveValue("30.000");
  });
});