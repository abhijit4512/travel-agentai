type Point = { label: string; value: number };
const empty = <p className="muted small" style={{ padding: "1rem 0" }}>No data in this period.</p>;

/** Simple vertical bar chart. Hover a bar to see its exact value. */
export function BarChart({ data, format = (n: number) => String(n) }: { data: Point[]; format?: (n: number) => string }) {
  if (!data.length) return empty;
  const max = Math.max(...data.map((d) => d.value), 1), W = 520, H = 180, bw = Math.min(46, (W - 20) / data.length - 6);
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="chart" role="img" aria-label="Bar chart">
      {data.map((d, i) => { const h = (d.value / max) * H, x = 10 + i * ((W - 20) / data.length) + 3;
        return <g key={d.label}><rect x={x} y={H - h} width={bw} height={Math.max(h, 1)} rx={4} className="bar-fill"><title>{`${d.label}: ${format(d.value)}`}</title></rect>
          <text x={x + bw / 2} y={H + 16} textAnchor="middle" className="chart-label">{d.label.length > 7 ? d.label.slice(2) : d.label}</text></g>; })}
    </svg>
  );
}

export function LineChart({ data }: { data: Point[] }) {
  if (!data.length) return empty;
  const max = Math.max(...data.map((d) => d.value), 1), W = 520, H = 180;
  const pts = data.map((d, i) => [10 + (data.length === 1 ? (W - 20) / 2 : (i * (W - 20)) / (data.length - 1)), H - (d.value / max) * (H - 10)] as const);
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="chart" role="img" aria-label="Line chart">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" className="line-stroke" strokeWidth={2.5} />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={4.5} className="line-dot"><title>{`${data[i].label}: ${data[i].value}`}</title></circle>)}
      <text x={10} y={H + 16} className="chart-label">{data[0].label}</text>
      {data.length > 1 && <text x={W - 10} y={H + 16} textAnchor="end" className="chart-label">{data[data.length - 1].label}</text>}
    </svg>
  );
}

/** Ranked horizontal bars for "top 10" lists. */
export function HBars({ data, format = (n: number) => String(n) }: { data: Point[]; format?: (n: number) => string }) {
  if (!data.length) return empty;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="hbars">{data.map((d) => (
      <li key={d.label}><span className="hb-label">{d.label}</span><span className="hb-track"><i style={{ width: `${(d.value / max) * 100}%` }} /></span><b>{format(d.value)}</b></li>))}</ul>
  );
}
