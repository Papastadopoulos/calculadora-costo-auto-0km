import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Route } from "@/routes/index";
import { MODELOS, ars, consumoElectricoDe } from "@/lib/costos";

afterEach(cleanup);

function elegir(marca: string, modelo: string, version: string) {
  const Component = Route.options.component;
  if (!Component) throw new Error("Falta la calculadora");
  render(<Component />);
  const m = MODELOS.find((x) => x.marca === marca && x.modelo === modelo && x.version === version);
  if (!m) throw new Error(`No está en la base: ${marca} ${modelo} ${version}`);
  fireEvent.change(screen.getByRole("combobox", { name: "Marca" }), { target: { value: m.marca } });
  fireEvent.change(screen.getByRole("combobox", { name: "Modelo" }), { target: { value: m.modelo } });
  fireEvent.change(screen.getByRole("combobox", { name: "Versión" }), { target: { value: m.id } });
}

describe("consumo eléctrico de fábrica", () => {
  it("cada fila apunta a un eléctrico de la base y tiene fuente", () => {
    const electricos = MODELOS.filter((m) => m.combustible === "eléctrico");
    const conDato = electricos.filter((m) => consumoElectricoDe(m));
    expect(conDato.length).toBeGreaterThanOrEqual(25);
    for (const m of conDato) expect(consumoElectricoDe(m)!.kwh).toBeGreaterThan(5);
    expect(consumoElectricoDe(MODELOS.find((m) => m.combustible === "nafta")!)).toBeNull();
  });

  it("al elegir un eléctrico con dato, el consumo se completa solo con su fuente", () => {
    elegir("Volvo", "EX30", "51kWh CORE");
    expect(screen.getByLabelText(/Consumo eléctrico/)).toHaveValue("17,2");
    expect(screen.getByText(/WLTP homologado/)).toBeInTheDocument();
    // Sin precio del kWh, la carga sigue afuera.
    expect(screen.getByText(/Sin el costo de carga eléctrica/)).toBeInTheDocument();
  });

  it("con el precio del kWh, la carga usa el consumo de fábrica: 15.000 km × 17,2 kWh/100 km × $200", () => {
    elegir("Volvo", "EX30", "51kWh CORE");
    fireEvent.change(screen.getByLabelText(/Precio del kWh/), { target: { value: "200" } });
    const fila = screen.getByText("Carga eléctrica").closest("li");
    expect(fila?.textContent).toContain(ars(516000));
  });

  it("sin dato de fábrica el campo queda vacío", () => {
    elegir("Jmev", "Easy 3", "EV");
    expect(screen.getByLabelText(/Consumo eléctrico/)).not.toHaveValue("17,2");
    expect(screen.getByText(/Opcional\. Lo dice la ficha/)).toBeInTheDocument();
  });
});
