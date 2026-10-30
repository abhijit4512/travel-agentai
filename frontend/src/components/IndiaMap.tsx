import { useEffect, useMemo, useState } from "react";
import type { Destination } from "../types";

// Equirectangular projection of India (lat 6-37, lng 67-99). Dots and state borders share it, so they line up.
const W = 600, H = 640;
const x = (lng: number) => ((lng - 67) / 32) * W;
const y = (lat: number) => H - ((lat - 6) / 32) * H;
const COLOR: Record<string, string> = { temple: "#c97d27", wildlife: "#2f7a4f", beach: "#1b7fa6", hills: "#5f6f52", heritage: "#8a4f2a", island: "#1b7fa6", snow: "#6a7fa0" };

// Simple fallback outline, used only when the state borders file is missing.
const FALLBACK_PATH =
  "M141 18 L167 24 L188 40 L202 50 L223 48 L242 52 L249 70 L242 88 L233 106 L221 114 L219 124 L225 138 L242 144 L261 154 L249 166 L246 182 L255 190 L270 196 L283 204 L300 212 L319 212 L332 218 L351 226 L371 232 L396 232 L396 214 L394 202 L407 198 L411 210 L411 218 L418 224 L441 224 L461 224 L463 204 L471 196 L488 190 L504 186 L521 174 L544 172 L555 188 L566 194 L570 202 L562 210 L549 214 L534 228 L525 240 L517 254 L514 270 L508 282 L497 300 L489 314 L482 321 L476 302 L467 300 L458 298 L454 286 L461 276 L473 262 L465 256 L450 256 L433 256 L427 252 L427 240 L422 236 L412 234 L403 232 L401 242 L398 256 L394 266 L401 274 L409 278 L405 288 L407 296 L411 308 L412 320 L412 327 L399 328 L375 330 L371 342 L369 354 L354 366 L338 374 L324 390 L306 406 L287 422 L268 434 L253 444 L246 460 L248 488 L249 498 L242 516 L240 532 L241 546 L231 554 L225 572 L212 580 L199 598 L188 594 L178 576 L173 556 L163 532 L154 516 L144 496 L141 472 L133 460 L127 450 L120 432 L112 410 L111 390 L109 374 L107 356 L111 338 L105 324 L102 315 L96 326 L98 336 L83 344 L73 346 L62 341 L49 332 L38 320 L38 314 L52 310 L62 302 L43 304 L30 296 L23 285 L41 274 L56 262 L58 240 L54 220 L64 200 L92 190 L111 170 L129 156 L142 142 L142 128 L154 114 L139 106 L129 96 L120 82 L105 68 L111 46 L126 26 Z";

/* ---------- state name matching (data files spell names differently) ---------- */
export const normState = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
const DNHDD = "dadra and nagar haveli and daman and diu";
const ALIAS: Record<string, string> = {
  orissa: "odisha", uttaranchal: "uttarakhand", pondicherry: "puducherry", "nct of delhi": "delhi", "delhi nct": "delhi",
  "andaman and nicobar": "andaman and nicobar islands", "dadra and nagar haveli": DNHDD, "daman and diu": DNHDD, "dnh and dd": DNHDD,
  "jammu and kashmir ut": "jammu and kashmir",
};
export const canonicalState = (name: string) => { const n = normState(name); return ALIAS[n] ?? n; };

/* ---------- GeoJSON to SVG path ---------- */
type Ring = number[][];
const NAME_KEYS = ["NAME_1", "ST_NM", "st_nm", "STATE", "State", "state", "State_Name", "STATE_NAME", "stname", "STNAME", "NAME", "Name", "name"];
function nameOf(p: Record<string, unknown> | null | undefined): string {
  if (!p) return "";
  for (const k of NAME_KEYS) if (typeof p[k] === "string" && p[k]) return p[k] as string;
  const first = Object.values(p).find((v) => typeof v === "string" && v);
  return (first as string) ?? "";
}
/** Converts one ring to path text, dropping points closer than 0.7 px so big files stay light. */
function ringPath(ring: Ring): string {
  let d = "", lx = -1e9, ly = -1e9, n = 0;
  ring.forEach(([lng, lat], i) => {
    const px = x(lng), py = y(lat);
    if (i === 0 || i === ring.length - 1 || Math.hypot(px - lx, py - ly) >= 0.7) {
      d += `${n === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`; lx = px; ly = py; n++;
    }
  });
  return n > 2 ? d + "Z" : "";
}
export function geometryPath(g: { type: string; coordinates: unknown } | null | undefined): string {
  if (!g) return "";
  const polys = g.type === "Polygon" ? [g.coordinates as Ring[]] : g.type === "MultiPolygon" ? (g.coordinates as Ring[][]) : [];
  return polys.map((p) => p.map(ringPath).join("")).join("");
}
export interface StateShape { name: string; d: string }
export function shapesFromGeoJson(j: { type?: string; features?: { properties?: Record<string, unknown> | null; geometry?: { type: string; coordinates: unknown } | null }[] }): StateShape[] {
  const feats = j.type === "FeatureCollection" ? j.features ?? [] : [];
  return feats.map((f) => ({ name: nameOf(f.properties), d: geometryPath(f.geometry) })).filter((s) => s.d);
}

