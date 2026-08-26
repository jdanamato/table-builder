/* ── Elements ── */
const inp     = document.getElementById('html-in');
const prev    = document.getElementById('preview');
const sizeSel = document.getElementById('size-sel');
const clsVal  = document.getElementById('class-val');
const status  = document.getElementById('preview-status');

/* ── Modifier state ── */
function getClasses() {
  const c = [];
  document.querySelectorAll('[data-mod]').forEach(cb => { if (cb.checked) c.push(cb.dataset.mod); });
  if (sizeSel.value) c.push(sizeSel.value);
  return c;
}

/* ── Render preview ── */
function render() {
  const v = inp.value.trim();
  const classes = getClasses();

  clsVal.textContent = classes.join(' ');

  if (!v) {
    prev.innerHTML = '<p class="empty-state">Paste table HTML on the left to preview.</p>';
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
    [...table.classList].filter(c => c.startsWith('cc-')).forEach(c => table.classList.remove(c));
    classes.forEach(c => table.classList.add(c));
    const rows = table.querySelectorAll('tbody tr').length;
    const firstRow = table.querySelector('tr');
    const cols = firstRow ? firstRow.children.length : 0;
    status.textContent = rows + ' rows · ' + cols + ' cols';
  } else {
    status.textContent = '';
  }

  prev.innerHTML = tmp.innerHTML;
}

/* ── Strip inline styles ── */
function stripStyles() {
  const tmp = document.createElement('div');
  tmp.innerHTML = inp.value;
  tmp.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
  inp.value = tmp.innerHTML;
  render();
}

/* ── Event listeners ── */
inp.addEventListener('input', render);
document.querySelectorAll('[data-mod]').forEach(cb => cb.addEventListener('change', render));
sizeSel.addEventListener('change', render);

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
const PRINT_CSS = [
  '*{box-sizing:border-box}',
  'body{font-family:system-ui,-apple-system,sans-serif;margin:1.5cm;color:#18181b}',
  'header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #e4e4e7;margin-bottom:1.5rem}',
  '.brand{font-size:15px;font-weight:600;letter-spacing:-.02em}',
  '.brand img{display:inline-block;max-height:36px;max-width:200px;width:auto;height:auto;vertical-align:middle}',
  '.meta{font-size:11px;color:#71717a}',
  'div:has(>table){overflow:visible;border:1px solid #e4e4e7;border-radius:10px;background:#fafafa}',
  'table{width:100%;table-layout:auto;border-collapse:separate;border-spacing:0;font-size:12px;font-variant-numeric:tabular-nums}',
  'th,td{padding:8px 12px;vertical-align:middle;text-align:start;white-space:nowrap}',
  'thead :is(th,td){font-weight:600;background:#fafafa;border-bottom:1px solid #e4e4e7;font-size:11px;color:#52525b}',
  'tfoot :is(th,td){font-weight:600;border-top:1px solid #e4e4e7}',
  'caption{padding:8px 12px;text-align:start;font-weight:600;color:#52525b;font-size:11px}',
  'tbody tr:hover>*{background:rgba(0,0,0,.04)}',
  'tr:has(>th[colspan])>th{background:#fafafa;font-weight:700;color:#52525b;border-bottom:1px solid #e4e4e7}',
  '.cc-zebra tbody tr:nth-child(odd)>*{background:rgba(0,0,0,.025)}',
  '.cc-row-lines tbody tr:not(:last-child)>*{border-bottom:1px solid #e4e4e7}',
  '.cc-col-lines tr>*:not(:last-child){border-right:1px solid #e4e4e7}',
  '.cc-numeric tbody td{text-align:right}',
  '.cc-numeric :is(th,td):first-child{text-align:left}',
  'div:has(>table.cc-bare){background:transparent;border:none;border-radius:0}',
  '.cc-size-1 :is(thead,tbody,tfoot) :is(th,td){padding:5px 8px}',
  '.cc-size-3 :is(thead,tbody,tfoot) :is(th,td){padding:12px 16px}',
  '.table-title{font-size:15px;font-weight:600;color:#18181b;margin-bottom:12px}',
  '.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}',
  '@media print{body{margin:1cm}}'
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
  const titleText = (document.getElementById('print-title').value || '').trim();
  const brandHtml = logoDataUrl
    ? '<img src="' + logoDataUrl + '" alt="Logo" />'
    : brandText;
  const titleHtml = titleText ? '<p class="table-title">' + titleText + '</p>' : '';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>AutoDrill Chart</title><style>'
    + PRINT_CSS
    + '</style></head><body>'
    + '<header><span class="brand">' + brandHtml + '</span><span class="meta">' + metaText + '</span></header>'
    + titleHtml
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
