/* ── Elements ── */
const inp     = document.getElementById('html-in');
const prev    = document.getElementById('preview');
const status  = document.getElementById('preview-status');
const titleIn = document.getElementById('table-title');
const descIn  = document.getElementById('table-desc');
const capIn   = document.getElementById('table-caption');
const capSync = document.getElementById('opt-caption-sync');
const capHide = document.getElementById('opt-caption-hidden');
const prefIn  = document.getElementById('class-prefix');
const cssOut  = document.getElementById('css-out');
const cssLabel= document.getElementById('css-label');

/* Output-ready markup for the current settings: the same string the editor is
   synced with, the CSS is generated against, and the export document embeds. */
let exportHtml = '';

/* The prefix the editor's markup was last written with. Clearing a class has
   to go by the name that is actually in the markup, not the one now typed. */
let lastPrefix = '';

/* ── Class prefix ──
   Namespaces every class this builder owns, so the rules can be pasted into a
   site without colliding with classes already defined there. */
function classPrefix() {
  return prefIn.value.replace(/[^\w-]/g, '');
}

/* ── Modifier state ──
   Checkboxes contribute one class each; selects contribute the value of the
   chosen option, with the empty value standing for the default. */
function getClasses() {
  const c = [];
  document.querySelectorAll('[data-mod]').forEach(cb => { if (cb.checked) c.push(cb.dataset.mod); });
  document.querySelectorAll('[data-mod-sel]').forEach(s => { if (s.value) c.push(s.value); });
  return c;
}

/* Superseded names still recognised on pasted markup, so re-styling a table
   built by an earlier version clears its old classes instead of stacking. */
const LEGACY_MODIFIERS = ['zebra', 'zebra-cols'];

/* Classes emitted by the builder rather than chosen from the panel. */
const EMITTED = ['sr-only'];

/* What a superseded name is worth to the panel, so a table styled by an
   earlier version comes back with the settings it was built with. */
const LEGACY_ADOPT = { 'zebra': 'zebra-odd', 'zebra-cols': 'zebra-cols-even' };

/* The families this builder manages, beyond the exact names a control can
   produce. A hand-typed `radius-2` is no option here, but it is still this
   builder's class to clear — left in place, the panel's own radius would stack
   on top of it and the table would carry two. */
const OWNED_FAMILIES = [
  /^zebra(-cols)?(-odd|-even)?$/,
  /^size-\d+$/,
  /^radius-\d+$/
];

/* Every class a control can produce, selected or not — the names side of what
   this builder owns, with `OWNED_FAMILIES` covering the rest. */
function allModifiers() {
  const all = [...document.querySelectorAll('[data-mod]')].map(cb => cb.dataset.mod);
  document.querySelectorAll('[data-mod-sel]').forEach(s => {
    [...s.options].forEach(o => { if (o.value) all.push(o.value); });
  });
  return all.concat(LEGACY_MODIFIERS);
}

