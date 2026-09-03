const fs = require("fs");
const path = require("path");

/* Wireframes en escala de grises, estilo del modelo com.docx (mockups-ejemplo/). */
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
.sub { color:#8a8a8a; margin-top:6px; font-size:14px; }
.tabs { display:flex; gap:8px; margin:22px 0 0; }
.tab { border:1px solid #c9c9c9; border-radius:999px; padding:8px 16px; font-size:13px; color:#5a5a5a; }
.tab.active { background:#2f2f2f; border-color:#2f2f2f; color:#ffffff; font-weight:700; }
.card { border:1px solid #d8d8d8; border-radius:10px; margin-top:18px; }
.filters { display:flex; gap:12px; padding:16px; }
.inp { border:1.5px solid #c4c4c4; border-radius:8px; padding:11px 12px; font-size:13px; color:#9a9a9a; }
.inp.grow { flex:1; }
table { width:100%; border-collapse:collapse; }
th { text-align:left; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#7a7a7a; padding:12px 16px; border-bottom:1px solid #e2e2e2; background:#f6f6f6; }
td { padding:14px 16px; border-bottom:1px solid #ececec; font-size:14px; color:#3f3f3f; }
td .nm { font-weight:700; color:#1f1f1f; }
.badge { display:inline-block; border:1px solid #bcbcbc; border-radius:999px; padding:3px 10px; font-size:11px; font-weight:700; color:#4a4a4a; }
.badge.off { color:#8a8a8a; }
.lock { color:#6a6a6a; }
.btn { border:1.5px solid #b8b8b8; border-radius:8px; padding:7px 12px; font-size:12px; color:#4a4a4a; background:#ffffff; display:inline-block; }
.btn.dis { color:#b3b3b3; border-color:#dcdcdc; }
.btn.primary { background:#2f2f2f; border-color:#2f2f2f; color:#ffffff; font-weight:700; }
.rowact { display:flex; gap:8px; }
.headerbtn { position:absolute; top:30px; right:34px; }
/* modal */
.overlay { position:absolute; inset:0; background:rgba(70,70,70,.28); display:flex; align-items:center; justify-content:center; }
.modal { width:460px; background:#ffffff; border:1.5px solid #2f2f2f; border-radius:16px; padding:26px; }
.modal h2 { font-size:20px; color:#1f1f1f; font-weight:800; display:flex; align-items:center; gap:10px; }
.modal .tri { width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:14px solid #2f2f2f; }
.modal p { color:#7a7a7a; font-size:13px; margin-top:10px; line-height:1.5; }
.field { margin-top:16px; }
.field label { display:block; font-size:12px; font-weight:700; color:#5a5a5a; margin-bottom:6px; }
.field .fi { width:100%; border:1.5px solid #c4c4c4; border-radius:8px; padding:11px 12px; font-size:13px; color:#6a6a6a; }
.field .fi.locked { background:#f0f0f0; color:#9a9a9a; }
.field textarea.fi { height:74px; }
.hint { font-size:11px; color:#9a9a9a; font-style:italic; margin-top:4px; }
.actions { display:flex; justify-content:flex-end; gap:12px; margin-top:22px; }
`;

const shell = (crumb, bodyHtml, activeNav = "Catálogos") => {
  const nav = ["Dashboard", "Pacientes", "Tratamientos", "Reportes", "Administración", "Catálogos"]
    .map((n) => `<div class="it${n === activeNav ? " active" : ""}"><span class="sq"></span>${n}</div>`)
    .join("");
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

const filaTabla = (nombre, desc, activo, lock) => `
<tr>
  <td><span class="nm">${nombre}</span>${lock ? ' <span class="lock">&#128274;</span>' : ""}</td>
  <td>${desc}</td>
  <td><span class="badge${activo ? "" : " off"}">${activo ? "Activo" : "Inactivo"}</span></td>
  <td><div class="rowact">
    <span class="btn">Editar</span>
    ${activo
      ? `<span class="btn${lock ? " dis" : ""}">Desactivar</span>`
      : `<span class="btn">Reactivar</span>`}
  </div></td>
</tr>`;

const tabs = (active) =>
  ["Estados de tratamiento", "Medios de pago", "Tipos de gasto", "Tipos de tratamiento"]
    .map((t) => `<div class="tab${t === active ? " active" : ""}">${t}</div>`)
    .join("");

// ── Figura 1 — HU-01 Alta (modal Nuevo medio de pago) ─────────────────────────
const fig1Body = `
<h1>Catálogos</h1>
<div class="sub">Administrá las listas de soporte del sistema.</div>
<span class="headerbtn btn primary">Nuevo medio de pago</span>
<div class="tabs">${tabs("Medios de pago")}</div>
<div class="card">
  <div class="filters"><span class="inp grow">Buscar por nombre o descripción...</span><span class="inp">Todos &#9662;</span></div>
  <table><thead><tr><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
  <tbody>
    ${filaTabla("efectivo", "Sin descripción", 1, false)}
    ${filaTabla("obra social", "Sin descripción", 1, false)}
    ${filaTabla("tarjeta", "Sin descripción", 1, false)}
  </tbody></table>
</div>
<div class="overlay">
  <div class="modal">
    <h2>Nuevo medio de pago</h2>
    <p>Completá el nombre y, opcionalmente, una descripción.</p>
    <div class="field"><label>Nombre *</label><div class="fi">cheque</div><div class="hint">Entre 2 y 20 caracteres</div></div>
    <div class="field"><label>Descripción (opcional)</label><div class="fi" style="height:56px">Pago con cheque a fecha</div></div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Guardar</span></div>
  </div>
</div>`;

// ── Figura 2 — HU-02 Modificación (modal Editar, ítem protegido) ──────────────
const fig2Body = `
<h1>Catálogos</h1>
<div class="sub">Administrá las listas de soporte del sistema.</div>
<span class="headerbtn btn primary">Nuevo estado de tratamiento</span>
<div class="tabs">${tabs("Estados de tratamiento")}</div>
<div class="card">
  <div class="filters"><span class="inp grow">Buscar por nombre o descripción...</span><span class="inp">Todos &#9662;</span></div>
  <table><thead><tr><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
  <tbody>
    ${filaTabla("cancelado", "El tratamiento se interrumpió antes de finalizar", 1, true)}
    ${filaTabla("en proceso", "Sin descripción", 1, true)}
  </tbody></table>
</div>
<div class="overlay">
  <div class="modal">
    <h2>Editar estado de tratamiento</h2>
    <p>Este ítem es del sistema: sólo se puede editar su descripción.</p>
    <div class="field"><label>Nombre</label><div class="fi locked">cancelado</div></div>
    <div class="field"><label>Descripción (opcional)</label><textarea class="fi">El tratamiento se interrumpió antes de finalizar</textarea></div>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Guardar</span></div>
  </div>
</div>`;

// ── Figura 3 — HU-03 Consulta (listado con pestañas y filtros) ────────────────
const fig3Body = `
<h1>Catálogos</h1>
<div class="sub">Administrá las listas de soporte del sistema: estados de tratamiento, medios de pago, tipos de gasto y tipos de tratamiento.</div>
<span class="headerbtn btn primary">Nuevo tipo de gasto</span>
<div class="tabs">${tabs("Tipos de gasto")}</div>
<div class="card">
  <div class="filters"><span class="inp grow">Buscar por nombre o descripción...</span><span class="inp">Inactivos &#9662;</span></div>
  <table><thead><tr><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
  <tbody>
    ${filaTabla("otro", "Gastos varios sin categoría específica", 0, false)}
  </tbody></table>
</div>
<div style="margin-top:16px;color:#9a9a9a;font-size:13px;font-style:italic">1 resultado · filtro: Inactivos</div>`;

// ── Figura 4 — HU-04 Baja lógica (modal de confirmación) ─────────────────────
const fig4Body = `
<h1>Catálogos</h1>
<div class="sub">Administrá las listas de soporte del sistema.</div>
<span class="headerbtn btn primary">Nuevo tipo de gasto</span>
<div class="tabs">${tabs("Tipos de gasto")}</div>
<div class="card">
  <div class="filters"><span class="inp grow">Buscar por nombre o descripción...</span><span class="inp">Todos &#9662;</span></div>
  <table><thead><tr><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
  <tbody>
    ${filaTabla("insumo", "Sin descripción", 1, false)}
    ${filaTabla("otro", "Sin descripción", 1, false)}
  </tbody></table>
</div>
<div class="overlay">
  <div class="modal">
    <h2><span class="tri"></span> Confirmar baja lógica</h2>
    <p>Estás por desactivar «otro». No se elimina de la base, pero deja de estar disponible para nuevos registros.</p>
    <div class="actions"><span class="btn">Cancelar</span><span class="btn primary">Desactivar</span></div>
  </div>
</div>`;

const out = __dirname;
fs.writeFileSync(path.join(out, "fig1-alta.html"), shell("Panel &#8250; <b>Catálogos</b>", fig1Body));
fs.writeFileSync(path.join(out, "fig2-editar.html"), shell("Panel &#8250; <b>Catálogos</b>", fig2Body));
fs.writeFileSync(path.join(out, "fig3-listado.html"), shell("Panel &#8250; <b>Catálogos</b>", fig3Body));
fs.writeFileSync(path.join(out, "fig4-baja.html"), shell("Panel &#8250; <b>Catálogos</b>", fig4Body));
console.log("4 mockups HTML escritos en", out);
