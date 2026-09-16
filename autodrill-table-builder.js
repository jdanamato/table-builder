/* ── Elements ── */
const inp     = document.getElementById('html-in');
const prev    = document.getElementById('preview');
const status  = document.getElementById('preview-status');
const titleIn = document.getElementById('table-title');
const descIn  = document.getElementById('table-desc');
const headHid = document.getElementById('opt-head-hidden');

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

/* Every class this builder owns, selected or not. The classes carry no prefix,
   so a previous pass has to be cleared by name rather than by pattern. */
function allModifiers() {
  const all = [...document.querySelectorAll('[data-mod]')].map(cb => cb.dataset.mod);
  document.querySelectorAll('[data-mod-sel]').forEach(s => {
    [...s.options].forEach(o => { if (o.value) all.push(o.value); });
  });
  return all.concat(LEGACY_MODIFIERS);
}

/* ── Title / description ── */
function esc(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Rendered identically in the preview and in the exported document. */
function headBlock() {
  const t = titleIn.value.trim();
  const d = descIn.value.trim();
  if (!t && !d) return '';
  return '<div class="table-head' + (headHid.checked ? ' sr-only' : '') + '">'
    + (t ? '<p class="table-title">' + esc(t) + '</p>' : '')
    + (d ? '<p class="table-desc">' + esc(d).replace(/\n/g, '<br>') + '</p>' : '')
    + '</div>';
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
    table.classList.remove(...allModifiers());
    classes.forEach(c => table.classList.add(c));
    if (!table.className) table.removeAttribute('class');

    // A caption belongs to the table, so its visibility rides along in the markup
    const cap = table.querySelector('caption');
    if (cap) {
      cap.classList.toggle('sr-only', headHid.checked);
      if (!cap.className) cap.removeAttribute('class');
    }

    const rows = table.querySelectorAll('tbody tr').length;
    const firstRow = table.querySelector('tr');
    const cols = firstRow ? firstRow.children.length : 0;
    status.textContent = rows + ' rows · ' + cols + ' cols';
  } else {
    status.textContent = '';
  }

  prev.innerHTML = headBlock() + tmp.innerHTML;

  if (sync) inp.value = tmp.innerHTML;
}

/* ── Strip attributes ──
   Removes style, class and every other presentational leftover from pasted
   markup. Only attributes that carry table structure or meaning survive —
   anything else would fight the modifier classes applied here. */
const KEEP_ATTRS = new Set([
  'colspan', 'rowspan', 'headers', 'scope', 'abbr', 'span',
  'href', 'src', 'alt', 'title', 'lang', 'dir'
]);