/* ── Escaping ── */
function esc(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── Caption ──
   The caption belongs to the table: it lives in the markup and travels with
   it, unlike the title and description, which are printed beside the table
   and never written into it. Text typed here overwrites a caption already in
   the pasted markup; an empty field leaves that one as it stands. */
function captionText() {
  return (capSync.checked ? titleIn.value : capIn.value).trim();
}

/* Whether the table that was just rendered carries a caption — from this
   panel or from the pasted markup. The caption rules follow that, not the
   field, so a pasted caption is styled too. */
let captionOut = false;

/* Synced, the field mirrors the title and stops taking input. Unchecking
   leaves the mirrored text behind as the starting point for an edit. */
function syncCaptionField() {
  capIn.disabled = capSync.checked;
  if (capSync.checked) capIn.value = titleIn.value;
}

function applyCaption(table) {
  let cap = table.querySelector(':scope > caption');
  const t = captionText();

  if (t) {
    if (!cap) {
      cap = document.createElement('caption');
      table.insertBefore(cap, table.firstChild);
    }
    cap.textContent = t;
  }

  captionOut = !!cap;
  if (!cap) return;

  cap.classList.toggle('sr-only', capHide.checked);
  if (!cap.className) cap.removeAttribute('class');
}

/* ── Prefixing ──
   The preview carries the bare class names, because the stylesheet on this
   page is written against them. Only the markup on its way out is renamed. */
function withPrefix(node) {
  const p = classPrefix();
  if (!p) return node;

  const owned = new Set(allModifiers().concat(EMITTED));
  const clone = node.cloneNode(true);
  clone.querySelectorAll('[class]').forEach(el => {
    [...el.classList].forEach(c => {
      if (owned.has(c)) { el.classList.remove(c); el.classList.add(p + c); }
    });
  });
  return clone;
}

/* A class under whichever prefix this builder may have written it with, so
   `ad-radius-1` and `radius-1` both read as `radius-1`. Anything carrying no
   prefix of ours comes back as it went in. */
function bareName(c) {
  const p = [...new Set([lastPrefix, classPrefix()])].filter(Boolean)
    .find(p => c.startsWith(p) && c.length > p.length);
  return p ? c.slice(p.length) : c;
}

function isOwned(c) {
  const n = bareName(c);
  return allModifiers().includes(n) || OWNED_FAMILIES.some(re => re.test(n));
}

function clearOwned(table) {
  [...table.classList].forEach(c => { if (isOwned(c)) table.classList.remove(c); });
}

/* The widest row, counting a spanning cell for every column it covers — a
   table that opens on a full-width band would otherwise report one column. */
function columnCount(table) {
  let max = 0;
  table.querySelectorAll('tr').forEach(tr => {
    let n = 0;
    [...tr.children].forEach(c => { n += Math.max(1, parseInt(c.getAttribute('colspan'), 10) || 1); });
    if (n > max) max = n;
  });
  return max;
}

/* ── Adopting the markup ──
   `clearOwned` drops whatever classes the markup arrived with, which is right
   when the panel is what changed and wrong when the markup is. Reading the
   controls off the markup first is what makes the editor a real input: a table
   this builder wrote comes back with the settings it was built with, and a
   class edited by hand takes, instead of being quietly written over.

   Only what a control can represent is read. A class in one of this builder's
   families that no option carries — `radius-2` — leaves the control at its
   default, the same as a table with no class in that family at all. */
function adoptClasses() {
  const tmp = document.createElement('div');
  tmp.innerHTML = inp.value;
  const table = tmp.querySelector('table');
  if (!table) return;

  /* Read against the bare names, so a class the markup carries is recognised
     whether or not it arrived with the prefix this builder is set to write. */
  const on = el => n => [...el.classList].map(bareName)
    .some(c => c === n || LEGACY_ADOPT[c] === n);

  const has = on(table);
  document.querySelectorAll('[data-mod]').forEach(cb => { cb.checked = has(cb.dataset.mod); });
  document.querySelectorAll('[data-mod-sel]').forEach(sel => {
    const hit = [...sel.options].find(o => o.value && has(o.value));
    sel.value = hit ? hit.value : '';
  });

  const cap = table.querySelector(':scope > caption');
  if (cap) capHide.checked = on(cap)('sr-only');
}

/* Typing, pasting and Format all arrive here: the markup is what the person
   just worked on, so its classes set the panel before anything is written back
   over them. A control change goes straight to `render`, where the panel is
   what wins — whichever of the two was touched last decides. */
function syncFromMarkup(rewrite) {
  adoptClasses();
  render(rewrite);
}

/* ── Render preview ──
   `sync` mirrors the styled markup back into the editor so what is shown is
   what there is to copy. Only control changes pass it — rewriting the value on
   every keystroke would fight the person typing. */
function render(sync) {
  const v = inp.value.trim();
  const classes = getClasses();

  if (!v) {
    prev.innerHTML = '<p class="empty-state">Paste table HTML below to preview.</p>';
    status.textContent = '';
    exportHtml = '';
    captionOut = false;
    updateCss();
    return;
  }

  const tmp = document.createElement('div');
  tmp.innerHTML = v;

  // Auto-wrap bare <table> in a <div> if needed
  const firstEl = tmp.firstElementChild;
  if (firstEl && firstEl.tagName === 'TABLE') {
    const wrap = document.createElement('div');
    firstEl.replaceWith(wrap);
    wrap.appendChild(firstEl);
  }

  // Apply modifier classes
  const table = tmp.querySelector('table');
  if (table) {
    clearOwned(table);
    classes.forEach(c => table.classList.add(c));
    if (!table.className) table.removeAttribute('class');

    applyCaption(table);

    const rows = table.querySelectorAll('tbody tr').length;
    status.textContent = rows + ' rows · ' + columnCount(table) + ' cols';
  } else {
    status.textContent = '';
    captionOut = false;
  }

  /* The title and description are shown the way they will print — above the
     table, outside the markup — so the preview stays a preview of the page,
     not of the copy. `tmp` is what the export is built from, and they are
     deliberately not in it. */
  prev.innerHTML = docHead() + tmp.innerHTML;
  exportHtml = withPrefix(tmp).innerHTML;
  lastPrefix = classPrefix();

  if (sync) inp.value = exportHtml;
  applyPreviewOpts();
  updateCss();
}

/* ── Clean ──
   Removes style, class and every other presentational leftover from pasted
   markup. Only attributes that carry table structure or meaning survive —
   anything else would fight the modifier classes applied here. */
const KEEP_ATTRS = new Set([
  'colspan', 'rowspan', 'headers', 'scope', 'abbr', 'span',
  'href', 'src', 'alt', 'title', 'lang', 'dir'
]);

function cleanMarkup() {
  const tmp = document.createElement('div');
  tmp.innerHTML = inp.value;
  tmp.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => {
      if (!KEEP_ATTRS.has(a.name.toLowerCase())) el.removeAttribute(a.name);
    });
  });
  inp.value = tmp.innerHTML;
  render(true);
}

