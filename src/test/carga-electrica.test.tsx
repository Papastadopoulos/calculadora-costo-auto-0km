import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Route } from "@/routes/index";
import { MODELOS, ars } from "@/lib/costos";

afterEach(cleanup);

function elegirElectrico() {
  const Component = Route.options.component;
  if (!Component) throw new Error("Falta la calculadora");
  render(<Component />);
  const m = MODELOS.find((x) => x.combustible === "eléctrico");
  if (!m) throw new Error("No hay eléctricos en la base");
  fireEvent.change(screen.getByRole("combobox", { name: "Marca" }), { target: { value: m.marca } });
  fireEvent.change(screen.getByRole("combobox", { name: "Modelo" }), { target: { value: m.modelo } });
  fireEvent.change(screen.getByRole("combobox", { name: "Versión" }), { target: { value: m.id } });
  return m;
}

describe("carga eléctrica opcional", () => {
  it("sin datos, el resultado aclara que no incluye la carga", () => {
    elegirElectrico();
    expect(screen.queryByLabelText(/Consumo \(L\/100 km\)/)).toBeNull();
    expect(screen.getByText(/Sin el costo de carga eléctrica/)).toBeInTheDocument();
  });

  it("con un solo dato no suma nada", () => {
    elegirElectrico();
    fireEvent.change(screen.getByLabelText(/Consumo eléctrico/), { target: { value: "15" } });
    expect(screen.getByText(/Sin el costo de carga eléctrica/)).toBeInTheDocument();
    expect(screen.queryByText("Carga eléctrica")).toBeNull();
  });

  it("con consumo y precio del kWh suma la carga: 15.000 km × 15 kWh/100 km × $200", () => {
    elegirElectrico();
    fireEvent.change(screen.getByLabelText(/Consumo eléctrico/), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText(/Precio del kWh/), { target: { value: "200" } });
    expect(screen.getByText(/Incluye la carga eléctrica/)).toBeInTheDocument();
    expect(screen.queryByText(/Sin el costo de carga eléctrica/)).toBeNull();
    const fila = screen.getByText("Carga eléctrica").closest("li");
    expect(fila?.textContent).toContain(ars(450000));
  });
});
