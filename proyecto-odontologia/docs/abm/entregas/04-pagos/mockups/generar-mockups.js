const fs = require("fs");
const path = require("path");

/* Wireframes en escala de grises — mismo estilo que docs/abm/entregas/03-tratamientos. */
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
.badge.canc { background:#f0f0f0; color:#8a8a8a; }
.btn { border:1.5px solid #b8b8b8; border-radius:8px; padding:7px 12px; font-size:12px; color:#4a4a4a; background:#ffffff; display:inline-block; }
.btn.sm { padding:5px 10px; font-size:11px; }
.btn.dis { color:#b3b3b3; border-color:#dcdcdc; }
.btn.primary { background:#2f2f2f; border-color:#2f2f2f; color:#ffffff; font-weight:700; }
.headerbtn { position:absolute; top:28px; right:32px; display:flex; gap:10px; }
.pager { display:flex; align-items:center; justify-content:space-between; padding:13px 16px; color:#8a8a8a; font-size:12px; }
.pager .pbtns { display:flex; gap:8px; }
.note { margin-top:12px; color:#8a8a8a; font-size:12px; font-style:italic; }
.msg { margin-top:14px; border:1px solid #cfcfcf; background:#f3f3f3; border-radius:8px; padding:12px 14px; font-size:12px; color:#5a5a5a; }
.msg.warn { border-color:#b8b8b8; background:#ededed; }
.fichahead { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
.chips { margin-top:8px; color:#8a8a8a; font-size:13px; }
.panel { border:1px solid #d8d8d8; border-radius:10px; margin-top:16px; padding:16px 18px; }
.panel h2 { font-size:14px; color:#1f1f1f; margin-bottom:12px; }
.panel .h2row { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.panel .h2row h2 { margin:0; }
.saldo { display:flex; gap:26px; padding:12px 14px; border:1px solid #e2e2e2; border-radius:10px; background:#f9f9f9; margin-bottom:12px; }
.saldo div { display:flex; flex-direction:column; gap:3px; }
.saldo dt { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#8a8a8a; font-weight:700; }
.saldo dd { font-size:14px; color:#1f1f1f; }
.saldo .big dd { font-size:18px; font-weight:800; }
.grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px 18px; }
.grid dt { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#8a8a8a; font-weight:700; }
.grid dd { font-size:13px; color:#1f1f1f; margin-top:3px; }
.overlay { position:absolute; inset:0; background:rgba(70,70,70,.28); display:flex; align-items:center; justify-content:center; }
.modal { width:540px; background:#ffffff; border:1.5px solid #2f2f2f; border-radius:16px; padding:24px; max-height:600px; overflow:auto; }
.modal.sm { width:440px; }
.modal h2 { font-size:19px; color:#1f1f1f; font-weight:800; }
.modal p { color:#7a7a7a; font-size:13px; margin-top:8px; line-height:1.5; }
.fgrid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-top:14px; }
.field label { display:block; font-size:12px; font-weight:700; color:#5a5a5a; margin-bottom:6px; }
.field .fi { width:100%; border:1.5px solid #c4c4c4; border-radius:8px; padding:9px 11px; font-size:13px; color:#6a6a6a; }
.field .fi.lock { background:#efefef; color:#a5a5a5; border-style:dashed; }
.field.full { grid-column:1 / -1; }
.field textarea.fi { height:52px; }
.errbox { margin-top:12px; border:1px solid #b8b8b8; background:#f0f0f0; border-radius:8px; padding:10px 12px; font-size:12px; color:#5a5a5a; }
.actions { display:flex; justify-content:flex-end; gap:12px; margin-top:18px; }
`;

const NAV = ["Inicio", "Pacientes", "Tratamientos", "Pagos", "Reportes", "Administración", "Catálogos"];

const shell = (crumb, bodyHtml, activeNav = "Pagos") => {
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
const saldoBox = (precio, pagado, saldo) => `
<div class="saldo">
  <div><dt>Precio del tratamiento</dt><dd>${precio}</dd></div>
  <div><dt>Total pagado</dt><dd>${pagado}</dd></div>
  <div class="big"><dt>Saldo pendiente</dt><dd>${saldo}</dd></div>
</div>`;

const tablaPagos = (filas, conAccion = true) => `
<table>
  <thead><tr><th>Fecha</th><th>Monto</th><th>Medio</th><th>Notas</th><th>Estado</th>${conAccion ? "<th></th>" : ""}</tr></thead>
  <tbody>${filas}</tbody>
</table>`;

const filaPago = (f, m, med, notas, estado, cls, accion) => `
<tr class="${cls === "anu" ? "anul" : ""}">
  <td>${f}</td><td>${m}</td><td>${med}</td><td>${notas}</td>
  <td><span class="badge ${cls}">${estado}</span></td>
  ${accion === undefined ? "" : `<td style="text-align:right">${accion}</td>`}
</tr>`;

// ── Figura 1 — HU1 Registrar pago (modal desde el detalle del tratamiento) ──
const fig1 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Tratamiento</div>
    <h1>Pérez, Ana</h1>
    <div class="chips">endodoncia · ID 1 · <span class="badge proc">en proceso</span></div>
  </div>
</div>
<div class="panel">
  <div class="h2row"><h2>Pagos (1)</h2><span class="btn primary">Registrar pago</span></div>
  ${saldoBox("$ 50.000,00", "$ 20.000,00", "$ 30.000,00")}
</div>
<div class="overlay">
  <div class="modal">
    <h2>Registrar pago</h2>
    <p>El monto y el medio de pago son obligatorios. Si no indicás fecha, se usa la de hoy.</p>
    <p style="margin-top:4px;color:#8a8a8a">Tratamiento: <b>endodoncia · Pérez, Ana</b></p>
    <div class="fgrid">
      <div class="field"><label>Monto *</label><div class="fi">10000</div></div>
      <div class="field"><label>Medio de pago *</label><div class="fi">transferencia</div></div>
      <div class="field"><label>Fecha del pago</label><div class="fi">02/05/2026</div></div>
      <div class="field full"><label>Notas</label><textarea class="fi">Segunda cuota</textarea></div>
    </div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Registrar pago</span></div>
  </div>
</div>`;

// ── Figura 2 — HU4 Caja: listado global + filtros + totales ─────────────────
const fig2 = `
<h1>Pagos</h1>
<div class="sub">Caja del consultorio: todos los pagos registrados contra tratamientos, con su medio y su estado.</div>
<div class="card">
  <div class="filters">
    <span class="inp">Vigentes &#9662;</span>
    <span class="inp">Todos los medios &#9662;</span>
    <span class="inp">Desde 01/04/2026</span>
    <span class="inp">Hasta 31/05/2026</span>
    <span class="inp">Fecha de pago &#8595; &#9662;</span>
  </div>
  <div style="display:flex;gap:32px;padding:4px 16px 14px">
    <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8a8a8a;font-weight:700">Total vigente</div><div style="font-size:16px;font-weight:800;color:#1f1f1f">$ 30.000,00</div></div>
    <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8a8a8a;font-weight:700">Total anulado</div><div style="font-size:16px;color:#1f1f1f">$ 25.000,00</div></div>
  </div>
  <table>
    <thead><tr><th>Fecha</th><th>Paciente</th><th>Tratamiento</th><th>Monto</th><th>Medio</th><th>Estado</th><th></th></tr></thead>
    <tbody>
      <tr><td>02 may 2026</td><td><span class="nm">Pérez, Ana</span></td><td>endodoncia</td><td>$ 10.000,00</td><td>transferencia</td><td><span class="badge vig">vigente</span></td><td style="text-align:right"><span class="btn sm">Anular</span></td></tr>
      <tr><td>28 abr 2026</td><td><span class="nm">Pérez, Ana</span></td><td>endodoncia</td><td>$ 20.000,00</td><td>efectivo</td><td><span class="badge vig">vigente</span></td><td style="text-align:right"><span class="btn sm">Anular</span></td></tr>
    </tbody>
  </table>
  <div class="pager"><span>2 pagos · página 1 de 1</span><div class="pbtns"><span class="btn dis">Anterior</span><span class="btn dis">Siguiente</span></div></div>
</div>
<div class="note">Filtros por estado (vigentes / anulados / todos), medio de pago y rango de fechas de pago, con totales por estado. Todo filtrado por consultorio.</div>`;

// ── Figura 3 — HU2 Editar pago (monto bloqueado) ───────────────────────────
const fig3 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Tratamiento</div>
    <h1>Pérez, Ana</h1>
    <div class="chips">endodoncia · ID 1 · <span class="badge proc">en proceso</span></div>
  </div>
</div>
<div class="panel">
  <div class="h2row"><h2>Pagos (2)</h2><span class="btn primary">Registrar pago</span></div>
  ${saldoBox("$ 50.000,00", "$ 30.000,00", "$ 20.000,00")}
</div>
<div class="overlay">
  <div class="modal">
    <h2>Editar pago</h2>
    <p>El monto no se edita: para corregirlo, anulá el pago y registrá uno nuevo.</p>
    <div class="fgrid">
      <div class="field"><label>Monto *</label><div class="fi lock">10000</div></div>
      <div class="field"><label>Medio de pago *</label><div class="fi">tarjeta</div></div>
      <div class="field"><label>Fecha del pago</label><div class="fi">02/05/2026</div></div>
      <div class="field full"><label>Notas</label><textarea class="fi">Se corrige el medio: fue con tarjeta de débito.</textarea></div>
    </div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Guardar cambios</span></div>
  </div>
</div>`;

// ── Figura 4 — HU3 Anular pago con motivo ──────────────────────────────────
const fig4 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Tratamiento</div>
    <h1>Pérez, Ana</h1>
    <div class="chips">endodoncia · ID 1 · <span class="badge proc">en proceso</span></div>
  </div>
</div>
<div class="panel">
  <div class="h2row"><h2>Pagos (2)</h2><span class="btn primary">Registrar pago</span></div>
  ${saldoBox("$ 50.000,00", "$ 55.000,00", "-$ 5.000,00")}
  ${tablaPagos(
    filaPago("03 may 2026", "$ 25.000,00", "transferencia", "—", "vigente", "vig", `<span class="btn sm">Anular</span>`) +
    filaPago("02 may 2026", "$ 10.000,00", "tarjeta", "—", "vigente", "vig", `<span class="btn sm">Anular</span>`) +
    filaPago("28 abr 2026", "$ 20.000,00", "efectivo", "Pago parcial en efectivo", "vigente", "vig", `<span class="btn sm">Anular</span>`)
  )}
</div>
<div class="overlay">
  <div class="modal sm">
    <h2>Anular pago</h2>
    <p>Vas a anular un pago de $ 25.000,00. No cuenta más para el saldo del tratamiento ni para la caja, y no se puede revertir.</p>
    <div style="margin-top:14px">
      <div class="field full"><label>Motivo de anulación *</label><textarea class="fi">Pago cargado por error en el tratamiento equivocado</textarea></div>
    </div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Anular pago</span></div>
  </div>
</div>`;

// ── Figura 5 — HU5 Sobrepago: banner de advertencia ───────────────────────
const fig5 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Tratamiento</div>
    <h1>Pérez, Ana</h1>
    <div class="chips">endodoncia · ID 1 · <span class="badge proc">en proceso</span></div>
  </div>
</div>
<div class="panel">
  <div class="h2row"><h2>Pagos (2)</h2><span class="btn primary">Registrar pago</span></div>
  ${saldoBox("$ 50.000,00", "$ 55.000,00", "-$ 5.000,00")}
  <div class="msg warn">El total pagado supera el precio del tratamiento.</div>
  ${tablaPagos(
    filaPago("03 may 2026", "$ 35.000,00", "transferencia", "Saldo final", "vigente", "vig", `<span class="btn sm">Anular</span>`) +
    filaPago("28 abr 2026", "$ 20.000,00", "efectivo", "Pago parcial en efectivo", "vigente", "vig", `<span class="btn sm">Anular</span>`)
  )}
</div>
<div class="note">El sobrepago no se bloquea: el pago se registra y se muestra la advertencia (banner). La constante PERMITIR_SOBREPAGO permite invertir la política.</div>`;

// ── Figura 6 — HU1/HU3 Detalle del tratamiento con la sección Pagos ────────
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
    <div><dt>Total cobrado</dt><dd>$ 30.000,00</dd></div>
    <div><dt>Saldo pendiente</dt><dd>$ 20.000,00</dd></div>
  </dl>
</div>
<div class="panel">
  <div class="h2row"><h2>Pagos (3)</h2><span class="btn primary">Registrar pago</span></div>
  ${saldoBox("$ 50.000,00", "$ 30.000,00", "$ 20.000,00")}
  ${tablaPagos(
    filaPago("03 may 2026", "$ 25.000,00", "transferencia", "—", "anulado", "anu", "") +
    filaPago("02 may 2026", "$ 10.000,00", "tarjeta", "Segunda cuota", "vigente", "vig", `<span class="btn sm">Anular</span>`) +
    filaPago("28 abr 2026", "$ 20.000,00", "efectivo", "Pago parcial en efectivo", "vigente", "vig", `<span class="btn sm">Anular</span>`)
  )}
</div>`;

// ── Figura 7 — HU6 Permisos: sección Pagos en modo solo lectura ────────────
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
  <div class="h2row"><h2>Pagos (2)</h2></div>
  ${saldoBox("$ 50.000,00", "$ 30.000,00", "$ 20.000,00")}
  ${tablaPagos(
    filaPago("02 may 2026", "$ 10.000,00", "tarjeta", "Segunda cuota", "vigente", "vig", undefined) +
    filaPago("28 abr 2026", "$ 20.000,00", "efectivo", "Pago parcial en efectivo", "vigente", "vig", undefined),
    false
  )}
</div>
<div class="msg">El usuario tiene ver_pagos pero no registrar_pagos ni anular_pagos: ve el saldo y los pagos pero no aparecen el botón «Registrar pago» ni la acción «Anular», y el backend responde 403 a POST y PATCH. El ítem de menú «Pagos» sólo se muestra con ver_pagos.</div>`;

const CR = "Panel &#8250; <b>Pagos</b>";
const CR_DET = "Panel &#8250; Tratamientos &#8250; <b>Detalle del tratamiento</b>";

const OUT = __dirname;
const paginas = [
  ["fig1-registrar.html", shell(CR_DET, fig1, "Tratamientos")],
  ["fig2-caja.html", shell(CR, fig2)],
  ["fig3-editar.html", shell(CR_DET, fig3, "Tratamientos")],
  ["fig4-anular.html", shell(CR_DET, fig4, "Tratamientos")],
  ["fig5-sobrepago.html", shell(CR_DET, fig5, "Tratamientos")],
  ["fig6-detalle.html", shell(CR_DET, fig6, "Tratamientos")],
  ["fig7-permisos.html", shell(CR_DET, fig7, "Tratamientos")],
];

for (const [archivo, html] of paginas) {
  fs.writeFileSync(path.join(OUT, archivo), html);
}
console.log(`${paginas.length} mockups HTML escritos en ${OUT}`);