/* ── Format ──
   Re-indents the markup so the table structure reads at a glance. Nothing is
   added or taken away: every attribute survives, and only the whitespace
   between tags is rewritten. Elements whose children are all text or inline
   markup stay on one line, so a cell is never split across four of them. */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'del', 'dfn',
  'em', 'i', 'img', 'ins', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span',
  'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr'
]);

const INDENT = '  ';

/* The tag as written, attributes and all — rebuilt rather than sliced out of
   outerHTML, which a `>` inside an attribute value would cut in the wrong
   place. */
function openTag(el) {
  const attrs = [...el.attributes]
    .map(a => ' ' + a.name + '="' + a.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"')
    .join('');
  return '<' + el.tagName.toLowerCase() + attrs + '>';
}

/* Whitespace-only text between tags is layout, not content, so it is dropped
   and written back as indentation. Text with something in it is kept. */
function meaningful(n) {
  return n.nodeType === 1 || n.nodeType === 8 || (n.nodeType === 3 && n.textContent.trim());
}

function writeNode(node, depth, out) {
  const pad = INDENT.repeat(depth);

  if (node.nodeType === 3) { out.push(pad + node.textContent.trim().replace(/\s+/g, ' ')); return; }
  if (node.nodeType === 8) { out.push(pad + '<!--' + node.textContent + '-->'); return; }
  if (node.nodeType !== 1) return;

  const tag = node.tagName.toLowerCase();
  if (VOID_TAGS.has(tag)) { out.push(pad + openTag(node)); return; }

  const kids  = [...node.childNodes].filter(meaningful);
  const close = '</' + tag + '>';

  if (!kids.length) { out.push(pad + openTag(node) + close); return; }

  /* Inline-only content keeps its own spacing, collapsed to single spaces —
     breaking it onto separate lines would introduce gaps the browser renders. */
  if (kids.every(n => n.nodeType === 3 || (n.nodeType === 1 && INLINE_TAGS.has(n.tagName.toLowerCase())))) {
    out.push(pad + openTag(node) + node.innerHTML.replace(/\s+/g, ' ').trim() + close);
    return;
  }

  out.push(pad + openTag(node));
  kids.forEach(k => writeNode(k, depth + 1, out));
  out.push(pad + close);
}

function prettyHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const out = [];
  [...tmp.childNodes].filter(meaningful).forEach(n => writeNode(n, 0, out));
  return out.join('\n');
}

function formatMarkup() {
  /* The settings are read off the markup and written back in first, so what
     gets indented is one canonical set of classes — never the hand-edited one
     stacked under the panel's own. */
  syncFromMarkup(true);
  inp.value = prettyHtml(inp.value);
  /* No sync on the way back: re-emitting the markup would undo the indenting. */
  render();
}

/* ── Preview-only display options ──
   Sticky header / first column are viewing aids for the preview pane only:
   they depend on a scroll container, so they mean nothing in the exported
   document or in print. They never appear on the table. */
