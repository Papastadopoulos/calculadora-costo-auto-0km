# ¿Cuánto te va a costar tu próximo auto?

Calculadora gratuita del **costo real de tener un auto 0km en Argentina**: cuánto
vas a gastar por mes y por kilómetro, antes de comprarlo.

👉 **Usala acá:** https://cuanto-te-va-a-costar-tu-proximo-auto.lovable.app

El precio de lista es solo el principio. Combustible, seguro, patente, VTV,
service, cochera y cuota suman todos los meses, y cambian mucho de un modelo a
otro. Esta página junta todo eso en un solo número para que compares con datos
y no a ojo.

## Para qué sirve

- **Antes de comprar:** ver cuánto te cuesta por mes mantener el auto que
  te gusta, no solo cuánto sale.
- **Para comparar:** poner dos modelos lado a lado con el mismo uso y ver
  cuál sale más caro mantener y por qué.
- **Para decidir el combustible:** ver si te conviene pasar a GNC según
  cuánto manejás y cuánto te cobran el equipo.
- **Para no llevarte sorpresas:** el patentamiento (arancel, sellos de tu
  provincia y formulario) se muestra aparte, como gasto único de compra.

Sin registro. El cálculo pasa en tu navegador: lo que cargás no se guarda
ni se envía a ningún lado.

## Qué incluye

- **744 versiones de 312 modelos y 53 marcas**, cada una con su precio 0km,
  consumo, seguro y service de referencia.
- Buscador por marca y modelo, y versiones ordenadas por precio.
- Km por año ajustables (de 1.000 a 60.000) y todos los valores editables:
  si tenés tu propia cotización de seguro o el precio de tu estación, lo
  cambiás y el resultado se actualiza.
- Resultado como **rango mínimo–máximo** por mes y por km, con desglose
  anual por rubro.
- Comparador de dos modelos.
- Calculadora de GNC.
- Costo de patentamiento por provincia.

## Cómo se calcula

- **Combustible anual** = (km por año ÷ 100) × consumo × precio por litro.
- **Service anual** = (km por año ÷ intervalo de service) × costo del service.
- **Seguro:** rango orientativo de terceros completo.
- **Patente, VTV, cochera, cuota y otros:** pasados a valor anual. La patente
  se estima con la escala de ARBA (provincia de Buenos Aires) y se puede editar.
- **Rango total:** el mínimo suma todos los mínimos y el máximo suma todos los
  máximos. El costo por km es ese total dividido por los km del año.
- **Patentamiento:** arancel del 1% (0,8% si el trámite es digital) + sellos
  de la provincia + formulario según el origen del auto.
- **Autos eléctricos:** el consumo de combustible es 0. El costo de la carga
  no se incluye porque depende de la tarifa, el tipo de carga y el uso.

## De dónde salen los datos

Referencia actual: **noviembre 2026**.

- **Precios 0km:** listas de precios de referencia del mercado argentino. Los
  precios publicados en dólares se pasan a pesos con la cotización oficial
  (BNA, venta) y la tasa y la fecha quedan declaradas en cada fila.
- **Consumo:** el de cada versión según su propia fuente, siempre declarada:
  homologado IRAM/AITA, WLTP, EPA, Inmetro, Chile MTT o medido en pruebas.
  Los ciclos no se mezclan sin aclararlo, y los híbridos enchufables usan el
  consumo sin carga, no el ponderado.
- **Combustibles:** el precio más alto vigente entre las principales
  estaciones de CABA (YPF, Shell, Axion y Puma), según los datos oficiales de
  precios en surtidor de la Secretaría de Energía (Res. 314/2016). Se toma el
  más alto a propósito, para no subestimar el gasto.
- **Service:** precio del concesionario oficial cuando está publicado.
- **Seguro:** regla calibrada con cotizaciones publicadas, que se revisa cada
  trimestre.

### Criterios

- **Nada inventado.** Si un dato no tiene fuente, la versión queda afuera
  antes que mostrar un número sin respaldo.
- **Los estimados se marcan.** Cuando no hay dato oficial (por ejemplo, un
  service sin precio publicado), el valor aparece como **ESTIMADO**, con
  su base explicada. La mayoría de los services estimados se calculan sobre el
  0,75% del precio 0km.
- **Cada dato tiene fuente y fecha.** Están en la columna `fuente` y
  `fecha_actualizacion` de [`src/data/base-modelos.csv`](src/data/base-modelos.csv).

Los valores son orientativos: no son una cotización. Para comprar, confirmá
precio, seguro y service con el concesionario y la aseguradora.

## Los datos son abiertos

Toda la base está en archivos CSV que se pueden leer, descargar o reusar:

| Archivo | Qué tiene |
| --- | --- |
| [`base-modelos.csv`](src/data/base-modelos.csv) | Precio, consumo, seguro, service, fuente y fecha de cada versión |
| [`precios-combustibles.csv`](src/data/precios-combustibles.csv) | Precio de referencia de cada combustible, con fuente |
| [`sellos-provincias.csv`](src/data/sellos-provincias.csv) | Alícuota de sellos de patentamiento por provincia |
| [`combustible-premium.csv`](src/data/combustible-premium.csv) | Versiones que usan nafta premium |

¿Encontraste un dato mal o desactualizado? Abrí un
[issue](../../issues) con el modelo, la versión y la fuente correcta.

## Para desarrolladores

Hecha con TanStack Start, React, Vite, Tailwind y Recharts. Las fórmulas
están en [`src/lib/costos.ts`](src/lib/costos.ts) y la página en
[`src/routes/index.tsx`](src/routes/index.tsx).

```bash
bun install
bun run dev      # servidor local
bun run test     # tests
```
