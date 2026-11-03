import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Skeleton({ height = 160 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden="true" />;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice error" role="alert">
      <p>{message}</p>
      {onRetry && <button className="btn ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><h3>{title}</h3>{children}</div>;
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button className="btn sm" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft size={16} /> Previous
      </button>
      <span className="small muted" aria-live="polite">Page {page} of {pages}</span>
      <button className="btn sm" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">
        Next <ChevronRight size={16} />
      </button>
    </nav>
  );
}

export function SectionHead({ eyebrow, title, blurb, to, right }: {
  eyebrow?: string; title: string; blurb?: string; to?: string; right?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {blurb && <p className="muted">{blurb}</p>}
      </div>
      {right ?? (to ? <Link className="btn sm" to={to}>View all</Link> : null)}
    </div>
  );
}