const PREVIEW_OPTS = [
  ['opt-sticky-header', 'is-sticky-header'],
  ['opt-sticky-first',  'is-sticky-first']
];

function applyPreviewOpts() {
  PREVIEW_OPTS.forEach(([id, cls]) => {
    prev.classList.toggle(cls, document.getElementById(id).checked);
  });
  layoutSticky();
}

/* A header of several rows cannot pin them all to the same offset — they would
   land on top of each other, leaving only the last one in sight. Each row is
   measured and pinned below the ones before it, and given a z-index above them
   so the row that stacks first also paints in front.

   The band labels are wrapped here rather than in the markup being exported:
   the preview owns its own copy of the table by this point, so the wrapper is
   a display aid that never reaches the copied HTML or the printed page. */
function layoutSticky() {
  const table = prev.querySelector('table');
  if (!table) return;

  const head = [...(table.tHead ? table.tHead.rows : [])];
  const depth = head.length;
  let offset = 0;

  head.forEach((row, i) => {
    row.style.setProperty('--sticky-top', offset + 'px');
    row.style.setProperty('--sticky-z', depth - i + 1);
    /* Read after the offset is set, so a row already pinned still measures at
       its laid-out height rather than at nothing. */
    offset += row.getBoundingClientRect().height;
  });

  table.querySelectorAll('tr > :first-child[colspan]').forEach(cell => {
    if (cell.firstElementChild && cell.firstElementChild.classList.contains('band-label')) return;
    const label = document.createElement('span');
    label.className = 'band-label';
    while (cell.firstChild) label.appendChild(cell.firstChild);
    cell.appendChild(label);
  });
}

/* ── Table CSS ──
   `{{name}}` stands for a class this builder owns, and picks up the prefix.
   Only the rules the current settings actually need are emitted. */
const CSS_BASE = [
  'div:has(> table){--tr:10px;overflow:hidden;max-width:100%;border:1px solid #e4e4e7;border-radius:var(--tr);background:#fafafa}',
  'table{width:100%;max-width:100%;table-layout:auto;border-collapse:separate;border-spacing:0;font-size:12px;font-variant-numeric:tabular-nums}',
  'th,td{padding:8px 12px;vertical-align:middle;text-align:start;overflow-wrap:break-word}',
  'thead :is(th,td){font-weight:600;background:#fafafa;border-bottom:1px solid #e4e4e7;font-size:11px;color:#52525b}',
  'tfoot :is(th,td){font-weight:600;border-top:1px solid #e4e4e7}',
  'tbody tr:hover > *{background:rgba(0,0,0,.04)}',
  'tr:has(> th[colspan]) > th{background:#fafafa;font-weight:700;color:#52525b;border-bottom:1px solid #e4e4e7}'
];

const CSS_CAPTION = [
  'caption{padding:10px 12px;text-align:start;font-size:15px;font-weight:600;color:#18181b}'
];

const CSS_SR_ONLY = [
  '.{{sr-only}}{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;border:0}'
];

const CSS_MODS = {
  'zebra-odd':  ['.{{zebra-odd}} tbody tr:nth-child(odd) > *{background:rgba(0,0,0,.025)}'],
  'zebra-even': ['.{{zebra-even}} tbody tr:nth-child(even) > *{background:rgba(0,0,0,.025)}'],
  /* Overlaid as an image so a column stripe composites over the row stripe —
     and over the header's own background — instead of replacing it. */
  'zebra-cols-odd':  ['.{{zebra-cols-odd}} :is(thead,tbody,tfoot) :is(th,td):nth-child(odd):not([colspan]){background-image:linear-gradient(rgba(0,0,0,.025),rgba(0,0,0,.025))}'],
  'zebra-cols-even': ['.{{zebra-cols-even}} :is(thead,tbody,tfoot) :is(th,td):nth-child(even):not([colspan]){background-image:linear-gradient(rgba(0,0,0,.025),rgba(0,0,0,.025))}'],
  'row-lines': ['.{{row-lines}} tbody tr:not(:last-child) > *{border-bottom:1px solid #e4e4e7}'],
  'col-lines': ['.{{col-lines}} tr > *:not(:last-child){border-right:1px solid #e4e4e7}'],
  /* The header cells align with the figures under them, so a column reads
     straight down; the first column labels the row and keeps its own side. */
  'numeric':   ['.{{numeric}} :is(thead,tbody,tfoot) :is(th,td){text-align:right}',
                '.{{numeric}} :is(thead,tbody,tfoot) :is(th,td):first-child{text-align:left}'],
  'bare':      ['div:has(> table.{{bare}}){background:transparent;border:none}'],
  'size-1':    ['.{{size-1}} :is(thead,tbody,tfoot) :is(th,td){padding:5px 8px}'],
  'size-3':    ['.{{size-3}} :is(thead,tbody,tfoot) :is(th,td){padding:12px 16px}'],
  'radius-0':  ['div:has(> table.{{radius-0}}){--tr:0}'],
  'radius-1':  ['div:has(> table.{{radius-1}}){--tr:6px}'],
  'radius-3':  ['div:has(> table.{{radius-3}}){--tr:16px}']
};

