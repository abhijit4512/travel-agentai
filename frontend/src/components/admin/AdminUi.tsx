import { ReactNode, useState } from "react";
import type { Range, Row } from "../../services/adminApi";

export const RANGES: [string, string][] = [["today", "Today"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["90d", "Last 90 days"], ["all", "All time"], ["custom", "Custom"]];

export function useRange(initial = "30d") {
  const [range, setRange] = useState(initial);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  // A custom range only becomes valid once both dates are set and in order
  const value: Range = range === "custom" ? (start && end && end >= start ? { range, start, end } : { range: "all" }) : { range };
  return { range, setRange, start, setStart, end, setEnd, value, invalidCustom: range === "custom" && !!start && !!end && end < start };
}

export function RangeBar({ r }: { r: ReturnType<typeof useRange> }) {
  return (
    <div className="range-bar no-print" role="group" aria-label="Date range">
      {RANGES.map(([k, l]) => <button key={k} className={`chip ${r.range === k ? "on" : ""}`} onClick={() => r.setRange(k)}>{l}</button>)}
      {r.range === "custom" && (<>
        <label className="sr" htmlFor="rs">From</label><input id="rs" type="date" value={r.start} onChange={(e) => r.setStart(e.target.value)} />
        <label className="sr" htmlFor="re">To</label><input id="re" type="date" value={r.end} min={r.start} onChange={(e) => r.setEnd(e.target.value)} />
        {r.invalidCustom && <span className="err">End date must be after the start date.</span>}
      </>)}
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "accent" | "muted" }) {
  return <div className={`stat-card ${tone ?? ""}`}><span className="sc-label">{label}</span><b className="sc-value">{value}</b>{hint && <span className="sc-hint">{hint}</span>}</div>;
}

export function Status({ value }: { value: string | null | undefined }) {
  const v = value ?? "unknown";
  return <span className={`status s-${v.replace(/[^a-z_]/g, "")}`}>{v.replace(/_/g, " ")}</span>;
}

export interface Col { key: string; label: string; render?: (row: Row) => ReactNode }
export function DataTable({ cols, rows, onRow, emptyText = "Nothing to show." }: { cols: Col[]; rows: Row[]; onRow?: (r: Row) => void; emptyText?: ReactNode }) {
  if (!rows.length) return <div className="empty">{emptyText}</div>;
  return (
    <div className="table-wrap">
      <table className="dtable">
        <thead><tr>{cols.map((c) => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.id ?? i} className={onRow ? "clickable" : ""} tabIndex={onRow ? 0 : undefined} onClick={() => onRow?.(r)} onKeyDown={(e) => { if (onRow && e.key === "Enter") onRow(r); }}>
            {cols.map((c) => <td key={c.key}>{c.render ? c.render(r) : (r[c.key] ?? "-")}</td>)}</tr>))}</tbody>
      </table>
    </div>
  );
}
export const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");
export const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");
