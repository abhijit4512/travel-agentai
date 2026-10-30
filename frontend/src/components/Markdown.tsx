import type { ReactNode } from "react";

/** Tiny safe markdown renderer (headings, lists, bold, italics, links). No raw HTML is ever inserted. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("[")) { const [, label, url] = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!; out.push(<a key={k++} href={url} target="_blank" rel="noreferrer">{label}</a>); }
    else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function parseBlocks(src: string): { type: "p" | "h" | "ul" | "ol"; lines: string[] }[] {
  const blocks: { type: "p" | "h" | "ul" | "ol"; lines: string[] }[] = [];
  for (const raw of src.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) { blocks.push({ type: "p", lines: [] }); continue; }
    const kind = /^#{1,4}\s/.test(line) ? "h" : /^\s*[-*]\s+/.test(line) ? "ul" : /^\s*\d+[.)]\s+/.test(line) ? "ol" : "p";
    const text = line.replace(/^#{1,4}\s+/, "").replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+[.)]\s+/, "");
    const prev = blocks[blocks.length - 1];
    if (prev && prev.type === kind && kind !== "h" && prev.lines.length) prev.lines.push(text);
    else blocks.push({ type: kind, lines: [text] });
  }
  return blocks.filter((b) => b.lines.length);
}

export default function Markdown({ text }: { text: string }) {
  return (
    <>
      {parseBlocks(text).map((b, i) =>
        b.type === "ul" ? <ul key={i}>{b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}</ul>
        : b.type === "ol" ? <ol key={i}>{b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}</ol>
        : b.type === "h" ? <h4 key={i}>{inline(b.lines[0])}</h4>
        : <p key={i}>{inline(b.lines.join(" "))}</p>)}
    </>
  );
}