/* A caption pushes the header off the top edge, so only an uncaptioned table
   has corners to round. */
const TOP      = 'table:not(:has(> caption)) > thead > tr:first-child > :is(th,td)';
const TOP_BARE = 'table:not(:has(> caption)):not(:has(> thead)) > tbody:first-of-type > tr:first-child > :is(th,td)';
const BOT      = 'table:has(> tfoot) > tfoot > tr:last-child > :is(th,td)';
const BOT_BARE = 'table:not(:has(> tfoot)) > tbody:last-of-type > tr:last-child > :is(th,td)';

const CSS_PRINT = [
  'thead{display:table-header-group}',
  'tr{break-inside:avoid}',
  /* An overflow container can be cut at a page break in some print engines, so
     the clipping comes off on paper — which leaves nothing to round the table.
     The corner cells take the radius themselves instead, inheriting --tr. */
  '@media print{\n'
  + '  div:has(> table){overflow:visible}\n'
  + '  ' + TOP + ':first-child,\n  ' + TOP_BARE + ':first-child{border-start-start-radius:var(--tr)}\n'
  + '  ' + TOP + ':last-child,\n  '  + TOP_BARE + ':last-child{border-start-end-radius:var(--tr)}\n'
  + '  ' + BOT + ':first-child,\n  ' + BOT_BARE + ':first-child{border-end-start-radius:var(--tr)}\n'
  + '  ' + BOT + ':last-child,\n  '  + BOT_BARE + ':last-child{border-end-end-radius:var(--tr)}\n'
  + '}'
];

/* The rules are written compactly above; this is what makes them readable in
   the panel and in the exported file. At-rules are already laid out by hand. */
function expandRule(r) {
  const open = r.indexOf('{');
  if (r.startsWith('@') || open < 0) return r;

  const sel  = r.slice(0, open).trim();
  const body = r.slice(open + 1, r.lastIndexOf('}'));
  const decls = body.split(';')
    .filter(d => d.trim())
    .map(d => '  ' + d.trim().replace(/:\s*/, ': ') + ';') // first colon only: the property separator
    .join('\n');

  return sel + ' {\n' + decls + '\n}';
}

/* The rules the current settings need, in cascade order and already carrying
   the prefix — what both the stylesheet and the inline pass are built from. */
function activeRules() {
  const rules = CSS_BASE.slice();
  if (captionOut) {
    rules.push(...CSS_CAPTION);
    if (capHide.checked) rules.push(...CSS_SR_ONLY);
  }
  getClasses().forEach(c => { if (CSS_MODS[c]) rules.push(...CSS_MODS[c]); });
  rules.push(...CSS_PRINT);

  const p = classPrefix();
  return rules.map(r => r.replace(/\{\{([\w-]+)\}\}/g, (_, n) => p + n));
}

function tableCss() {
  return activeRules().map(expandRule).join('\n\n');
}

/* ── Inline styles ──
   The same rules written onto the elements themselves, for anywhere a <style>
   tag is stripped. Each rule is matched against the export markup and its
   declarations appended in cascade order, so a later rule wins the way it
   would in a stylesheet. What cannot survive the move is left behind: the
   print block, because a style attribute carries no at-rule, and :hover,
   because a style attribute carries no state. */
