import { formatInr } from "../services/text";
import type { Budget } from "../types";

const LABELS: Record<string, string> = {
  transport_to_and_from: "Travel to and from", accommodation: "Stay", food: "Food", local_transport: "Local transport",
  sightseeing_and_activities: "Entry fees and activities", contingency_8_percent: "Contingency (8%)",
};
const COLORS = ["#123d35", "#e89a43", "#8fa79a", "#c97d27", "#2f5d50", "#b9a98a"];

export default function BudgetCard({ budget }: { budget: Budget }) {
  const entries = Object.entries(budget.items);
  return (
    <section className="card budget" aria-labelledby="budget-h">
      <h2 id="budget-h" style={{ fontSize: "1.4rem" }}>Estimated budget</h2>
      <p className="badge">Illustrative demo estimate, not live prices</p>
      <div className="bar" role="img" aria-label="Budget split by category">
        {entries.map(([k, v], i) => <i key={k} title={LABELS[k] ?? k} style={{ width: `${(v / budget.total_inr) * 100}%`, background: COLORS[i % COLORS.length] }} />)}
      </div>
      <table>
        <tbody>
          {entries.map(([k, v], i) => (
            <tr key={k}><th scope="row"><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], marginRight: 8 }} />{LABELS[k] ?? k}</th><td>{formatInr(v)}</td></tr>
          ))}
        </tbody>
        <tfoot>
          <tr><th scope="row">Total</th><td>{formatInr(budget.total_inr)}</td></tr>
          <tr><th scope="row">Per person</th><td>{formatInr(budget.per_person_inr)}</td></tr>
        </tfoot>
      </table>
      {budget.within_budget === true && <p className="ok">Within your budget of {formatInr(budget.requested_budget_inr!)}.</p>}
      {budget.within_budget === false && (
        <div className="notice warn"><p>Above your budget of {formatInr(budget.requested_budget_inr!)}.</p>
          <ul>{budget.suggestions.map((s) => <li key={s}>{s}</li>)}</ul></div>
      )}
      <ul className="small muted">{budget.notes.map((n) => <li key={n}>{n}</li>)}</ul>
    </section>
  );
}
