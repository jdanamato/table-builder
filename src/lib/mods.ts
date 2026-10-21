/* ── The classes this builder owns ──
   The vanilla build read the available modifiers back off the DOM, which made
   the control panel the source of truth for what a class could be. Here the
   registry is declared once and the panel is rendered from it, so the two
   cannot drift. */

export const CHECK_MODS = ['row-lines', 'col-lines', 'numeric', 'bare'] as const
export type CheckMod = (typeof CHECK_MODS)[number]

/* Each select contributes the value of the chosen option, with the empty
   string standing for the default — no class at all. */
export const SELECT_MODS = {
  stripeRows: ['', 'zebra-odd', 'zebra-even'],
  stripeCols: ['', 'zebra-cols-odd', 'zebra-cols-even'],
  size: ['', 'size-1', 'size-3'],
  radius: ['radius-0', 'radius-1', '', 'radius-3'],
} as const

export type SelectKey = keyof typeof SELECT_MODS

/* Superseded names still recognised on pasted markup, so re-styling a table
   built by an earlier version clears its old classes instead of stacking. */
const LEGACY_MODIFIERS = ['zebra', 'zebra-cols']

/* Classes emitted by the builder rather than chosen from the panel. */
export const EMITTED = ['sr-only']

/* What a superseded name is worth to the panel, so a table styled by an
   earlier version comes back with the settings it was built with. */
const LEGACY_ADOPT: Record<string, string> = {
  zebra: 'zebra-odd',
  'zebra-cols': 'zebra-cols-even',
}

/* The families this builder manages, beyond the exact names a control can
   produce. A hand-typed `radius-2` is no option here, but it is still this
   builder's class to clear — left in place, the panel's own radius would stack
   on top of it and the table would carry two. */
const OWNED_FAMILIES = [/^zebra(-cols)?(-odd|-even)?$/, /^size-\d+$/, /^radius-\d+$/]

/* Every class a control can produce, selected or not — the names side of what
   this builder owns, with `OWNED_FAMILIES` covering the rest. */
export const ALL_MODIFIERS: string[] = [
  ...CHECK_MODS,
  ...Object.values(SELECT_MODS).flatMap((opts) => opts.filter(Boolean)),
  ...LEGACY_MODIFIERS,
]

/* ── Settings ── */
export type Settings = {
  caption: string
  captionSync: boolean
  captionHidden: boolean

  mods: Record<CheckMod, boolean>
  stripeRows: string
  stripeCols: string
  size: string
  radius: string
  prefix: string

  /* Viewing aids for the preview pane; never written onto the table. */
  stickyHeader: boolean
  stickyFirst: boolean

  title: string
  desc: string
  brand: string
  meta: string
  logo: string | null
  footer: boolean
  footerSync: boolean
  footerBrand: string
  footerMeta: string
  footerLogo: string | null
}

export const INITIAL_SETTINGS: Settings = {
  caption: '',
  captionSync: false,
  captionHidden: false,

  mods: { 'row-lines': false, 'col-lines': false, numeric: false, bare: false },
  stripeRows: '',
  stripeCols: '',
  size: '',
  radius: '',
  prefix: '',

  stickyHeader: false,
  stickyFirst: false,

  title: '',
  desc: '',
  brand: 'AutoDrill',
  meta: 'autodrill.com · 800-871-5022 · Flemington, NJ',
  logo: null,
  footer: false,
  footerSync: true,
  footerBrand: '',
  footerMeta: '',
  footerLogo: null,
}

/* Namespaces every class this builder owns, so the rules can be pasted into a
   site without colliding with classes already defined there. */
export function classPrefix(s: Settings): string {
  return s.prefix.replace(/[^\w-]/g, '')
}

/* The classes the current settings put on the table, in panel order. */
export function getClasses(s: Settings): string[] {
  const out: string[] = []
  for (const m of CHECK_MODS) if (s.mods[m]) out.push(m)
  for (const key of Object.keys(SELECT_MODS) as SelectKey[]) {
    const v = s[key]
    if (v) out.push(v)
  }
  return out
}

/* A class under whichever prefix this builder may have written it with, so
   `ad-radius-1` and `radius-1` both read as `radius-1`. Anything carrying no
   prefix of ours comes back as it went in. */
export function bareName(c: string, prefixes: string[]): string {
  const p = [...new Set(prefixes)]
    .filter(Boolean)
    .find((p) => c.startsWith(p) && c.length > p.length)
  return p ? c.slice(p.length) : c
}

function isOwned(c: string, prefixes: string[]): boolean {
  const n = bareName(c, prefixes)
  return ALL_MODIFIERS.includes(n) || OWNED_FAMILIES.some((re) => re.test(n))
}

export function clearOwned(table: Element, prefixes: string[]): void {
  for (const c of [...table.classList]) {
    if (isOwned(c, prefixes)) table.classList.remove(c)
  }
}

/* ── Adopting the markup ──
   Clearing the classes the markup arrived with is right when the panel is what
   changed and wrong when the markup is. Reading the controls off the markup
   first is what makes the editor a real input: a table this builder wrote comes
   back with the settings it was built with, and a class edited by hand takes,
   instead of being quietly written over.

   Only what a control can represent is read. A class in one of this builder's
   families that no option carries — `radius-2` — leaves the control at its
   default, the same as a table with no class in that family at all. */
export function adoptClasses(html: string, s: Settings, prefixes: string[]): Settings {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const table = tmp.querySelector('table')
  if (!table) return s

  /* Read against the bare names, so a class the markup carries is recognised
     whether or not it arrived with the prefix this builder is set to write. */
  const on = (el: Element) => (name: string) =>
    [...el.classList]
      .map((c) => bareName(c, prefixes))
      .some((c) => c === name || LEGACY_ADOPT[c] === name)

  const has = on(table)
  const next: Settings = {
    ...s,
    mods: { ...s.mods },
  }

  for (const m of CHECK_MODS) next.mods[m] = has(m)
  for (const key of Object.keys(SELECT_MODS) as SelectKey[]) {
    const hit = SELECT_MODS[key].find((o) => o && has(o))
    next[key] = hit ?? ''
  }

  const cap = table.querySelector(':scope > caption')
  if (cap) next.captionHidden = on(cap)('sr-only')

  return next
}

/* ── Prefixing ──
   The preview carries the bare class names, because the stylesheet on this page
   is written against them. Only the markup on its way out is renamed. */
export function withPrefix(node: HTMLElement, prefix: string): HTMLElement {
  if (!prefix) return node

  const owned = new Set([...ALL_MODIFIERS, ...EMITTED])
  const clone = node.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[class]').forEach((el) => {
    for (const c of [...el.classList]) {
      if (owned.has(c)) {
        el.classList.remove(c)
        el.classList.add(prefix + c)
      }
    }
  })
  return clone
}
