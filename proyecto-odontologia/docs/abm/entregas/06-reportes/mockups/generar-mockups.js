const fs = require("fs");
const path = require("path");

/* Wireframes en escala de grises — mismo estilo que docs/abm/entregas/05-gastos.
   Módulo 06 — Reportes (consumo, solo lectura). 7 figuras: una por HU + acceso
   denegado. */
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
.body { flex:1; padding:24px 30px; position:relative; overflow:hidden; }
h1 { font-size:26px; color:#1f1f1f; font-weight:800; }
.sub { color:#8a8a8a; margin-top:6px; font-size:12px; max-width:600px; }
.card { border:1px solid #d8d8d8; border-radius:10px; margin-top:14px; padding:16px 18px; }
.filters { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; }
.fld { display:flex; flex-direction:column; gap:4px; font-size:11px; font-weight:700; color:#6a6a6a; }
.inp { border:1.5px solid #c4c4c4; border-radius:8px; padding:8px 11px; font-size:12px; color:#8a8a8a; font-weight:400; }
.btn { border:1.5px solid #b8b8b8; border-radius:8px; padding:8px 13px; font-size:12px; color:#4a4a4a; background:#ffffff; display:inline-block; }
.btn.primary { background:#2f2f2f; border-color:#2f2f2f; color:#ffffff; font-weight:700; }
.leyenda { margin-top:10px; color:#8a8a8a; font-size:11px; }
.kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:14px; }
.kpi { border:1px solid #e2e2e2; border-left:4px solid #8a8a8a; border-radius:12px; padding:14px 16px; background:#f9f9f9; }
.kpi dt { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#8a8a8a; font-weight:700; }
.kpi dd { font-size:20px; font-weight:800; color:#1f1f1f; margin-top:6px; }
.kpi .note { font-size:11px; color:#9a9a9a; margin-top:4px; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:14px; }
.panel { border:1px solid #d8d8d8; border-radius:10px; padding:14px 16px; }
.panel h2 { font-size:13px; color:#1f1f1f; }
.panel .psub { font-size:11px; color:#8a8a8a; margin-top:2px; margin-bottom:10px; }
.estados { list-style:none; display:flex; flex-direction:column; gap:7px; }
.estados li { display:flex; justify-content:space-between; align-items:center; padding:7px 11px; border:1px solid #ececec; border-radius:8px; background:#f9f9f9; font-size:12px; color:#4a4a4a; }
.estados li b { font-size:14px; color:#1f1f1f; }
.bars { list-style:none; display:flex; flex-direction:column; gap:11px; }
.bars .row .rh { display:flex; justify-content:space-between; font-size:12px; color:#4a4a4a; }
.bars .row .rh b { color:#1f1f1f; }
.bars .row .track { margin-top:4px; height:9px; background:#e9e9e9; border-radius:999px; overflow:hidden; }
.bars .row .fill { height:100%; background:#4a4a4a; border-radius:999px; }
.bars .row .det { font-size:10px; color:#a5a5a5; margin-top:2px; }
table { width:100%; border-collapse:collapse; margin-top:6px; }
th { text-align:left; font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:#7a7a7a; padding:9px 12px; border-bottom:1px solid #e2e2e2; background:#f6f6f6; }
td { padding:9px 12px; border-bottom:1px solid #ececec; font-size:12px; color:#3f3f3f; }
td.num, th.num { text-align:right; }
td .lnk { color:#3a3a3a; font-weight:700; text-decoration:underline; }
tfoot td { font-weight:700; border-top:2px solid #d8d8d8; }
.mbar { display:block; height:6px; border-radius:999px; margin:2px 0; }
.mbar.ing { background:#5a5a5a; }
.mbar.egr { background:#a5a5a5; }
.msg { margin-top:14px; border:1px solid #cfcfcf; background:#f3f3f3; border-radius:8px; padding:12px 14px; font-size:12px; color:#5a5a5a; }
.denied { display:flex; flex-direction:column; align-items:flex-start; gap:12px; margin-top:60px; padding:28px; border:1px solid #d8d8d8; border-radius:12px; max-width:520px; }
.denied h1 { font-size:22px; }
.denied p { color:#7a7a7a; font-size:13px; }
`;

const NAV = ["Inicio", "Pacientes", "Tratamientos", "Pagos", "Gastos", "Reportes", "Administración", "Catálogos"];

const shell = (crumb, bodyHtml, activeNav = "Reportes") => {
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

const filtroPeriodo = `
<div class="card">
  <div class="filters">
    <span class="fld">Desde<span class="inp">01/09/2026</span></span>
    <span class="fld">Hasta<span class="inp">03/09/2026</span></span>
    <span class="btn primary">Aplicar</span>
    <span class="btn">Este mes</span>
  </div>
  <div class="leyenda">Período: 1 sept 2026 – 3 sept 2026 · Sólo cuentan los pagos y gastos vigentes.</div>
</div>`;

const bar = (etq, valor, pct, det) => `
<li class="row">
  <div class="rh"><span>${etq}</span><b>${valor}</b></div>
  <div class="track"><div class="fill" style="width:${pct}%"></div></div>
  <div class="det">${det}</div>
</li>`;

const H1 = "Reportes";
const SUB = "Cuánto se cobra, cuánto ingresa por cada práctica y cuánto se gasta, en el período elegido.";

// ── Figura 1 — HU1 Resumen del período (KPIs + tratamientos por estado) ─────
const fig1 = `
<h1>${H1}</h1>
<div class="sub">${SUB}</div>
${filtroPeriodo}
<dl class="kpis">
  <div class="kpi" style="border-left-color:#4a4a4a"><dt>Ingresos del período</dt><dd>$ 20.000,00</dd><div class="note">1 pago vigente</div></div>
  <div class="kpi" style="border-left-color:#8a8a8a"><dt>Egresos del período</dt><dd>$ 45.000,00</dd><div class="note">2 gastos vigentes</div></div>
  <div class="kpi" style="border-left-color:#6a6a6a"><dt>Resultado neto</dt><dd>-$ 25.000,00</dd><div class="note">Ingresos − Egresos</div></div>
</dl>
<div class="panel" style="margin-top:14px">
  <h2>Tratamientos por estado</h2>
  <div class="psub">Snapshot del consultorio</div>
  <ul class="estados">
    <li>pendiente <b>0</b></li>
    <li>en proceso <b>0</b></li>
    <li>finalizado <b>1</b></li>
    <li>cancelado <b>0</b></li>
  </ul>
</div>`;

// ── Figura 2 — HU2 Ingresos por tipo de práctica ───────────────────────────
const fig2 = `
<h1>${H1}</h1>
<div class="sub">${SUB}</div>
${filtroPeriodo}
<div class="panel" style="margin-top:14px">
  <h2>Ingresos por práctica</h2>
  <div class="psub">Total $ 50.000,00 · qué práctica deja más</div>
  <ul class="bars">
    ${bar("endodoncia", "$ 50.000,00", 100, "3 pagos")}
    ${bar("ortodoncia", "$ 0,00", 2, "0 pagos")}
    ${bar("limpieza", "$ 0,00", 2, "0 pagos")}
  </ul>
</div>`;

// ── Figura 3 — HU3 Arqueo por medio de pago ────────────────────────────────
const fig3 = `
<h1>${H1}</h1>
<div class="sub">${SUB}</div>
${filtroPeriodo}
<div class="panel" style="margin-top:14px">
  <h2>Arqueo por medio de pago</h2>
  <div class="psub">Total $ 50.000,00 · cierre de caja del período</div>
  <ul class="bars">
    ${bar("efectivo", "$ 50.000,00", 100, "3 pagos")}
    ${bar("transferencia", "$ 0,00", 2, "0 pagos")}
    ${bar("tarjeta", "$ 0,00", 2, "0 pagos")}
    ${bar("obra social", "$ 0,00", 2, "0 pagos")}
  </ul>
</div>`;

// ── Figura 4 — HU4 Egresos por tipo de gasto ───────────────────────────────
const fig4 = `
<h1>${H1}</h1>
<div class="sub">${SUB}</div>
${filtroPeriodo}
<div class="panel" style="margin-top:14px">
  <h2>Egresos por tipo de gasto</h2>
  <div class="psub">Total $ 45.000,00</div>
  <ul class="bars">
    ${bar("laboratorio", "$ 30.000,00", 100, "1 gasto")}
    ${bar("insumo", "$ 15.000,00", 50, "1 gasto")}
    ${bar("servicio externo", "$ 0,00", 2, "0 gastos")}
  </ul>
</div>`;

// ── Figura 5 — HU5 Pendientes de cobro por tratamiento ─────────────────────
const fig5 = `
<h1>${H1}</h1>
<div class="sub">${SUB}</div>
<div class="card" style="padding:0">
  <div style="padding:14px 16px;border-bottom:1px solid #ececec">
    <h2 style="font-size:13px;color:#1f1f1f">Pendientes de cobro</h2>
    <div class="psub" style="margin:2px 0 0">1 tratamiento · saldo total $ 30.000,00 · no depende del período</div>
  </div>
  <table>
    <thead><tr><th>Paciente</th><th>Tratamiento</th><th>Estado</th><th class="num">Precio</th><th class="num">Pagado</th><th class="num">Saldo</th></tr></thead>
    <tbody>
      <tr>
        <td>Pérez, Ana</td>
        <td><span class="lnk">#1 · endodoncia</span></td>
        <td>en proceso</td>
        <td class="num">$ 50.000,00</td>
        <td class="num">$ 20.000,00</td>
        <td class="num"><b>$ 30.000,00</b></td>
      </tr>
    </tbody>
  </table>
</div>
<div class="msg">El saldo es el precio del paciente menos la suma de sus pagos vigentes. Los tratamientos cancelados no figuran. Un clic en el tratamiento abre su ficha.</div>`;

// ── Figura 6 — HU6 Vista mensual del año ───────────────────────────────────
const filaMes = (mes, ing, egr, neto, ingPct, egrPct, negativo) => `
<tr>
  <td>${mes}</td>
  <td class="num">${ing}</td>
  <td class="num">${egr}</td>
  <td class="num"${negativo ? ' style="color:#8a8a8a"' : ""}>${neto}</td>
  <td style="width:34%">
    <span class="mbar ing" style="width:${ingPct}%"></span>
    <span class="mbar egr" style="width:${egrPct}%"></span>
  </td>
</tr>`;

const fig6 = `
<h1>${H1}</h1>
<div class="sub">Vista mensual: ingresos, egresos y neto de cada mes del año.</div>
<div class="card" style="padding:0">
  <div style="padding:12px 16px;border-bottom:1px solid #ececec;display:flex;justify-content:space-between;align-items:center">
    <h2 style="font-size:13px;color:#1f1f1f">Vista mensual</h2>
    <span class="fld">Año<span class="inp">2026</span></span>
  </div>
  <table>
    <thead><tr><th>Mes</th><th class="num">Ingresos</th><th class="num">Egresos</th><th class="num">Neto</th><th>Comparativa</th></tr></thead>
    <tbody>
      ${filaMes("Mar", "$ 0,00", "$ 0,00", "$ 0,00", 0, 0, false)}
      ${filaMes("Abr", "$ 20.000,00", "$ 45.000,00", "-$ 25.000,00", 44, 100, true)}
      ${filaMes("May", "$ 0,00", "$ 0,00", "$ 0,00", 0, 0, false)}
      ${filaMes("Jun", "$ 0,00", "$ 0,00", "$ 0,00", 0, 0, false)}
      ${filaMes("Jul", "$ 0,00", "$ 0,00", "$ 0,00", 0, 0, false)}
      ${filaMes("Ago", "$ 0,00", "$ 0,00", "$ 0,00", 0, 0, false)}
      ${filaMes("Sep", "$ 30.000,00", "$ 0,00", "$ 30.000,00", 66, 0, false)}
    </tbody>
    <tfoot>
      <tr><td>Total 2026</td><td class="num">$ 50.000,00</td><td class="num">$ 45.000,00</td><td class="num">$ 5.000,00</td><td></td></tr>
    </tfoot>
  </table>
</div>`;

// ── Figura 7 — HU1 Acceso denegado sin ver_reportes ───────────────────────
const fig7 = `
<div class="denied">
  <h1>Acceso denegado</h1>
  <p>No tenés permisos suficientes para ingresar a esta sección.</p>
  <span class="btn primary">Volver al panel</span>
</div>
<div class="msg">El usuario no tiene el permiso ver_reportes: el ítem «Reportes» no aparece en el menú lateral y todos los endpoints GET /api/reportes/* responden 403 «No tenés permisos para realizar esta acción.». Todas las consultas se filtran además por el consultorio del usuario autenticado.</div>`;

const CR = "Panel &#8250; <b>Reportes</b>";

const OUT = __dirname;
const paginas = [
  ["fig1-resumen.html", shell(CR, fig1)],
  ["fig2-ingresos-tipo.html", shell(CR, fig2)],
  ["fig3-arqueo-medio.html", shell(CR, fig3)],
  ["fig4-egresos-tipo.html", shell(CR, fig4)],
  ["fig5-pendientes.html", shell(CR, fig5)],
  ["fig6-mensual.html", shell(CR, fig6)],
  ["fig7-acceso.html", shell(CR, fig7)],
];

for (const [archivo, html] of paginas) {
  fs.writeFileSync(path.join(OUT, archivo), html);
}
console.log(`${paginas.length} mockups HTML escritos en ${OUT}`);
