/*
  Módulo 06 — Reportes. Gráfico de barras horizontales hecho sólo con div/CSS
  (sin librería de charts, por decisión del contexto del proyecto).

  props:
    - items: [{ etiqueta, valor, detalle? }]
    - formatearValor: (n) => string  (por defecto, número tal cual)
    - vacio: texto a mostrar cuando no hay items
*/

function BarrasReporte({ items = [], formatearValor = (n) => String(n), vacio = "Sin datos en el período." }) {
  if (!items.length) {
    return <p className="reportes__vacio">{vacio}</p>;
  }

  const maximo = Math.max(...items.map((item) => Number(item.valor) || 0), 0);

  return (
    <ul className="reportes-barras">
      {items.map((item) => {
        const valor = Number(item.valor) || 0;
        const ancho = maximo > 0 ? Math.max(2, (valor / maximo) * 100) : 0;

        return (
          <li key={item.etiqueta} className="reportes-barras__fila">
            <div className="reportes-barras__cabecera">
              <span className="reportes-barras__etiqueta">{item.etiqueta}</span>
              <span className="reportes-barras__valor">{formatearValor(valor)}</span>
            </div>

            <div className="reportes-barras__pista">
              <div
                className="reportes-barras__relleno"
                style={{ width: `${ancho}%` }}
              />
            </div>

            {item.detalle ? (
              <span className="reportes-barras__detalle">{item.detalle}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default BarrasReporte;
