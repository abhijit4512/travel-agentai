import { formatInr } from "../services/text";
import type { Budget } from "../types";

const LABELS: Record<string, string> = {
  transport_to_and_from: "Travel to and from", accommodation: "Stay", food: "Food", local_transport: "Local transport",
  sightseeing_and_activities: "Entry fees and activities", contingency_8_percent: "Contingency (8%)",
};

export default function BudgetCard({ budget }: { budget: Budget }) {
  return (
    <section className="card budget" aria-labelledby="budget-h">
      <h2 id="budget-h">Estimated budget</h2>
      <p className="badge">Illustrative demo estimate, not live prices</p>
      <table>
        <tbody>
          {Object.entries(budget.items).map(([k, v]) => (
            <tr key={k}><th scope="row">{LABELS[k] ?? k}</th><td>{formatInr(v)}</td></tr>
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
