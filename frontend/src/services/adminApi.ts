/* eslint-disable @typescript-eslint/no-explicit-any */
// Admin API client. It uses its OWN token (yatra_admin_token), so a customer login can never reach admin screens.
const KEY = "yatra_admin_token";
export const getAdminToken = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const setAdminToken = (t: string | null) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* storage blocked */ } };

export type Row = Record<string, any>;
export interface Paged { items: Row[]; total: number; page: number; page_size: number }
export interface Range { range: string; start?: string; end?: string }
export interface Admin { id: number; name: string; email: string; last_login_at?: string | null }

const qs = (o: Record<string, unknown>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, String(v)); });
  return p.toString();
};


async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAdminToken();

  // Create headers without forcing JSON for file uploads
  const headers = new Headers(init.headers);

  // Set JSON Content-Type only when the request is NOT FormData
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Add admin authentication
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status}).`;

    try {
      const data = await res.json();
      message = data?.error?.message ?? data?.detail ?? message;
    } catch {
      // Response was not JSON
    }

    if (
      (res.status === 401 || res.status === 403) &&
      token &&
      !path.startsWith("/auth/login")
    ) {
      setAdminToken(null);
      window.dispatchEvent(new Event("yatra-admin-logout"));
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

const rq = (r: Range) => qs({ range: r.range, start: r.start, end: r.end });

export const adminApi = {
  login: (email: string, password: string) => req<{ token: string; admin: Admin }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req<Admin>("/auth/me"),
  stats: (r: Range) => req<Row>(`/stats?${rq(r)}`),
  analytics: (r: Range) => req<Row>(`/analytics?${rq(r)}`),
  users: (p: Row) => req<Paged>(`/users?${qs(p)}`),
  user: (id: string | number) => req<Row>(`/users/${id}`),
  setActive: (id: number, active: boolean, reason: string) => req<Row>(`/users/${id}/status`, { method: "POST", body: JSON.stringify({ active, reason }) }),
  trips: (p: Row) => req<Paged>(`/trips?${qs(p)}`),
  trip: (id: string | number) => req<Row>(`/trips/${id}`),
  bookings: (p: Row) => req<Paged>(`/bookings?${qs(p)}`),
  booking: (id: number) => req<Row>(`/bookings/${id}`),
  notifications: (unreadOnly = false) => req<{ items: Row[]; unread: number }>(`/notifications?${qs({ unread_only: unreadOnly || undefined })}`),
  markRead: (ids?: number[]) => req<Row>("/notifications/read", { method: "POST", body: JSON.stringify({ ids: ids ?? null }) }),
  search: (q: string) => req<{ results: Record<string, Row[]> }>(`/search?${qs({ q })}`),
  audit: (page = 1) => req<Paged>(`/audit?page=${page}`),
  searchImages: (q: string, limit = 8) =>
    req<{items: Array<{url:string;alt:string;attribution:string;attribution_uri:string;provider:string;license?:string;license_uri?:string;photo_uri?:string;source_id?:string}>;errors?:string[]}>(
      `/images/search?${qs({q,limit})}`),
  saveImageSelection: (body: {destination_id:string;destination_name:string;state:string;photo:Record<string,any>}) =>
    req<{ok:boolean;item:Record<string,any>}>("/images/selection",{method:"PUT",body:JSON.stringify(body)}),
  /** CSV needs the auth header, so it is fetched and saved as a file instead of being a plain link. */
  downloadCsv: async (kind: string, r: Range) => {
    const res = await fetch(`/api/admin/reports/${kind}.csv?${rq(r)}`, { headers: { Authorization: `Bearer ${getAdminToken() ?? ""}` } });
    if (!res.ok) throw new Error(`Export failed (${res.status}).`);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = url; a.download = `${kind}-report.csv`; a.click(); URL.revokeObjectURL(url);
  
    
  },
  
uploadImage: async (file: File) => {
  const form = new FormData();
  form.append("file", file);

  return req<{
    ok: boolean;
    item: {
      url: string;
      alt: string;
      attribution: string;
      attribution_uri: string;
      provider: string;
      license?: string;
      license_uri?: string;
      photo_uri?: string;
      source_id?: string;
    };
  }>("/images/upload", {
    method: "POST",
    body: form
  });
},

};
export const rangeKey = qs;