let shapesPromise: Promise<StateShape[]> | null = null;
function loadShapes(): Promise<StateShape[]> {
  if (!shapesPromise) {
    shapesPromise = fetch("/data/india-states.geojson").then(async (r) => {
      if (!r.ok) throw new Error("missing");
      const shapes = shapesFromGeoJson(await r.json());          // a missing file makes Vite return HTML, which fails json() here
      if (shapes.length < 5) throw new Error("not state level");
      return shapes;
    });
  }
  return shapesPromise;
}

interface Props {
  items: Destination[]; selected?: string | null; onSelect: (d: Destination) => void; picked?: string[];
  activeState?: string | null;                      // normalised state name to highlight
  onStateClick?: (stateName: string) => void;
}

export default function IndiaMap({ items, selected, onSelect, picked, activeState, onStateClick }: Props) {
  const [shapes, setShapes] = useState<StateShape[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState("");
  useEffect(() => { loadShapes().then(setShapes).catch(() => setFailed(true)); }, []);

  const isActive = (name: string) => !!activeState && canonicalState(name) === activeState;
  // Draw the selected state last so its highlighted border is not covered by its neighbours.
  const ordered = useMemo(() => (shapes ? [...shapes].sort((a, b) => Number(isActive(a.name)) - Number(isActive(b.name))) : []), [shapes, activeState]); // eslint-disable-line react-hooks/exhaustive-deps

  const dots = useMemo(() => items.map((d) => ({ d, cx: x(d.lng), cy: y(d.lat), c: COLOR[(d.tags ?? d.interests)[0]] ?? "#123d35", st: normState(d.state) })), [items]);
  return (
    <svg className="indiamap" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Map of destinations in India with state borders. Each dot is a destination.">
      {shapes ? (
        <>
          {/* Thick layer underneath: only its outer half shows, which makes the country outline bolder than the state borders */}
          <g aria-hidden="true">{shapes.map((s) => <path key={"h" + s.name + s.d.length} d={s.d} className="india-halo" />)}</g>
          <g>{ordered.map((s) => {
            const on = isActive(s.name);
            return (
              <path key={s.name + s.d.length} d={s.d} className={`india-state ${on ? "on" : ""}`} role="button" tabIndex={0} aria-label={`${s.name}. Select to filter destinations`} aria-pressed={on}
                onClick={() => onStateClick?.(s.name)} onMouseEnter={() => setHover(s.name)} onMouseLeave={() => setHover("")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStateClick?.(s.name); } }}><title>{s.name}</title></path>
            );
          })}</g>
        </>
      ) : <path className="india-shape" d={FALLBACK_PATH} />}
      {hover && <text x="12" y="26" className="india-label">{hover}</text>}
      {!shapes && !failed && <text x="12" y="26" className="india-label">Loading state borders...</text>}
      {failed && <text x="12" y="26" className="india-label">State borders file not found (see README)</text>}
      {dots.map(({ d, cx, cy, c, st }) => (
        <circle key={d.id} cx={cx} cy={cy} r={selected === d.id || picked?.includes(d.id) ? 9 : 5.5} fill={c} stroke="#fff" strokeWidth={picked?.includes(d.id) ? 3 : 1.2}
          opacity={activeState && canonicalState(st) !== activeState ? 0.25 : 1}
          tabIndex={0} role="button" aria-label={`${d.name}, ${d.state}`} onClick={() => onSelect(d)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(d); } }}><title>{d.name}</title></circle>
      ))}
    </svg>
  );
}