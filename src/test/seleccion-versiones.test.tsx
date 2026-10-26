import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComparadorModelos } from "@/components/comparador-modelos";
import { SelectorVersion } from "@/components/selector-version";
import { MODELOS, versionesDeModelo } from "@/lib/costos";

afterEach(cleanup);
const uso = { kmAnio: 15000, precioNafta: 2000, precioGasoil: 1500, vtvAnual: 114106, cochera: 0, otros: 0, cuota: 0 };
const elegir = (campo: string, valor: string) => fireEvent.change(screen.getByLabelText(campo), { target: { value: valor } });

describe("cascada de versiones", () => {
  it("resetea solo el lado cambiado, busca modelos y usa la versión elegida", () => {
    render(<ComparadorModelos uso={uso} />);
    const versionB = (screen.getByLabelText("Versión Modelo B") as HTMLSelectElement).value;
    elegir("Marca Modelo A", "Mercedes-Benz");
    expect(screen.getByLabelText("Modelo Modelo A")).toHaveValue("");
    expect(screen.getByLabelText("Versión Modelo A")).toHaveValue("");
    expect(screen.getByLabelText("Versión Modelo B")).toHaveValue(versionB);
    elegir("Modelo Modelo A", "GL");
    const buscador = screen.getByLabelText("Modelo Modelo A");
    const lista = document.getElementById(buscador.getAttribute("list") ?? "");
    if (!lista) throw new Error("Falta lista de modelos");
    expect(lista.querySelectorAll("option").length).toBeGreaterThan(0);
    expect([...lista.querySelectorAll("option")].every((o) => o.value.toLowerCase().includes("gl"))).toBe(true);
    elegir("Marca Modelo A", "Fiat");
    elegir("Modelo Modelo A", "Cronos");
    expect(screen.getByLabelText("Versión Modelo A")).toHaveValue("");
    const version = versionesDeModelo("Fiat", "Cronos").find((m) => m.precio0km === 35100000);
    if (!version) throw new Error("Falta Cronos");
    elegir("Versión Modelo A", version.id);
    const fila = screen.getByRole("row", { name: /Seguro \/ mes/ });
    expect(within(fila).getAllByRole("cell")[0]?.textContent).toContain("$70.000 – $105.000");
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
});