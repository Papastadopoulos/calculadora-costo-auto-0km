import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/index";
import { MODELOS } from "@/lib/costos";

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
  it("muestra el consumo completo del archivo sin redondear 4,76 a 4,8", () => {
    abrirCalculadora();
    const version = MODELOS.find((m) => m.consumo === 4.76);
    if (!version) throw new Error("Falta versión de consumo 4,76");
    fireEvent.change(screen.getByRole("combobox", { name: "Marca" }), { target: { value: version.marca } });
    fireEvent.change(screen.getByRole("combobox", { name: "Modelo" }), { target: { value: version.modelo } });
    fireEvent.change(screen.getByRole("combobox", { name: "Versión" }), { target: { value: version.id } });
    expect(screen.getByLabelText(/Consumo \(L\/100 km\)/)).toHaveValue("4,76");
  });
  it("inicia con ARBA del Cronos prorrateada en seis bimestres", () => {
    const patente = abrirCalculadora();
    expect(patente).toHaveValue("200.233");
    fireEvent.change(screen.getByLabelText("Frecuencia de patente"), { target: { value: "mensual" } });
    expect(patente).toHaveValue("100.117");
  });

  it("recalcula al cambiar precio 0km y modelo", () => {
    const patente = abrirCalculadora();
    fireEvent.change(screen.getByLabelText("Precio 0km ($)"), { target: { value: "14100000" } });
    expect(patente).toHaveValue("23.500");
    fireEvent.change(screen.getByRole("combobox", { name: "Marca" }), { target: { value: "Peugeot" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Modelo" }), { target: { value: "208" } });
    const seleccion = screen.getByRole("combobox", { name: "Versión" });
    const opcion = [...(seleccion as HTMLSelectElement).options].find((o) => o.text === "5P 1,6 ALLURE TIPT6 2026 — $45.570.000");
    if (!opcion) throw new Error("Falta Peugeot 208");
    fireEvent.change(seleccion, { target: { value: opcion.value } });
    expect(patente).toHaveValue("205.633");
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