function inlineStyled() {
  if (!exportHtml) return '';

  const root = document.createElement('div');
  root.innerHTML = exportHtml;

  activeRules().forEach(r => {
    const open = r.indexOf('{');
    if (open < 0 || r.startsWith('@')) return;

    const sel = r.slice(0, open).trim();
    if (sel.includes(':hover')) return;

    const decls = r.slice(open + 1, r.lastIndexOf('}'));
    let els;
    try { els = root.querySelectorAll(sel); } catch { return; }
    els.forEach(el => {
      const had = el.style.cssText.trim();
      el.style.cssText = (had ? had.replace(/;?$/, ';') : '') + decls;
    });
  });

  // The classes have done their work; inline markup carries no stylesheet.
  const p = classPrefix();
  const owned = new Set(allModifiers().concat(EMITTED).map(n => p + n));
  root.querySelectorAll('[class]').forEach(el => {
    [...el.classList].forEach(c => { if (owned.has(c)) el.classList.remove(c); });
    if (!el.className) el.removeAttribute('class');
  });

  return root.innerHTML;
}

function cssFormat() {
  const on = document.querySelector('input[name="css-format"]:checked');
  return on ? on.value : 'separate';
}

function cssText() {
  if (cssFormat() === 'inline') return inlineStyled();
  return '<style>\n' + tableCss() + '\n</style>';
}

function updateCss() {
  const inline = cssFormat() === 'inline';
  cssLabel.textContent = inline ? 'Table HTML, styles inline' : 'Table CSS';
  cssOut.classList.toggle('is-markup', inline);
  cssOut.textContent = cssText();
}

async function copyCss(btn) {
  const label = btn.textContent;
  try {
    await navigator.clipboard.writeText(cssOut.textContent);
    btn.textContent = 'Copied';
  } catch {
    // No clipboard access (an insecure origin, usually) — select it instead
    const r = document.createRange();
    r.selectNodeContents(cssOut);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    btn.textContent = 'Press ⌘C';
  }
  setTimeout(() => { btn.textContent = label; }, 1600);
}

/* ── Event listeners ── */
inp.addEventListener('input', () => syncFromMarkup(false));
/* After the drop, so the pasted value is the one that gets read. */
inp.addEventListener('paste', () => setTimeout(() => syncFromMarkup(true), 0));
document.querySelectorAll('[data-mod], [data-mod-sel]').forEach(el =>
  el.addEventListener('change', () => render(true))
);
[descIn, prefIn, capIn].forEach(el => el.addEventListener('input', () => render(true)));
titleIn.addEventListener('input', () => { syncCaptionField(); render(true); });
capSync.addEventListener('change', () => { syncCaptionField(); render(true); });
capHide.addEventListener('change', () => render(true));
document.querySelectorAll('input[name="css-format"]').forEach(el =>
  el.addEventListener('change', updateCss)
);
document.addEventListener('click', e => { if (e.target.closest('.tip')) e.preventDefault(); });
PREVIEW_OPTS.forEach(([id]) => document.getElementById(id).addEventListener('change', applyPreviewOpts));
/* Row heights move with the width the table is laid out at. */
window.addEventListener('resize', layoutSticky);
applyPreviewOpts();
syncCaptionField();
updateCss();

/* ── Logo state ──
   A logo stands in for the brand text rather than sitting beside it, so the
   text field and the upload button give way to the preview once one is set.
   The header and the footer each keep their own. */
let logoDataUrl = null;
let footerLogoDataUrl = null;

/* Both chrome rows are wired the same way; only the element ids differ. */
const LOGO_SLOTS = {
  header: {
    input: 'logo-upload', preview: 'logo-preview', row: 'logo-preview-row',
    text: 'print-brand', upload: 'logo-upload-label',
    set: url => { logoDataUrl = url; }
  },
  footer: {
    input: 'footer-logo-upload', preview: 'footer-logo-preview', row: 'footer-logo-preview-row',
    text: 'footer-brand', upload: 'footer-upload-label',
    set: url => { footerLogoDataUrl = url; }
  }
};

