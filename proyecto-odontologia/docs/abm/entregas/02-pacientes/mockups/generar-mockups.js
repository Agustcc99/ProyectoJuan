const fs = require("fs");
const path = require("path");

/* Wireframes en escala de grises, mismo estilo que docs/abm/entregas/01-catalogos. */
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
.body { flex:1; padding:30px 34px; position:relative; }
h1 { font-size:30px; color:#1f1f1f; font-weight:800; }
.sub { color:#8a8a8a; margin-top:6px; font-size:14px; max-width:620px; }
.card { border:1px solid #d8d8d8; border-radius:10px; margin-top:18px; }
.filters { display:flex; gap:12px; padding:16px; align-items:center; }
.inp { border:1.5px solid #c4c4c4; border-radius:8px; padding:11px 12px; font-size:13px; color:#9a9a9a; }
.inp.grow { flex:1; }
table { width:100%; border-collapse:collapse; }
th { text-align:left; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#7a7a7a; padding:12px 16px; border-bottom:1px solid #e2e2e2; background:#f6f6f6; }
td { padding:13px 16px; border-bottom:1px solid #ececec; font-size:13px; color:#3f3f3f; }
td .nm { font-weight:700; color:#1f1f1f; }
.badge { display:inline-block; border:1px solid #bcbcbc; border-radius:999px; padding:3px 10px; font-size:11px; font-weight:700; color:#4a4a4a; }
.badge.off { color:#8a8a8a; }
.btn { border:1.5px solid #b8b8b8; border-radius:8px; padding:7px 12px; font-size:12px; color:#4a4a4a; background:#ffffff; display:inline-block; }
.btn.dis { color:#b3b3b3; border-color:#dcdcdc; }
.btn.primary { background:#2f2f2f; border-color:#2f2f2f; color:#ffffff; font-weight:700; }
.headerbtn { position:absolute; top:30px; right:34px; display:flex; gap:10px; }
.pager { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; color:#8a8a8a; font-size:12px; }
.pager .pbtns { display:flex; gap:8px; }
.note { margin-top:14px; color:#8a8a8a; font-size:12px; font-style:italic; }
.msg { margin-top:16px; border:1px solid #cfcfcf; background:#f3f3f3; border-radius:8px; padding:12px 14px; font-size:12px; color:#5a5a5a; }
/* ficha */
.fichahead { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
.chips { margin-top:8px; color:#8a8a8a; font-size:13px; }
.panel { border:1px solid #d8d8d8; border-radius:10px; margin-top:18px; padding:18px 20px; }
.panel h2 { font-size:15px; color:#1f1f1f; margin-bottom:14px; }
.grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px 18px; }
.grid dt { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#8a8a8a; font-weight:700; }
.grid dd { font-size:13px; color:#1f1f1f; margin-top:3px; }
/* modal */
.overlay { position:absolute; inset:0; background:rgba(70,70,70,.28); display:flex; align-items:center; justify-content:center; }
.modal { width:560px; background:#ffffff; border:1.5px solid #2f2f2f; border-radius:16px; padding:26px; max-height:600px; overflow:auto; }
.modal.sm { width:460px; }
.modal h2 { font-size:20px; color:#1f1f1f; font-weight:800; display:flex; align-items:center; gap:10px; }
.modal .tri { width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:14px solid #2f2f2f; }
.modal p { color:#7a7a7a; font-size:13px; margin-top:10px; line-height:1.5; }
.fgrid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:16px; }
.field label { display:block; font-size:12px; font-weight:700; color:#5a5a5a; margin-bottom:6px; }
.field .fi { width:100%; border:1.5px solid #c4c4c4; border-radius:8px; padding:10px 12px; font-size:13px; color:#6a6a6a; }
.field.full { grid-column:1 / -1; }
.field textarea.fi { height:60px; }
.errbox { margin-top:14px; border:1px solid #b8b8b8; background:#f0f0f0; border-radius:8px; padding:10px 12px; font-size:12px; color:#5a5a5a; }
.actions { display:flex; justify-content:flex-end; gap:12px; margin-top:20px; }
`;

const NAV = ["Dashboard", "Pacientes", "Tratamientos", "Reportes", "Administración", "Catálogos"];

const shell = (crumb, bodyHtml, activeNav = "Pacientes") => {
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

const filaPaciente = (nombre, apellido, dni, tel, obra, activo) => `
<tr>
  <td><span class="nm">${nombre}</span></td>
  <td>${apellido}</td>
  <td>${dni}</td>
  <td>${tel}</td>
  <td>${obra}</td>
  <td><span class="badge${activo ? "" : " off"}">${activo ? "Activo" : "Inactivo"}</span></td>
</tr>`;

const tablaPacientes = (filas) => `
<div class="card">
  <table>
    <thead><tr><th>Nombre</th><th>Apellido</th><th>DNI</th><th>Teléfono</th><th>Obra social</th><th>Estado</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="pager">
    <span>2 pacientes · página 1 de 1</span>
    <div class="pbtns"><span class="btn dis">Anterior</span><span class="btn dis">Siguiente</span></div>
  </div>
</div>`;

const FILAS_BASE =
  filaPaciente("Ana", "Pérez", "30111222", "3511234567", "APROSS", 1) +
  filaPaciente("Lucía", "Fernández", "27888444", "3516667788", "Swiss Medical", 1);

// ── Figura 1 — HU-01 Alta ────────────────────────────────────────────────────
const fig1 = `
<h1>Pacientes</h1>
<div class="sub">Gestioná las fichas y la información de los pacientes del consultorio.</div>
<div class="headerbtn"><span class="btn primary">Nuevo paciente</span></div>
<div class="card">
  <div class="filters"><span class="inp grow">Buscar por nombre, apellido o DNI...</span><span class="inp">Todos &#9662;</span><span class="btn">Buscar</span></div>
  <table><thead><tr><th>Nombre</th><th>Apellido</th><th>DNI</th><th>Teléfono</th><th>Obra social</th><th>Estado</th></tr></thead>
  <tbody>${filaPaciente("Ana", "Pérez", "30111222", "3511234567", "APROSS", 1)}</tbody></table>
</div>
<div class="overlay">
  <div class="modal">
    <h2>Nuevo paciente</h2>
    <p>Los campos Nombre, Apellido y DNI son obligatorios. El resto es opcional.</p>
    <div class="fgrid">
      <div class="field"><label>Nombre *</label><div class="fi">Lucía</div></div>
      <div class="field"><label>Apellido *</label><div class="fi">Fernández</div></div>
      <div class="field"><label>DNI *</label><div class="fi">27888444</div></div>
      <div class="field"><label>Fecha de nacimiento</label><div class="fi">15/03/1988</div></div>
      <div class="field"><label>Teléfono</label><div class="fi">3516667788</div></div>
      <div class="field"><label>Email</label><div class="fi">lucia@mail.com</div></div>
      <div class="field full"><label>Obra social</label><div class="fi">Swiss Medical</div></div>
      <div class="field full"><label>Observaciones</label><textarea class="fi">Paciente derivada por ortodoncia.</textarea></div>
    </div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Guardar</span></div>
  </div>
</div>`;

// ── Figura 2 — HU-02 Modificación ────────────────────────────────────────────
const fig2 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Ficha del paciente</div>
    <h1>Lucía Fernández</h1>
    <div class="chips">DNI 27888444 · ID 2 · <span class="badge">Activo</span></div>
  </div>
</div>
<div class="panel">
  <h2>Datos personales</h2>
  <dl class="grid">
    <div><dt>Nombre</dt><dd>Lucía</dd></div><div><dt>Apellido</dt><dd>Fernández</dd></div>
    <div><dt>DNI</dt><dd>27888444</dd></div><div><dt>Fecha de nacimiento</dt><dd>15 mar 1988</dd></div>
  </dl>
</div>
<div class="overlay">
  <div class="modal">
    <h2>Editar ficha del paciente</h2>
    <p>Los campos Nombre, Apellido y DNI son obligatorios. El resto es opcional.</p>
    <div class="errbox">Ya existe un paciente con ese DNI.</div>
    <div class="fgrid">
      <div class="field"><label>Nombre *</label><div class="fi">Lucía</div></div>
      <div class="field"><label>Apellido *</label><div class="fi">Fernández</div></div>
      <div class="field"><label>DNI *</label><div class="fi">30111222</div></div>
      <div class="field"><label>Fecha de nacimiento</label><div class="fi">15/03/1988</div></div>
      <div class="field full"><label>Obra social</label><div class="fi">Swiss Medical</div></div>
    </div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Guardar</span></div>
  </div>
</div>`;

// ── Figura 3 — HU-03 Consulta / listado ──────────────────────────────────────
const fig3 = `
<h1>Pacientes</h1>
<div class="sub">Gestioná las fichas y la información de los pacientes del consultorio.</div>
<div class="headerbtn"><span class="btn primary">Nuevo paciente</span></div>
<div class="card">
  <div class="filters"><span class="inp grow">erez</span><span class="inp">Activos &#9662;</span><span class="btn">Buscar</span></div>
  <table><thead><tr><th>Nombre</th><th>Apellido</th><th>DNI</th><th>Teléfono</th><th>Obra social</th><th>Estado</th></tr></thead>
  <tbody>${filaPaciente("Ana", "Pérez", "30111222", "3511234567", "APROSS", 1)}</tbody></table>
  <div class="pager">
    <span>1 paciente · página 1 de 1</span>
    <div class="pbtns"><span class="btn dis">Anterior</span><span class="btn dis">Siguiente</span></div>
  </div>
</div>
<div class="note">Búsqueda por nombre / apellido / DNI + filtro de estado + paginación, resueltos en el backend.</div>`;

// ── Figura 4 — HU-04 Ver ficha ───────────────────────────────────────────────
const fig4 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Ficha del paciente</div>
    <h1>Ana Pérez</h1>
    <div class="chips">DNI 30111222 · ID 1 · <span class="badge">Activo</span></div>
  </div>
  <div style="display:flex;gap:10px"><span class="btn">Volver</span><span class="btn primary">Editar</span><span class="btn">Desactivar</span></div>
</div>
<div class="panel">
  <h2>Datos personales</h2>
  <dl class="grid">
    <div><dt>Nombre</dt><dd>Ana</dd></div><div><dt>Apellido</dt><dd>Pérez</dd></div>
    <div><dt>DNI</dt><dd>30111222</dd></div><div><dt>Fecha de nacimiento</dt><dd>&mdash;</dd></div>
    <div><dt>Teléfono</dt><dd>3511234567</dd></div><div><dt>Email</dt><dd>ana@mail.com</dd></div>
    <div><dt>Obra social</dt><dd>APROSS</dd></div><div><dt>Alta de la ficha</dt><dd>2 sept 2026, 18:53</dd></div>
  </dl>
</div>
<div class="panel">
  <h2>Tratamientos del paciente</h2>
  <div style="color:#8a8a8a;font-size:13px">Este paciente tiene 1 tratamiento(s) registrado(s). El detalle y la carga se habilitan en el ABM 03 (próximamente).</div>
</div>`;

// ── Figura 5 — HU-05 Baja lógica ─────────────────────────────────────────────
const fig5 = `
<div class="fichahead">
  <div>
    <div class="crumb" style="margin-bottom:6px">Ficha del paciente</div>
    <h1>Ana Pérez</h1>
    <div class="chips">DNI 30111222 · ID 1 · <span class="badge">Activo</span></div>
  </div>
  <div style="display:flex;gap:10px"><span class="btn">Volver</span><span class="btn primary">Editar</span><span class="btn">Desactivar</span></div>
</div>
<div class="panel">
  <h2>Datos personales</h2>
  <dl class="grid">
    <div><dt>Nombre</dt><dd>Ana</dd></div><div><dt>Apellido</dt><dd>Pérez</dd></div>
    <div><dt>DNI</dt><dd>30111222</dd></div><div><dt>Obra social</dt><dd>APROSS</dd></div>
  </dl>
</div>
<div class="overlay">
  <div class="modal sm">
    <h2><span class="tri"></span> Confirmar baja lógica</h2>
    <p>Estás por desactivar la ficha de Ana Pérez. No se elimina de la base y su historial se conserva, pero deja de aparecer entre los pacientes activos.</p>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Desactivar</span></div>
  </div>
</div>`;

// ── Figura 6 — HU-06 Acceso por permiso ──────────────────────────────────────
const fig6 = `
<h1>Pacientes</h1>
<div class="sub">Gestioná las fichas y la información de los pacientes del consultorio.</div>
<div class="headerbtn"><span class="btn dis">Nuevo paciente</span></div>
<div class="card">
  <div class="filters"><span class="inp grow">Buscar por nombre, apellido o DNI...</span><span class="inp">Todos &#9662;</span><span class="btn">Buscar</span></div>
  <table><thead><tr><th>Nombre</th><th>Apellido</th><th>DNI</th><th>Teléfono</th><th>Obra social</th><th>Estado</th></tr></thead>
  <tbody>${FILAS_BASE}</tbody></table>
</div>
<div class="msg">El rol «recepción» tiene ver_pacientes pero no crear_pacientes, editar_pacientes ni el par desactivar/reactivar: puede consultar el listado y la ficha, y el backend responde 403 a POST, PUT y PATCH. Otro consultorio no ve estas fichas (aislamiento por id_consultorio).</div>`;

const CR = "Panel &#8250; <b>Pacientes</b>";
const CR_FICHA = "Panel &#8250; Pacientes &#8250; <b>1</b>";

const OUT = __dirname;
const paginas = [
  ["fig1-alta.html", shell(CR, fig1)],
  ["fig2-editar.html", shell(CR_FICHA, fig2)],
  ["fig3-listado.html", shell(CR, fig3)],
  ["fig4-ficha.html", shell(CR_FICHA, fig4)],
  ["fig5-baja.html", shell(CR_FICHA, fig5)],
  ["fig6-permisos.html", shell(CR, fig6)],
];

for (const [archivo, html] of paginas) {
  fs.writeFileSync(path.join(OUT, archivo), html);
}
console.log(`${paginas.length} mockups HTML escritos en ${OUT}`);
