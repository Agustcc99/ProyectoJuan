const fs = require("fs");
const path = require("path");

/* Wireframes en escala de grises — mismo estilo que docs/abm/entregas/02-pacientes. */
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
.badge { display:inline-block; border:1px solid #bcbcbc; border-radius:999px; padding:3px 10px; font-size:11px; font-weight:700; color:#4a4a4a; background:#f3f3f3; }
.badge.pend { background:#eee; }
.badge.proc { background:#e3e3e3; border-color:#a5a5a5; }
.badge.fin  { background:#dcdcdc; border-color:#8f8f8f; }
.badge.canc { background:#f0f0f0; color:#8a8a8a; }
.btn { border:1.5px solid #b8b8b8; border-radius:8px; padding:7px 12px; font-size:12px; color:#4a4a4a; background:#ffffff; display:inline-block; }
.btn.dis { color:#b3b3b3; border-color:#dcdcdc; }
.btn.primary { background:#2f2f2f; border-color:#2f2f2f; color:#ffffff; font-weight:700; }
.headerbtn { position:absolute; top:28px; right:32px; display:flex; gap:10px; }
.pager { display:flex; align-items:center; justify-content:space-between; padding:13px 16px; color:#8a8a8a; font-size:12px; }
.pager .pbtns { display:flex; gap:8px; }
.note { margin-top:12px; color:#8a8a8a; font-size:12px; font-style:italic; }
.msg { margin-top:14px; border:1px solid #cfcfcf; background:#f3f3f3; border-radius:8px; padding:12px 14px; font-size:12px; color:#5a5a5a; }
.fichahead { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
.chips { margin-top:8px; color:#8a8a8a; font-size:13px; }
.panel { border:1px solid #d8d8d8; border-radius:10px; margin-top:16px; padding:16px 18px; }
.panel h2 { font-size:14px; color:#1f1f1f; margin-bottom:12px; }
.grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px 18px; }
.grid dt { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#8a8a8a; font-weight:700; }
.grid dd { font-size:13px; color:#1f1f1f; margin-top:3px; }
.tl { list-style:none; display:flex; flex-direction:column; gap:10px; }
.tl li { border-left:2px solid #d8d8d8; padding-left:14px; position:relative; }
.tl li::before { content:""; position:absolute; left:-6px; top:3px; width:10px; height:10px; border-radius:999px; background:#5a5a5a; border:2px solid #ffffff; box-shadow:0 0 0 2px #d8d8d8; }
.tl .txt { font-size:12.5px; color:#1f1f1f; font-weight:600; }
.tl .meta { font-size:11px; color:#8a8a8a; margin-top:2px; }
.overlay { position:absolute; inset:0; background:rgba(70,70,70,.28); display:flex; align-items:center; justify-content:center; }
.modal { width:560px; background:#ffffff; border:1.5px solid #2f2f2f; border-radius:16px; padding:24px; max-height:600px; overflow:auto; }
.modal.sm { width:440px; }
.modal h2 { font-size:19px; color:#1f1f1f; font-weight:800; }
.modal p { color:#7a7a7a; font-size:13px; margin-top:8px; line-height:1.5; }
.fgrid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:14px; }
.field label { display:block; font-size:12px; font-weight:700; color:#5a5a5a; margin-bottom:6px; }
.field .fi { width:100%; border:1.5px solid #c4c4c4; border-radius:8px; padding:9px 11px; font-size:13px; color:#6a6a6a; }
.field .fi.lock { background:#efefef; color:#a5a5a5; border-style:dashed; }
.field.full { grid-column:1 / -1; }
.field textarea.fi { height:52px; }
.errbox { margin-top:12px; border:1px solid #b8b8b8; background:#f0f0f0; border-radius:8px; padding:10px 12px; font-size:12px; color:#5a5a5a; }
.actions { display:flex; justify-content:flex-end; gap:12px; margin-top:18px; }
`;

const NAV = ["Inicio", "Pacientes", "Tratamientos", "Reportes", "Administración", "Catálogos"];

const shell = (crumb, bodyHtml, activeNav = "Tratamientos") => {
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

const fila = (pac, tipo, inicio, precio, saldo, estado, cls) => `
<tr>
  <td><span class="nm">${pac}</span></td>
  <td>${tipo}</td>
  <td>${inicio}</td>
  <td>${precio}</td>
  <td>${saldo}</td>
  <td><span class="badge ${cls}">${estado}</span></td>
</tr>`;

const THEAD = `<thead><tr><th>Paciente</th><th>Tipo</th><th>Inicio</th><th>Precio</th><th>Saldo</th><th>Estado</th></tr></thead>`;

// ── Figura 1 — HU13 Alta ────────────────────────────────────────────────────
const fig1 = `
<h1>Tratamientos</h1>
<div class="sub">Registrá y seguí los tratamientos del consultorio: su precio, su estado y el saldo pendiente de cada uno.</div>
<div class="headerbtn"><span class="btn primary">Nuevo tratamiento</span></div>
<div class="card">
  <div class="filters"><span class="inp grow">Buscar por paciente o descripción...</span><span class="inp">Todos los estados &#9662;</span><span class="inp">Todos los tipos &#9662;</span><span class="btn">Buscar</span></div>
  <table>${THEAD}<tbody>${fila("Pérez, Ana", "endodoncia", "28 abr 2026", "$ 50.000,00", "$ 30.000,00", "en proceso", "proc")}</tbody></table>
</div>
<div class="overlay">
  <div class="modal">
    <h2>Nuevo tratamiento</h2>
    <p>El paciente, el tipo y el precio son obligatorios. El estado inicial es «pendiente».</p>
    <div class="fgrid">
      <div class="field"><label>Paciente *</label><div class="fi">Pérez, Ana</div></div>
      <div class="field"><label>Tipo de tratamiento *</label><div class="fi">endodoncia</div></div>
      <div class="field"><label>Precio del paciente *</label><div class="fi">50000</div></div>
      <div class="field"><label>Fecha de inicio</label><div class="fi">01/05/2026</div></div>
      <div class="field full"><label>Descripción</label><div class="fi">Endodoncia en pieza 2.6</div></div>
      <div class="field full"><label>Observaciones</label><textarea class="fi"></textarea></div>
    </div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Guardar</span></div>
  </div>
</div>`;

// ── Figura 2 — HU14 Modificación (en proceso: campos bloqueados) ─────────────
const fig2 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Tratamiento</div>
    <h1>Pérez, Ana</h1>
    <div class="chips">endodoncia · ID 1 · <span class="badge proc">en proceso</span></div>
  </div>
</div>
<div class="panel">
  <h2>Datos del tratamiento</h2>
  <dl class="grid">
    <div><dt>Precio del paciente</dt><dd>$ 50.000,00</dd></div>
    <div><dt>Total cobrado</dt><dd>$ 20.000,00</dd></div>
    <div><dt>Saldo pendiente</dt><dd>$ 30.000,00</dd></div>
  </dl>
</div>
<div class="overlay">
  <div class="modal">
    <h2>Editar tratamiento</h2>
    <p>Tratamiento en proceso: no se puede cambiar el paciente ni el tipo.</p>
    <div class="fgrid">
      <div class="field"><label>Paciente *</label><div class="fi lock">Pérez, Ana</div></div>
      <div class="field"><label>Tipo de tratamiento *</label><div class="fi lock">endodoncia</div></div>
      <div class="field"><label>Precio del paciente *</label><div class="fi">65000</div></div>
      <div class="field"><label>Fecha de inicio</label><div class="fi lock">28/04/2026</div></div>
      <div class="field"><label>Fecha de fin</label><div class="fi">—</div></div>
      <div class="field full"><label>Observaciones</label><textarea class="fi">Ajuste de precio acordado con el paciente.</textarea></div>
    </div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Guardar</span></div>
  </div>
</div>`;

// ── Figura 3 — HU15 Consulta / listado + filtros ────────────────────────────
const fig3 = `
<h1>Tratamientos</h1>
<div class="sub">Registrá y seguí los tratamientos del consultorio: su precio, su estado y el saldo pendiente de cada uno.</div>
<div class="headerbtn"><span class="btn primary">Nuevo tratamiento</span></div>
<div class="card">
  <div class="filters">
    <span class="inp grow">Pérez</span>
    <span class="inp">en proceso &#9662;</span>
    <span class="inp">Todos los tipos &#9662;</span>
    <span class="inp">Fecha de inicio &#8595; &#9662;</span>
    <span class="btn">Buscar</span>
  </div>
  <table>${THEAD}<tbody>
    ${fila("Pérez, Ana", "endodoncia", "28 abr 2026", "$ 50.000,00", "$ 30.000,00", "en proceso", "proc")}
  </tbody></table>
  <div class="pager"><span>1 tratamiento · página 1 de 1</span><div class="pbtns"><span class="btn dis">Anterior</span><span class="btn dis">Siguiente</span></div></div>
</div>
<div class="note">Filtros por estado, tipo, paciente y rango de fechas + búsqueda de texto + orden, todo resuelto en el backend y filtrado por consultorio. Sin coincidencias se muestra «Sin resultados».</div>`;

// ── Figura 4 — HU16 Baja lógica: modal Cancelar con motivo ──────────────────
const fig4 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Tratamiento</div>
    <h1>Pérez, Ana</h1>
    <div class="chips">limpieza · ID 3 · <span class="badge pend">pendiente</span></div>
  </div>
</div>
<div class="panel">
  <h2>Datos del tratamiento</h2>
  <dl class="grid">
    <div><dt>Precio del paciente</dt><dd>$ 12.000,00</dd></div>
    <div><dt>Total cobrado</dt><dd>$ 0,00</dd></div>
    <div><dt>Saldo pendiente</dt><dd>$ 12.000,00</dd></div>
  </dl>
</div>
<div class="overlay">
  <div class="modal sm">
    <h2>Cambiar estado del tratamiento</h2>
    <p>Estado actual: <b>pendiente</b>.</p>
    <div style="margin-top:14px">
      <div class="field"><label>Nuevo estado</label><div class="fi">cancelado</div></div>
      <div class="field full" style="margin-top:12px"><label>Motivo de cancelación *</label><textarea class="fi">El paciente no continuó el tratamiento</textarea></div>
    </div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Confirmar</span></div>
  </div>
</div>`;

// ── Figura 5 — HU17 Motor de estados: transición en proceso → finalizado ────
const fig5 = `
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
    <div><dt>Saldo pendiente</dt><dd>$ 30.000,00</dd></div>
    <div><dt>Fecha de inicio</dt><dd>28 abr 2026</dd></div>
    <div><dt>Fecha de fin</dt><dd>—</dd></div>
  </dl>
</div>
<div class="overlay">
  <div class="modal sm">
    <h2>Cambiar estado del tratamiento</h2>
    <p>Estado actual: <b>en proceso</b>. La transición «pendiente → finalizado» directa se rechaza con «Debe iniciarse antes de finalizar».</p>
    <div style="margin-top:14px">
      <div class="field"><label>Nuevo estado</label><div class="fi">finalizado</div></div>
    </div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Confirmar</span></div>
  </div>
</div>`;

// ── Figura 6 — HU18 Detalle + historial de auditoría ────────────────────────
const fig6 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Tratamiento</div>
    <h1>Pérez, Ana</h1>
    <div class="chips">endodoncia · ID 1 · <span class="badge fin">finalizado</span></div>
  </div>
  <div style="display:flex;gap:10px"><span class="btn">Volver</span><span class="btn primary">Editar</span></div>
</div>
<div class="panel">
  <h2>Datos del tratamiento</h2>
  <dl class="grid">
    <div><dt>Precio del paciente</dt><dd>$ 65.000,00</dd></div>
    <div><dt>Total cobrado</dt><dd>$ 20.000,00</dd></div>
    <div><dt>Saldo pendiente</dt><dd>$ 45.000,00</dd></div>
  </dl>
</div>
<div class="panel">
  <h2>Historial de cambios (4)</h2>
  <ul class="tl">
    <li><div class="txt">Alta del tratamiento</div><div class="meta">Julieta Gómez · 28 abr 2026, 09:14</div></li>
    <li><div class="txt">precio_paciente: 50000 &#8594; 65000</div><div class="meta">Julieta Gómez · 02 may 2026, 14:32</div></li>
    <li><div class="txt">Estado: pendiente &#8594; en proceso</div><div class="meta">Julieta Gómez · 02 may 2026, 14:33</div></li>
    <li><div class="txt">Estado: en proceso &#8594; finalizado</div><div class="meta">Julieta Gómez · 20 may 2026, 11:00</div></li>
  </ul>
</div>`;

// ── Figura 7 — HU19 Permisos diferenciados / solo lectura ───────────────────
const fig7 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Tratamiento</div>
    <h1>Pérez, Ana</h1>
    <div class="chips">endodoncia · ID 1 · <span class="badge proc">en proceso</span></div>
  </div>
  <div style="display:flex;gap:10px"><span class="btn">Volver</span><span class="btn dis">Editar</span><span class="btn dis">Cambiar estado</span></div>
</div>
<div class="panel">
  <h2>Datos del tratamiento</h2>
  <dl class="grid">
    <div><dt>Precio del paciente</dt><dd>$ 50.000,00</dd></div>
    <div><dt>Total cobrado</dt><dd>$ 20.000,00</dd></div>
    <div><dt>Saldo pendiente</dt><dd>$ 30.000,00</dd></div>
  </dl>
</div>
<div class="msg">El usuario tiene ver_tratamientos pero no editar_tratamientos, cambiar_estado_tratamientos ni cancelar_tratamientos: ve el detalle y el historial pero los botones aparecen deshabilitados y el backend responde 403 a PUT y PATCH. Cancelar exige además el permiso cancelar_tratamientos. Toda edición de otro usuario queda registrada en auditoria_cambios con su actor y fecha.</div>`;

const CR = "Panel &#8250; <b>Tratamientos</b>";
const CR_DET = "Panel &#8250; Tratamientos &#8250; <b>Detalle del tratamiento</b>";

const OUT = __dirname;
const paginas = [
  ["fig1-alta.html", shell(CR, fig1)],
  ["fig2-editar.html", shell(CR_DET, fig2)],
  ["fig3-listado.html", shell(CR, fig3)],
  ["fig4-cancelar.html", shell(CR_DET, fig4)],
  ["fig5-estado.html", shell(CR_DET, fig5)],
  ["fig6-detalle.html", shell(CR_DET, fig6)],
  ["fig7-permisos.html", shell(CR_DET, fig7)],
];

for (const [archivo, html] of paginas) {
  fs.writeFileSync(path.join(OUT, archivo), html);
}
console.log(`${paginas.length} mockups HTML escritos en ${OUT}`);