function readLogo(which, input) {
  const slot = LOGO_SLOTS[which];
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    slot.set(e.target.result);
    document.getElementById(slot.preview).src = e.target.result;
    document.getElementById(slot.row).style.display = 'flex';
    document.getElementById(slot.text).style.display = 'none';
    document.getElementById(slot.upload).style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function dropLogo(which) {
  const slot = LOGO_SLOTS[which];
  slot.set(null);
  document.getElementById(slot.input).value = '';
  document.getElementById(slot.row).style.display = 'none';
  document.getElementById(slot.text).style.display = '';
  document.getElementById(slot.upload).style.display = '';
}

function handleLogoUpload(input)       { readLogo('header', input); }
function clearLogo()                   { dropLogo('header'); }
function handleFooterLogoUpload(input) { readLogo('footer', input); }
function clearFooterLogo()             { dropLogo('footer'); }

/* ── Print footer ──
   Off by default. Synced, it repeats the header at the foot of the page;
   unsynced, it gets content of its own, and only then are its fields worth
   showing. */
const footOn   = document.getElementById('opt-footer');
const footSync = document.getElementById('opt-footer-sync');

function syncFooterFields() {
  const on = footOn.checked;
  document.getElementById('footer-sync-row').style.display = on ? '' : 'none';
  document.getElementById('footer-fields').style.display = on && !footSync.checked ? '' : 'none';
}

[footOn, footSync].forEach(el => el.addEventListener('change', syncFooterFields));
syncFooterFields();

/* ── Export: page chrome for the standalone output file ── */
const PAGE_CSS = [
  '*{box-sizing:border-box}',
  'body{font-family:system-ui,-apple-system,sans-serif;margin:1.5cm;color:#18181b}',
  'header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #e4e4e7;margin-bottom:1.5rem}',
  '.brand{font-size:15px;font-weight:600;letter-spacing:-.02em}',
  '.brand img{display:inline-block;max-height:36px;max-width:200px;width:auto;height:auto;vertical-align:middle}',
  '.meta{font-size:11px;color:#71717a}',
  '.doc-head{margin-bottom:1rem}',
  '.doc-title{margin:0;font-size:18px;font-weight:600;letter-spacing:-.01em}',
  '.doc-desc{margin:6px 0 0;max-width:65ch;font-size:12px;line-height:1.5;color:#52525b}',
  'footer{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-top:10px;border-top:1px solid #e4e4e7;margin-top:1.5rem}',
  'footer .brand{font-size:12px}',
  'footer .brand img{max-height:28px;max-width:160px}',
  '@media print{body{margin:1cm}}'
].join('\n');

/* ── Title and description ──
   They describe the document, so they are printed above the table rather than
   folded into it. The same block is what the preview shows. */
function docHead() {
  const t = titleIn.value.trim();
  const d = descIn.value.trim();
  if (!t && !d) return '';

  return '<div class="doc-head">'
    + (t ? '<h1 class="doc-title">' + esc(t) + '</h1>' : '')
    + (d ? '<p class="doc-desc">' + esc(d).replace(/\n/g, '<br>') + '</p>' : '')
    + '</div>';
}

/* Header and footer are the same row — a brand or logo at the start, a line of
   contact or note text at the end — so both are written by this. */
function chromeRow(tag, logo, text, meta) {
  const brandHtml = logo ? '<img src="' + logo + '" alt="Logo" />' : esc(text);
  return '<' + tag + '><span class="brand">' + brandHtml + '</span>'
    + '<span class="meta">' + esc(meta) + '</span></' + tag + '>';
}

function printHeader() {
  return chromeRow(
    'header',
    logoDataUrl,
    document.getElementById('print-brand').value || 'AutoDrill',
    document.getElementById('print-meta').value || ''
  );
}

/* Synced, the footer reads the header's own fields rather than a copy of them,
   so editing the header keeps the two in step. */
function printFooter() {
  if (!footOn.checked) return '';
  if (footSync.checked) {
    return chromeRow(
      'footer',
      logoDataUrl,
      document.getElementById('print-brand').value || 'AutoDrill',
      document.getElementById('print-meta').value || ''
    );
  }
  return chromeRow(
    'footer',
    footerLogoDataUrl,
    document.getElementById('footer-brand').value || '',
    document.getElementById('footer-meta').value || ''
  );
}

function buildDoc(body) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>AutoDrill Chart</title><style>\n'
    + PAGE_CSS + '\n' + tableCss()
    + '\n</style></head><body>'
    + printHeader()
    + docHead()
    + body
    + printFooter()
    + '</body></html>';
}

/* ── Export: open print dialog ── */
function openPrint() {
  if (!exportHtml) return;
  const w = window.open(URL.createObjectURL(new Blob([buildDoc(exportHtml)], { type: 'text/html' })), '_blank');
  if (w) w.onload = function () { w.focus(); w.print(); };
}
