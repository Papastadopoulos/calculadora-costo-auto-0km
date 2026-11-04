import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComparadorModelos } from "@/components/comparador-modelos";
import { SelectorVersion } from "@/components/selector-version";
import { MODELOS, modelosDeMarca, versionesDeModelo } from "@/lib/costos";

afterEach(cleanup);
const uso = { kmAnio: 15000, precioNafta: 2000, precioGasoil: 1500, vtvAnual: 114106, cochera: 0, otros: 0, cuota: 0 };
const elegir = (campo: string, valor: string) => fireEvent.change(screen.getByLabelText(campo), { target: { value: valor } });

describe("cascada de versiones", () => {
  it("resetea solo el lado cambiado, ofrece todos los modelos y usa la versión elegida", () => {
    render(<ComparadorModelos uso={uso} />);
    const versionB = (screen.getByLabelText("Versión Modelo B") as HTMLSelectElement).value;
    elegir("Marca Modelo A", "Mercedes-Benz");
    expect(screen.getByLabelText("Modelo Modelo A")).toHaveValue("");
    expect(screen.getByLabelText("Versión Modelo A")).toHaveValue("");
    expect(screen.getByLabelText("Versión Modelo B")).toHaveValue(versionB);
    const lista = screen.getByLabelText("Modelo Modelo A") as HTMLSelectElement;
    expect([...lista.options].filter((o) => o.value).map((o) => o.value)).toEqual(modelosDeMarca("Mercedes-Benz"));
    expect(lista.options.length).toBe(28);
    elegir("Marca Modelo A", "Fiat");
    elegir("Modelo Modelo A", "Cronos");
    expect(screen.getByLabelText("Versión Modelo A")).toHaveValue("");
    const version = versionesDeModelo("Fiat", "Cronos").find((m) => m.precio0km === 36650000);
    if (!version) throw new Error("Falta Cronos");
    elegir("Versión Modelo A", version.id);
    const fila = screen.getByRole("row", { name: /Seguro \/ mes/ });
    expect(within(fila).getAllByRole("cell")[0]?.textContent).toContain("$73.000 – $110.000");
    expect(screen.getByLabelText("Versión Modelo B")).toHaveValue(versionB);
    elegir("Modelo Modelo A", "Pulse");
    expect(screen.getByLabelText("Versión Modelo A")).toHaveValue("");
  });
  it("autoselecciona una versión única y no ofrece ingreso manual en el comparador", () => {
    const inicial = MODELOS[0];
    const unica = MODELOS.find((m) => versionesDeModelo(m.marca, m.modelo).length === 1);
    if (!inicial || !unica) throw new Error("Faltan datos");
    const cambio = vi.fn();
    render(<SelectorVersion inicial={inicial} onChange={cambio} />);
    elegir("Marca", unica.marca);
    elegir("Modelo", unica.modelo);
    expect(screen.getByLabelText("Versión")).toHaveValue(unica.id);
    expect(cambio).toHaveBeenLastCalledWith(unica, false);
    expect(screen.queryByRole("option", { name: "Otro (manual)" })).not.toBeInTheDocument();
  });
  it("muestra las versiones de la más barata a la más cara", () => {
    render(<SelectorVersion inicial={MODELOS[0]!} onChange={vi.fn()} />);
    elegir("Marca", "Fiat");
    elegir("Modelo", "Cronos");
    const precios = [...(screen.getByLabelText("Versión") as HTMLSelectElement).options].slice(1).map((o) => Number(o.text.split("$")[1]?.replace(/\./g, "")));
    expect(precios.length).toBeGreaterThan(1);
    expect(precios).toEqual([...precios].sort((a, b) => a - b));
  });
  it("busca modelos de cualquier marca, muestra sugerencias y al elegir completa marca y modelo", () => {
    render(<ComparadorModelos uso={uso} />);
    const versionB = (screen.getByLabelText("Versión Modelo B") as HTMLSelectElement).value;
    const buscador = screen.getByLabelText("Buscar auto Modelo A");
    fireEvent.focus(buscador);
    fireEvent.change(buscador, { target: { value: "crv" } });
    const sugerencias = screen.getByRole("listbox", { name: "Sugerencias Modelo A" });
    expect(within(sugerencias).getAllByRole("option").map((o) => o.textContent)).toEqual(["CR-V Honda"]);
    fireEvent.mouseDown(within(sugerencias).getByRole("option"));
    expect(screen.getByLabelText("Marca Modelo A")).toHaveValue("Honda");
    expect(screen.getByLabelText("Modelo Modelo A")).toHaveValue("CR-V");
    expect(screen.getByLabelText("Versión Modelo A")).toHaveValue("");
    expect(buscador).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Versión Modelo B")).toHaveValue(versionB);
    fireEvent.change(buscador, { target: { value: "toyota hilux" } });
    expect(within(screen.getByRole("listbox")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Hilux Toyota", "Hilux SW4 Toyota"]);
    fireEvent.keyDown(buscador, { key: "ArrowDown" });
    fireEvent.keyDown(buscador, { key: "Enter" });
    expect(screen.getByLabelText("Modelo Modelo A")).toHaveValue("Hilux SW4");
    fireEvent.change(buscador, { target: { value: "zzz" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("Ningún modelo coincide");
  });
});
