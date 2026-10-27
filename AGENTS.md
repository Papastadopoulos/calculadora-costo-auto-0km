<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep ARBA estimation and model comparison calculations in the shared cost library so the calculator and comparator use identical formulas.
- Derive the calculator's default patente from the current 0km price and frequency, using a nullable manual override reset on model selection; this keeps estimates current without overwriting user edits.
- The comparator uses each model's reference costs and ARBA estimate with shared usage, fuel prices, VTV and extras; compare range midpoints and label ties explicitly to avoid implying guaranteed savings.
- Share the brand/model/version cascade between the calculator and each comparator column, keeping local selection state independent and using a unique ID for each source row to avoid version collisions.
- Normalize duplicate brand casing in the shared cost library using the existing mixed-case name; preserve source CSV rows and IDs so all selectors share the same grouping without losing reference data.
