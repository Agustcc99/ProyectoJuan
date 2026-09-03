const fs = require("fs");
const path = require("path");

/* Wireframes en escala de grises — mismo estilo que docs/abm/entregas/04-pagos. */
const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html,body { background:#ffffff; }
body { font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; color:#3f3f3f; }
.frame { width:1000px; height:680px; background:#ffffff; display:flex; border:1px solid #cfcfcf; overflow:hidden; }
.side { width:210px; border-right:1px solid #cfcfcf; background:#fafafa; padding:0; flex-shrink:0; }
.brand { display:flex; align-items:center; gap:10px; padding:16px; border-bottom:1px solid #e2e2e2; }
.brand .logo { width:34px; height:34px; border:1.5px solid #6f6f6f; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; color:#4a4a4a; }
.brand .bt { font-weight:700; color:#2f2f2f; line-height:1.15; font-size:14px; }
.nav { padding:14px 10px; }
.nav .it { display:flex; align-items:center; gap:12px; padding:11px 12px; color:#7a7a7a; font-size:14px; border-radius:6px; margin-bottom:4px; }
.nav .it .sq { width:14px; height:14px; border:1.5px solid #9a9a9a; }
.nav .it.active { background:#e9e9e9; color:#1f1f1f; font-weight:700; }
.nav .it.active .sq { background:#2f2f2f; border-color:#2f2f2f; }
.main { flex:1; display:flex; flex-direction:column; }
.top { height:64px; border-bottom:1px solid #cfcfcf; display:flex; align-items:center; padding:0 26px; gap:12px; }
.crumb { color:#8a8a8a; font-size:15px; letter-spacing:.2px; }
.crumb b { color:#5a5a5a; font-weight:600; }
.who { margin-left:auto; color:#8a8a8a; font-size:14px; display:flex; align-items:center; gap:12px; }
.who .av { width:34px; height:34px; border:1.5px solid #9a9a9a; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#6a6a6a; }
.body { flex:1; padding:28px 32px; position:relative; }
h1 { font-size:28px; color:#1f1f1f; font-weight:800; }
.sub { color:#8a8a8a; margin-top:6px; font-size:13px; max-width:560px; }
.card { border:1px solid #d8d8d8; border-radius:10px; margin-top:16px; }
.filters { display:flex; gap:10px; padding:14px 16px; align-items:center; flex-wrap:wrap; }
.inp { border:1.5px solid #c4c4c4; border-radius:8px; padding:9px 11px; font-size:12px; color:#9a9a9a; }
.inp.grow { flex:1; min-width:180px; }
table { width:100%; border-collapse:collapse; }
th { text-align:left; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#7a7a7a; padding:11px 16px; border-bottom:1px solid #e2e2e2; background:#f6f6f6; }
td { padding:12px 16px; border-bottom:1px solid #ececec; font-size:13px; color:#3f3f3f; }
td .nm { font-weight:700; color:#1f1f1f; }
tr.anul td { color:#a5a5a5; text-decoration:line-through; }
tr.anul td .badge { text-decoration:none; }
.badge { display:inline-block; border:1px solid #bcbcbc; border-radius:999px; padding:3px 10px; font-size:11px; font-weight:700; color:#4a4a4a; background:#f3f3f3; }
.badge.vig { background:#dcdcdc; border-color:#8f8f8f; }
.badge.anu { background:#f0f0f0; color:#8a8a8a; }
.badge.proc { background:#e3e3e3; border-color:#a5a5a5; }
.btn { border:1.5px solid #b8b8b8; border-radius:8px; padding:7px 12px; font-size:12px; color:#4a4a4a; background:#ffffff; display:inline-block; }
.btn.sm { padding:5px 10px; font-size:11px; }
.btn.dis { color:#b3b3b3; border-color:#dcdcdc; }
.btn.primary { background:#2f2f2f; border-color:#2f2f2f; color:#ffffff; font-weight:700; }
.pager { display:flex; align-items:center; justify-content:space-between; padding:13px 16px; color:#8a8a8a; font-size:12px; }
.pager .pbtns { display:flex; gap:8px; }
.note { margin-top:12px; color:#8a8a8a; font-size:12px; font-style:italic; }
.msg { margin-top:14px; border:1px solid #cfcfcf; background:#f3f3f3; border-radius:8px; padding:12px 14px; font-size:12px; color:#5a5a5a; }
.fichahead { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
.chips { margin-top:8px; color:#8a8a8a; font-size:13px; }
.panel { border:1px solid #d8d8d8; border-radius:10px; margin-top:16px; padding:16px 18px; }
.panel h2 { font-size:14px; color:#1f1f1f; margin-bottom:12px; }
.panel .h2row { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.panel .h2row h2 { margin:0; }
.total { display:flex; gap:26px; padding:12px 14px; border:1px solid #e2e2e2; border-radius:10px; background:#f9f9f9; margin-bottom:12px; }
.total div { display:flex; flex-direction:column; gap:3px; }
.total dt { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#8a8a8a; font-weight:700; }
.total dd { font-size:14px; color:#1f1f1f; }
.total .big dd { font-size:18px; font-weight:800; }
.grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px 18px; }
.grid dt { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#8a8a8a; font-weight:700; }
.grid dd { font-size:13px; color:#1f1f1f; margin-top:3px; }
.overlay { position:absolute; inset:0; background:rgba(70,70,70,.28); display:flex; align-items:center; justify-content:center; }
.modal { width:540px; background:#ffffff; border:1.5px solid #2f2f2f; border-radius:16px; padding:24px; max-height:600px; overflow:auto; }
.modal.sm { width:440px; }
.modal h2 { font-size:19px; color:#1f1f1f; font-weight:800; }
.modal p { color:#7a7a7a; font-size:13px; margin-top:8px; line-height:1.5; }
.toggle { display:flex; gap:22px; margin-top:12px; font-size:13px; color:#4a4a4a; }
.toggle .rb { display:flex; align-items:center; gap:7px; }
.toggle .dot { width:13px; height:13px; border:1.5px solid #7a7a7a; border-radius:50%; display:inline-block; }
.toggle .dot.on { background:#2f2f2f; box-shadow:inset 0 0 0 2px #ffffff; }
.tlabel { font-size:12px; font-weight:700; color:#5a5a5a; margin-top:14px; }
.fgrid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-top:10px; }
.field label { display:block; font-size:12px; font-weight:700; color:#5a5a5a; margin-bottom:6px; }
.field .fi { width:100%; border:1.5px solid #c4c4c4; border-radius:8px; padding:9px 11px; font-size:13px; color:#6a6a6a; }
.field .fi.lock { background:#efefef; color:#a5a5a5; border-style:dashed; }
.field.full { grid-column:1 / -1; }
.field textarea.fi { height:52px; }
.actions { display:flex; justify-content:flex-end; gap:12px; margin-top:18px; }
`;

const NAV = ["Inicio", "Pacientes", "Tratamientos", "Pagos", "Gastos", "Reportes", "Administración", "Catálogos"];

const shell = (crumb, bodyHtml, activeNav = "Gastos") => {
  const nav = NAV.map(
    (n) => `<div class="it${n === activeNav ? " active" : ""}"><span class="sq"></span>${n}</div>`
  ).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="frame">
  <div class="side">
    <div class="brand"><div class="logo">H</div><div class="bt">Consultorio<br>Herrera</div></div>
    <div class="nav">${nav}</div>
  </div>
  <div class="main">
    <div class="top"><div class="crumb">${crumb}</div>
      <div class="who">Julieta · Asistente <span class="av">J</span></div>
    </div>
    <div class="body">${bodyHtml}</div>
  </div>
</div>
</body></html>`;
};

// ── secciones reutilizables ────────────────────────────────────────────────
const tablaGastos = (filas, conAccion = true) => `
<table>
  <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Monto</th><th>Estado</th>${conAccion ? "<th></th>" : ""}</tr></thead>
  <tbody>${filas}</tbody>
</table>`;

const filaGasto = (f, tipo, desc, monto, estado, cls, accion) => `
<tr class="${cls === "anu" ? "anul" : ""}">
  <td>${f}</td><td>${tipo}</td><td>${desc}</td><td>${monto}</td>
  <td><span class="badge ${cls}">${estado}</span></td>
  ${accion === undefined ? "" : `<td style="text-align:right">${accion}</td>`}
</tr>`;

const rb = (label, on) =>
  `<span class="rb"><span class="dot${on ? " on" : ""}"></span>${label}</span>`;

// ── Figura 1 — HU1 Registrar gasto general (modal desde la página Gastos) ───
const fig1 = `
<h1>Gastos</h1>
<div class="sub">Egresos del consultorio: generales o imputados a un tratamiento, con su tipo y su estado.</div>
<div class="card">
  <div class="filters">
    <span class="inp">Vigentes &#9662;</span>
    <span class="inp">Todos los tipos &#9662;</span>
    <span class="inp">Todas las imputaciones &#9662;</span>
  </div>
</div>
<div class="overlay">
  <div class="modal">
    <h2>Registrar gasto</h2>
    <p>El tipo de gasto y el monto son obligatorios. Si no indicás fecha, se usa la de hoy.</p>
    <div class="tlabel">Imputación</div>
    <div class="toggle">${rb("Gasto general", true)}${rb("De un tratamiento", false)}</div>
    <div class="fgrid">
      <div class="field"><label>Tipo de gasto *</label><div class="fi">insumo</div></div>
      <div class="field"><label>Monto *</label><div class="fi">15000</div></div>
      <div class="field"><label>Fecha del gasto</label><div class="fi">02/05/2026</div></div>
      <div class="field full"><label>Descripción</label><textarea class="fi">Compra de guantes descartables del mes</textarea></div>
    </div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Registrar gasto</span></div>
  </div>
</div>`;

// ── Figura 2 — HU4 Listado + filtros + total del período ────────────────────
const fig2 = `
<h1>Gastos</h1>
<div class="sub">Egresos del consultorio: generales o imputados a un tratamiento, con su tipo y su estado.</div>
<div class="card">
  <div class="filters">
    <span class="inp">Vigentes &#9662;</span>
    <span class="inp">Todos los tipos &#9662;</span>
    <span class="inp">Todas las imputaciones &#9662;</span>
    <span class="inp">Desde 01/04/2026</span>
    <span class="inp">Hasta 31/05/2026</span>
    <span class="inp">Fecha del gasto &#8595; &#9662;</span>
  </div>
  <div style="display:flex;gap:32px;padding:4px 16px 14px">
    <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8a8a8a;font-weight:700">Total del período (vigente)</div><div style="font-size:16px;font-weight:800;color:#1f1f1f">$ 45.000,00</div></div>
    <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8a8a8a;font-weight:700">Total anulado</div><div style="font-size:16px;color:#1f1f1f">$ 0,00</div></div>
  </div>
  <table>
    <thead><tr><th>Fecha</th><th>Tipo</th><th>Imputación</th><th>Descripción</th><th>Monto</th><th>Estado</th><th></th></tr></thead>
    <tbody>
      <tr><td>28 abr 2026</td><td>laboratorio</td><td><span class="nm">Pérez, Ana</span> · endodoncia</td><td>Costo de laboratorio</td><td>$ 30.000,00</td><td><span class="badge vig">vigente</span></td><td style="text-align:right"><span class="btn sm">Editar</span> <span class="btn sm">Anular</span></td></tr>
      <tr><td>28 abr 2026</td><td>insumo</td><td>General</td><td>Compra de guantes descartables</td><td>$ 15.000,00</td><td><span class="badge vig">vigente</span></td><td style="text-align:right"><span class="btn sm">Editar</span> <span class="btn sm">Anular</span></td></tr>
    </tbody>
  </table>
  <div class="pager"><span>2 gastos · página 1 de 1</span><div class="pbtns"><span class="btn dis">Anterior</span><span class="btn dis">Siguiente</span></div></div>
</div>
<div class="note">Filtros por estado (vigentes / anulados / todos), tipo de gasto, imputación (general / de un tratamiento) y rango de fechas del gasto, con el total del período. Todo filtrado por consultorio.</div>`;

// ── Figura 3 — HU2 Editar gasto (monto bloqueado) ─────────────────────────
const fig3 = `
<h1>Gastos</h1>
<div class="sub">Egresos del consultorio: generales o imputados a un tratamiento, con su tipo y su estado.</div>
<div class="card"><div class="filters"><span class="inp">Vigentes &#9662;</span><span class="inp">Todos los tipos &#9662;</span></div></div>
<div class="overlay">
  <div class="modal">
    <h2>Editar gasto</h2>
    <p>El monto no se edita: para corregirlo, anulá el gasto y registrá uno nuevo.</p>
    <div class="tlabel">Imputación</div>
    <div class="toggle">${rb("Gasto general", false)}${rb("De un tratamiento", true)}</div>
    <div class="fgrid">
      <div class="field"><label>Tipo de gasto *</label><div class="fi">servicio externo</div></div>
      <div class="field"><label>Monto *</label><div class="fi lock">15000</div></div>
      <div class="field"><label>Fecha del gasto</label><div class="fi">02/05/2026</div></div>
    </div>
    <div class="field full" style="margin-top:14px"><label>Tratamiento *</label><div class="fi">#1 · Pérez, Ana · endodoncia</div></div>
    <div class="field full" style="margin-top:14px"><label>Descripción</label><textarea class="fi">Se reclasifica: era un servicio externo imputado al tratamiento.</textarea></div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Guardar cambios</span></div>
  </div>
</div>`;

// ── Figura 4 — HU3 Anular gasto con motivo ────────────────────────────────
const fig4 = `
<h1>Gastos</h1>
<div class="sub">Egresos del consultorio: generales o imputados a un tratamiento, con su tipo y su estado.</div>
<div class="card">
  <div class="filters"><span class="inp">Todos &#9662;</span><span class="inp">Todos los tipos &#9662;</span></div>
  <table>
    <thead><tr><th>Fecha</th><th>Tipo</th><th>Imputación</th><th>Descripción</th><th>Monto</th><th>Estado</th><th></th></tr></thead>
    <tbody>
      <tr><td>02 may 2026</td><td>insumo</td><td>General</td><td>Compra duplicada por error</td><td>$ 15.000,00</td><td><span class="badge vig">vigente</span></td><td style="text-align:right"><span class="btn sm">Editar</span> <span class="btn sm">Anular</span></td></tr>
    </tbody>
  </table>
</div>
<div class="overlay">
  <div class="modal sm">
    <h2>Anular gasto</h2>
    <p>Vas a anular un gasto de $ 15.000,00. Deja de contar para el total del período y para los reportes, y no se puede revertir.</p>
    <div style="margin-top:14px">
      <div class="field full"><label>Motivo de anulación *</label><textarea class="fi">Gasto cargado dos veces por error</textarea></div>
    </div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Anular gasto</span></div>
  </div>
</div>`;

// ── Figura 5 — HU1 Registrar gasto imputado (toggle + selector) ───────────
const fig5 = `
<h1>Gastos</h1>
<div class="sub">Egresos del consultorio: generales o imputados a un tratamiento, con su tipo y su estado.</div>
<div class="card"><div class="filters"><span class="inp">Vigentes &#9662;</span><span class="inp">Todos los tipos &#9662;</span></div></div>
<div class="overlay">
  <div class="modal">
    <h2>Registrar gasto</h2>
    <p>El tipo de gasto y el monto son obligatorios. Si no indicás fecha, se usa la de hoy.</p>
    <div class="tlabel">Imputación</div>
    <div class="toggle">${rb("Gasto general", false)}${rb("De un tratamiento", true)}</div>
    <div class="fgrid">
      <div class="field"><label>Tipo de gasto *</label><div class="fi">laboratorio</div></div>
      <div class="field"><label>Monto *</label><div class="fi">30000</div></div>
      <div class="field"><label>Fecha del gasto</label><div class="fi">28/04/2026</div></div>
    </div>
    <div class="field full" style="margin-top:14px"><label>Tratamiento *</label><div class="fi">#1 · Pérez, Ana · endodoncia</div></div>
    <div class="field full" style="margin-top:14px"><label>Descripción</label><textarea class="fi">Costo de laboratorio para la corona del tratamiento</textarea></div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Registrar gasto</span></div>
  </div>
</div>`;

// ── Figura 6 — HU5 Sección "Gastos imputados" en el detalle del tratamiento ─
const fig6 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Tratamiento</div>
    <h1>Pérez, Ana</h1>
    <div class="chips">endodoncia · ID 1 · <span class="badge proc">en proceso</span></div>
  </div>
  <div style="display:flex;gap:10px"><span class="btn">Volver</span><span class="btn primary">Editar</span><span class="btn">Cambiar estado</span></div>
</div>
<div class="panel">
  <h2>Datos del tratamiento</h2>
  <dl class="grid">
    <div><dt>Precio del paciente</dt><dd>$ 50.000,00</dd></div>
    <div><dt>Total cobrado</dt><dd>$ 20.000,00</dd></div>
    <div><dt>Saldo pendiente</dt><dd>$ 30.000,00</dd></div>
  </dl>
</div>
<div class="panel">
  <div class="h2row"><h2>Gastos imputados (2)</h2><span class="btn primary">Imputar gasto</span></div>
  <div class="total">
    <div class="big"><dt>Total imputado (vigente)</dt><dd>$ 30.000,00</dd></div>
    <div><dt>Anulado</dt><dd>$ 8.500,00</dd></div>
  </div>
  ${tablaGastos(
    filaGasto("28 abr 2026", "laboratorio", "Costo de laboratorio para tratamiento", "$ 30.000,00", "vigente", "vig", `<span class="btn sm">Anular</span>`) +
    filaGasto("03 may 2026", "laboratorio", "Ajuste de laboratorio cargado de más", "$ 8.500,00", "anulado", "anu", "")
  )}
</div>`;

// ── Figura 7 — HU6 Sección "Gastos imputados" en modo solo lectura ────────
const fig7 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Tratamiento</div>
    <h1>Pérez, Ana</h1>
    <div class="chips">endodoncia · ID 1 · <span class="badge proc">en proceso</span></div>
  </div>
  <div style="display:flex;gap:10px"><span class="btn">Volver</span><span class="btn dis">Editar</span></div>
</div>
<div class="panel">
  <div class="h2row"><h2>Gastos imputados (1)</h2></div>
  <div class="total"><div class="big"><dt>Total imputado (vigente)</dt><dd>$ 30.000,00</dd></div></div>
  ${tablaGastos(
    filaGasto("28 abr 2026", "laboratorio", "Costo de laboratorio para tratamiento", "$ 30.000,00", "vigente", "vig", undefined),
    false
  )}
</div>
<div class="msg">El usuario tiene ver_gastos pero no registrar_gastos ni anular_gastos: ve el total y los gastos imputados pero no aparecen el botón «Imputar gasto» ni la acción «Anular», y el backend responde 403 a POST y PATCH. El ítem de menú «Gastos» sólo se muestra con ver_gastos.</div>`;

const CR = "Panel &#8250; <b>Gastos</b>";
const CR_DET = "Panel &#8250; Tratamientos &#8250; <b>Detalle del tratamiento</b>";

const OUT = __dirname;
const paginas = [
  ["fig1-registrar.html", shell(CR, fig1)],
  ["fig2-listado.html", shell(CR, fig2)],
  ["fig3-editar.html", shell(CR, fig3)],
  ["fig4-anular.html", shell(CR, fig4)],
  ["fig5-imputado.html", shell(CR, fig5)],
  ["fig6-ficha.html", shell(CR_DET, fig6, "Tratamientos")],
  ["fig7-permisos.html", shell(CR_DET, fig7, "Tratamientos")],
];

for (const [archivo, html] of paginas) {
  fs.writeFileSync(path.join(OUT, archivo), html);
}
console.log(`${paginas.length} mockups HTML escritos en ${OUT}`);
