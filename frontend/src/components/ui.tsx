import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Skeleton({ height = 160 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden="true" />;
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice error" role="alert">
      <p>{message}</p>
      {onRetry && <button className="btn sm ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><h3>{title}</h3>{children}</div>;
}
export function SectionHead({ eyebrow, title, blurb, to, cta = "See all", right }: { eyebrow?: string; title: string; blurb?: string; to?: string; cta?: string; right?: ReactNode }) {
  return (
    <div className="section-head">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{blurb && <p>{blurb}</p>}</div>
      {right ?? (to && <Link className="btn sm" to={to}>{cta}</Link>)}
    </div>
  );
}
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button className="btn sm ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="small" aria-live="polite">Page {page} of {pages}</span>
      <button className="btn sm ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}