function stripAttributes() {
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

/* ── Preview-only display options ──
   Sticky header / first column are viewing aids for the preview pane only:
   they depend on a scroll container, so they mean nothing in the exported
   document or in print. They never appear in the applied class. */
const PREVIEW_OPTS = [
  ['opt-sticky-header', 'is-sticky-header'],
  ['opt-sticky-first',  'is-sticky-first']
];

function applyPreviewOpts() {
  PREVIEW_OPTS.forEach(([id, cls]) => {
    prev.classList.toggle(cls, document.getElementById(id).checked);
  });
}

/* ── Event listeners ── */
inp.addEventListener('input', () => render());
document.querySelectorAll('[data-mod], [data-mod-sel]').forEach(el =>
  el.addEventListener('change', () => render(true))
);
headHid.addEventListener('change', () => render(true));
[titleIn, descIn].forEach(el => el.addEventListener('input', () => render()));
PREVIEW_OPTS.forEach(([id]) => document.getElementById(id).addEventListener('change', applyPreviewOpts));
applyPreviewOpts();

/* ── Logo state ── */
let logoDataUrl = null;

function handleLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    logoDataUrl = e.target.result;
    const img = document.getElementById('logo-preview');
    img.src = logoDataUrl;
    document.getElementById('logo-preview-row').style.display = 'flex';
    document.getElementById('print-brand').style.display = 'none';
    document.querySelector('.ph-upload-label').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function clearLogo() {
  logoDataUrl = null;
  document.getElementById('logo-upload').value = '';
  document.getElementById('logo-preview-row').style.display = 'none';
  document.getElementById('print-brand').style.display = '';
  document.querySelector('.ph-upload-label').style.display = '';
}

/* ── Export: print CSS (inlined into standalone output file) ── */
const FIRST         = 'table>thead>tr:first-child>:is(th,td)';
const FIRST_NO_HEAD = 'table:not(:has(>thead))>tbody:first-of-type>tr:first-child>:is(th,td)';
const LAST          = 'table:has(>tfoot)>tfoot>tr:last-child>:is(th,td)';
const LAST_NO_FOOT  = 'table:not(:has(>tfoot))>tbody:last-of-type>tr:last-child>:is(th,td)';

const PRINT_CSS = [
  '*{box-sizing:border-box}',
  'body{font-family:system-ui,-apple-system,sans-serif;margin:1.5cm;color:#18181b}',
  'header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #e4e4e7;margin-bottom:1.5rem}',
  '.brand{font-size:15px;font-weight:600;letter-spacing:-.02em}',
  '.brand img{display:inline-block;max-height:36px;max-width:200px;width:auto;height:auto;vertical-align:middle}',
  '.meta{font-size:11px;color:#71717a}',
  'div:has(>table){--tr:10px;overflow:hidden;max-width:100%;border:1px solid #e4e4e7;border-radius:var(--tr);background:#fafafa}',
  'table{width:100%;max-width:100%;table-layout:auto;border-collapse:separate;border-spacing:0;font-size:12px;font-variant-numeric:tabular-nums}',
  'th,td{padding:8px 12px;vertical-align:middle;text-align:start;overflow-wrap:break-word}',
  'thead :is(th,td){font-weight:600;background:#fafafa;border-bottom:1px solid #e4e4e7;font-size:11px;color:#52525b}',
  'tfoot :is(th,td){font-weight:600;border-top:1px solid #e4e4e7}',
  'caption{padding:8px 12px;text-align:start;font-weight:600;color:#52525b;font-size:11px}',
  'tbody tr:hover>*{background:rgba(0,0,0,.04)}',
  'tr:has(>th[colspan])>th{background:#fafafa;font-weight:700;color:#52525b;border-bottom:1px solid #e4e4e7}',
  ':is(.zebra,.zebra-odd) tbody tr:nth-child(odd)>*{background:rgba(0,0,0,.025)}',
  '.zebra-even tbody tr:nth-child(even)>*{background:rgba(0,0,0,.025)}',
  '.zebra-cols-odd :is(thead,tbody,tfoot) :is(th,td):nth-child(odd):not([colspan]){background-image:linear-gradient(rgba(0,0,0,.025),rgba(0,0,0,.025))}',
  ':is(.zebra-cols,.zebra-cols-even) :is(thead,tbody,tfoot) :is(th,td):nth-child(even):not([colspan]){background-image:linear-gradient(rgba(0,0,0,.025),rgba(0,0,0,.025))}',
  '.row-lines tbody tr:not(:last-child)>*{border-bottom:1px solid #e4e4e7}',
  '.col-lines tr>*:not(:last-child){border-right:1px solid #e4e4e7}',
  '.numeric tbody td{text-align:right}',
  '.numeric :is(th,td):first-child{text-align:left}',
  'div:has(>table.bare){background:transparent;border:none}',
  'div:has(>table.radius-0){--tr:0}',
  'div:has(>table.radius-1){--tr:6px}',
  'div:has(>table.radius-3){--tr:16px}',
  '.size-1 :is(thead,tbody,tfoot) :is(th,td){padding:5px 8px}',
  '.size-3 :is(thead,tbody,tfoot) :is(th,td){padding:12px 16px}',
  '.table-head{margin-bottom:12px}',
  '.table-title{font-size:15px;font-weight:600;color:#18181b}',
  '.table-desc{font-size:11.5px;line-height:1.5;color:#52525b;margin-top:4px;max-width:65ch}',
  '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;border:0}',
  'thead{display:table-header-group}',
  'tr{break-inside:avoid}',
  /* An overflow container can be cut at a page break in some print engines,
     so the clipping comes off on paper — which leaves nothing to round the
     table. The corner cells take the radius themselves instead, inheriting
     --tr from the wrapper. */
  '@media print{body{margin:1cm}div:has(>table){overflow:visible}',
  FIRST + ':first-child,' + FIRST_NO_HEAD + ':first-child{border-start-start-radius:var(--tr)}',
  FIRST + ':last-child,'  + FIRST_NO_HEAD + ':last-child{border-start-end-radius:var(--tr)}',
  LAST  + ':first-child,' + LAST_NO_FOOT  + ':first-child{border-end-start-radius:var(--tr)}',
  LAST  + ':last-child,'  + LAST_NO_FOOT  + ':last-child{border-end-end-radius:var(--tr)}}'
].join('');

/* ── Export helpers ── */
function getExportBody() {
  const wrap = prev.querySelector('div:has(> table)');
  if (wrap) return wrap.outerHTML;
  const t = prev.querySelector('table');
  return t ? '<div>' + t.outerHTML + '</div>' : '';
}

function buildDoc(body) {
  const brandText = document.getElementById('print-brand').value || 'AutoDrill';
  const metaText  = document.getElementById('print-meta').value || '';
  const brandHtml = logoDataUrl
    ? '<img src="' + logoDataUrl + '" alt="Logo" />'
    : esc(brandText);

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>AutoDrill Chart</title><style>'
    + PRINT_CSS
    + '</style></head><body>'
    + '<header><span class="brand">' + brandHtml + '</span><span class="meta">' + esc(metaText) + '</span></header>'
    + headBlock()
    + body
    + '</body></html>';
}

/* ── Export: open print dialog ── */
function openPrint() {
  const b = getExportBody();
  if (!b) return;
  const w = window.open(URL.createObjectURL(new Blob([buildDoc(b)], { type: 'text/html' })), '_blank');
  if (w) w.onload = function () { w.focus(); w.print(); };
}
