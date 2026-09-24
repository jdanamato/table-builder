# Table to PDF

Paste an HTML table, style it from the panel, copy the markup and CSS back out, or print it
to PDF with a header, title and footer.

## Stack

| Layer | Choice |
| --- | --- |
| Build | Vite + React + TypeScript |
| Components | [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com) primitives |
| Styling | Tailwind CSS v4 |
| Colour | [Radix Colors](https://www.radix-ui.com/colors) |

```bash
npm install
npm run dev      # http://localhost:4321
npm run build
```

## Colour

shadcn's semantic tokens (`--background`, `--primary`, `--border`, …) are defined over Radix's
12-step scales in `src/styles/theme.css`. Radix ships each scale as `:root` and `.dark`
declarations of the same variable names, so the semantic layer is written once and re-resolves
per theme; only the page/panel elevation pair is overridden for dark, since step 1 is the
lightest colour in one theme and the darkest in the other.

Two things worth knowing before changing the accent:

- `--accent` is shadcn's subtle hover fill (step 4), **not** the brand colour. The brand is
  `--primary` (step 9).
- Radix ships no contrast token outside Radix Themes, so `--primary-foreground` is named by
  hand. Blue takes white; amber, yellow, lime, mint and sky would each need black.

## Layout of the source

```
src/
  lib/
    mods.ts      the classes the builder owns: registry, prefixing, adoption
    markup.ts    build / clean / format the pasted markup
    css.ts       the stylesheet and inline-style output
    print.ts     the standalone document sent to the print dialog
  components/    the panel, preview and code views
  styles/
    theme.css    Radix Colors mapped onto shadcn's tokens
    preview.css  the preview's table rules
```

`preview.css` is plain CSS rather than utility classes on purpose: the preview renders markup
the person pasted, so there are no elements to hang classes on. It also reaches for Radix steps
the semantic layer does not name — an alpha tint for a stripe, step 7 for a divider.
