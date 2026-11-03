/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSessionId, getToken } from "./api";

export type Row = Record<string, any>;

async function treq<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isForm = init.body instanceof FormData;
  const res = await fetch(path, { ...init, headers: { ...(isForm ? {} : { "Content-Type": "application/json" }), "X-Session-Id": getSessionId(), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) } });
  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    try { message = (await res.json())?.error?.message ?? message; } catch { /* not JSON */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
const qs = (o: Record<string, unknown>) => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, String(v)); }); return p.toString(); };
const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const travelApi = {
  vehicles: (category = "") => treq<{ categories: Record<string, string>; vehicles: Row[]; note: string }>(`/api/travel/vehicles?${qs({ category })}`),
  fuelPrice: (city: string, fuel: string) => treq<Row>(`/api/travel/fuel/price?${qs({ city, fuel })}`),
  estimate: (body: Row) => treq<{ stops: Row[]; results: Row[]; maps_link: string | null; cheapest_vehicle_id: string | null }>("/api/travel/roadtrip/estimate", post(body)),
  nearby: (p: Row) => treq<Row>(`/api/travel/nearby?${qs(p)}`),
  hotels: (p: Row) => treq<Row>(`/api/travel/hotels?${qs(p)}`),
  links: (p: Row) => treq<{ links: { label: string; url: string; kind: string }[]; disclaimer: string }>(`/api/travel/links?${qs(p)}`),
  saveRoadTrip: (title: string, request: Row, summary: Row) => treq<Row>("/api/travel/roadtrips", post({ title, request, summary })),
  roadTrips: () => treq<{ items: Row[] }>("/api/travel/roadtrips"),
  deleteRoadTrip: (id: number) => treq<void>(`/api/travel/roadtrips/${id}`, { method: "DELETE" }),
  saveSearch: (kind: string, title: string, params: Row) => treq<Row>("/api/travel/searches", post({ kind, title, params })),
  searches: (kind = "") => treq<{ items: Row[] }>(`/api/travel/searches?${qs({ kind })}`),
  deleteSearch: (id: number) => treq<void>(`/api/travel/searches/${id}`, { method: "DELETE" }),
  logBooking: (b: Row) => treq<Row>("/api/travel/bookings/external", post(b)),
  myBookings: (category = "") => treq<{ items: Row[]; note: string }>(`/api/travel/bookings?${qs({ category })}`),
  deleteBooking: (id: number) => treq<void>(`/api/travel/bookings/${id}`, { method: "DELETE" }),
  overview: () => treq<Row>("/api/travel/my/overview"),
  // ---- memories ----
  albums: () => treq<{ items: Row[] }>("/api/memories/albums"),
  album: (id: number | string) => treq<Row>(`/api/memories/albums/${id}`),
  createAlbum: (b: Row) => treq<Row>("/api/memories/albums", post(b)),
  patchAlbum: (id: number, b: Row) => treq<Row>(`/api/memories/albums/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  deleteAlbum: (id: number) => treq<void>(`/api/memories/albums/${id}`, { method: "DELETE" }),
  setVisibility: (id: number, visibility: string) => treq<Row>(`/api/memories/albums/${id}/visibility`, post({ visibility })),
  caption: (mediaId: number, caption: string) => treq<Row>(`/api/memories/media/${mediaId}`, { method: "PATCH", body: JSON.stringify({ caption }) }),
  deleteMedia: (mediaId: number) => treq<void>(`/api/memories/media/${mediaId}`, { method: "DELETE" }),
  timeline: () => treq<Row>("/api/memories/timeline"),
  recap: (year: number) => treq<Row>(`/api/memories/recap?year=${year}`),
  recapAi: (year: number) => treq<{ text: string; note: string }>(`/api/memories/recap/ai?year=${year}`),
  albumAi: (id: number, task: string) => treq<{ text: string; note: string }>(`/api/memories/albums/${id}/ai`, post({ task })),
  shared: (token: string) => treq<Row>(`/api/memories/shared/${token}`),
  publicAlbums: (page = 1) => treq<Row>(`/api/memories/public?page=${page}`),
  /** Upload with a progress callback (fetch cannot report upload progress, XMLHttpRequest can). */
  upload: (albumId: number, file: File, caption: string, onProgress: (pct: number) => void) => new Promise<Row>((resolve, reject) => {
    const fd = new FormData(); fd.append("file", file); fd.append("caption", caption);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/memories/albums/${albumId}/media`);
    const token = getToken(); if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => { let body: Row = {}; try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ } xhr.status < 300 ? resolve(body) : reject(new Error(body?.error?.message ?? `Upload failed (${xhr.status}).`)); };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(fd);
  }),
  /** Albums are downloaded with the login header, then saved as a file. */
  downloadAlbum: async (id: number, title: string) => {
    const res = await fetch(`/api/memories/albums/${id}/download`, { headers: { Authorization: `Bearer ${getToken() ?? ""}` } });
    if (!res.ok) throw new Error(`Download failed (${res.status}).`);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/[^\w-]+/g, "_")}.zip`; a.click(); URL.revokeObjectURL(url);
  },
};
