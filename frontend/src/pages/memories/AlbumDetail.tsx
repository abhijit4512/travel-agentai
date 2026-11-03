import { Download, Play, Share2, Sparkles, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Slideshow from "../../components/travel/Slideshow";
import { ErrorBox, Skeleton } from "../../components/ui";
import { useSeo } from "../../hooks/useSeo";
import { Row, travelApi } from "../../services/travelApi";

export default function AlbumDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [a, setA] = useState<Row | null>(null), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({}), [show, setShow] = useState<number | null>(null);
  const [edit, setEdit] = useState<Row | null>(null), [ai, setAi] = useState<Row | null>(null), [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const load = () => travelApi.album(id).then(setA).catch((e: Error) => setErr(e.message));
  useEffect(() => { setA(null); void load(); }, [id]);   // eslint-disable-line react-hooks/exhaustive-deps
  useSeo({ title: a ? `${a.title} (my album)` : "Album" });

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); e.target.value = ""; setErr("");
    for (const f of files) {                                              // one at a time so each shows its own progress
      setProgress((p) => ({ ...p, [f.name]: 0 }));
      try { await travelApi.upload(a!.id, f, "", (pct) => setProgress((p) => ({ ...p, [f.name]: pct }))); }
      catch (x) { setErr(`${f.name}: ${(x as Error).message}`); }
      setProgress((p) => { const n = { ...p }; delete n[f.name]; return n; });
    }
    await load();
  }
  async function save(e: React.FormEvent) { e.preventDefault(); try { setA(await travelApi.patchAlbum(a!.id, { title: edit!.title, description: edit!.description, story: edit!.story, location_name: edit!.location_name, travel_date: edit!.travel_date || null })); setEdit(null); setMsg("Saved."); } catch (x) { setErr((x as Error).message); } }
  async function vis(v: string) { try { setA(await travelApi.setVisibility(a!.id, v)); setMsg(v === "private" ? "Album is private. Old share links stopped working." : "Link sharing is on."); } catch (x) { setErr((x as Error).message); } }
  async function runAi(task: string) { setBusy(true); setAi(null); try { setAi(await travelApi.albumAi(a!.id, task)); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); } }
  async function del() { if (confirm(`Delete "${a!.title}" and all its files? This cannot be undone.`)) { await travelApi.deleteAlbum(a!.id); nav("/memories"); } }

  if (err && !a) return <div className="container page"><ErrorBox message={err} /><Link className="btn" to="/memories">Back</Link></div>;
  if (!a) return <div className="container page"><Skeleton height={300} /></div>;
  const photos: Row[] = a.media.filter((m: Row) => m.kind === "photo"), videos: Row[] = a.media.filter((m: Row) => m.kind === "video"), docs: Row[] = a.media.filter((m: Row) => m.kind === "document");
  const shareUrl = a.share_token ? `${window.location.origin}/memories/shared/${a.share_token}` : "";

  return (
    <div className="container page">
      <p className="small"><Link to="/memories">All albums</Link></p>
      {!edit ? (
        <div className="page-head row" style={{ justifyContent: "space-between" }}>
          <div><h1>{a.title}</h1><p className="muted">{a.location_name}{a.travel_date ? ` · ${a.travel_date}` : ""}</p>{a.description && <p>{a.description}</p>}{a.story && <p style={{ whiteSpace: "pre-wrap" }}>{a.story}</p>}</div>
          <div className="row"><button className="btn sm" onClick={() => setEdit({ ...a })}>Edit details</button>{photos.length > 0 && <button className="btn sm solid" onClick={() => setShow(0)}><Play size={14} /> Slideshow</button>}
            <button className="btn sm" onClick={() => void travelApi.downloadAlbum(a.id, a.title).catch((x: Error) => setErr(x.message))}><Download size={14} /> Download</button></div>
        </div>) : (
        <form className="card stack" onSubmit={save}>
          <div className="field-row"><label>Title<input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required maxLength={120} /></label><label>Location<input value={edit.location_name} onChange={(e) => setEdit({ ...edit, location_name: e.target.value })} maxLength={120} /></label><label>Date<input type="date" value={edit.travel_date ?? ""} onChange={(e) => setEdit({ ...edit, travel_date: e.target.value })} /></label></div>
          <label>Description<input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} maxLength={1000} /></label>
          <label>My travel story<textarea rows={6} value={edit.story} onChange={(e) => setEdit({ ...edit, story: e.target.value })} maxLength={8000} /></label>
          <div className="row"><button className="btn solid">Save</button><button type="button" className="btn ghost" onClick={() => setEdit(null)}>Cancel</button></div></form>)}
      {err && <ErrorBox message={err} />}{msg && <p role="status" className="small ok">{msg}</p>}

      <section className="card stack"><h2 style={{ fontSize: "1.3rem" }}>Add memories</h2>
        <div className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const dt = e.dataTransfer; if (dt.files.length) void onFiles({ target: { files: dt.files, value: "" } } as unknown as ChangeEvent<HTMLInputElement>); }}>
          <Upload size={22} /><p style={{ margin: 0 }}>Drag photos and videos here, or</p>
          <button className="btn" onClick={() => file.current?.click()}>Choose files</button>
          <input ref={file} type="file" multiple hidden accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,application/pdf" onChange={onFiles} />
          <p className="xs muted" style={{ margin: 0 }}>Photos up to 10 MB, videos up to 60 MB (MP4 or WebM), travel documents as PDF up to 10 MB.</p></div>
        {Object.entries(progress).map(([n, pct]) => <div key={n} className="small">{n}<div className="progress"><i style={{ width: `${pct}%` }} /></div></div>)}</section>

      <h2 style={{ marginTop: "1.5rem" }}>Photos ({photos.length})</h2>
      {photos.length === 0 ? <div className="empty">No photos yet.</div> : <div className="mgrid">{photos.map((p, i) => (
        <figure key={p.id} className="mitem"><button className="mimg" onClick={() => setShow(i)} aria-label={`Open ${p.caption || p.original_name}`}><img src={p.url} alt={p.caption || p.original_name} loading="lazy" /></button>
          <figcaption><input defaultValue={p.caption} placeholder="Add a caption" aria-label="Caption" maxLength={300} onBlur={(e) => { if (e.target.value !== p.caption) void travelApi.caption(p.id, e.target.value).catch((x: Error) => setErr(x.message)); }} />
            <span className="row" style={{ gap: 4 }}>{a.cover_media_id !== p.id && <button className="link xs" onClick={() => void travelApi.patchAlbum(a.id, { cover_media_id: p.id }).then(setA)}>Make cover</button>}
              <button className="link xs" onClick={() => void travelApi.deleteMedia(p.id).then(load)} aria-label={`Delete ${p.original_name}`}><Trash2 size={12} /> Delete</button></span></figcaption></figure>))}</div>}
      {videos.length > 0 && <><h2>Videos ({videos.length})</h2><div className="mgrid">{videos.map((v) => <figure key={v.id} className="mitem"><video src={v.url} controls preload="metadata" /><figcaption><input defaultValue={v.caption} placeholder="Add a caption" aria-label="Caption" maxLength={300} onBlur={(e) => void travelApi.caption(v.id, e.target.value)} /><button className="link xs" onClick={() => void travelApi.deleteMedia(v.id).then(load)}>Delete</button></figcaption></figure>)}</div></>}
      {docs.length > 0 && <><h2>Travel documents ({docs.length})</h2><ul>{docs.map((d) => <li key={d.id}><a href={d.url} target="_blank" rel="noreferrer">{d.original_name}</a> <button className="link xs" onClick={() => void travelApi.deleteMedia(d.id).then(load)}>Delete</button></li>)}</ul><p className="xs muted">Documents are never shared, even if the album is shared.</p></>}

      <div className="two-col" style={{ marginTop: "1.5rem" }}>
        <section className="card stack"><h2 style={{ fontSize: "1.3rem" }}><Share2 size={18} /> Privacy and sharing</h2>
          <div role="radiogroup" aria-label="Who can see this album" className="stack">
            {[["private", "Private", "Only you."], ["shared", "Anyone with the link", "Photos and videos only. No documents."], ["public", "Public gallery", "Listed for everyone, with your first name."]].map(([v, l, d]) => (
              <label key={v} className="check"><input type="radio" name="vis" checked={a.visibility === v} onChange={() => void vis(v)} /><span><b>{l}</b><br /><span className="muted small">{d}</span></span></label>))}</div>
          {shareUrl && <div className="row"><input readOnly value={shareUrl} aria-label="Share link" onFocus={(e) => e.target.select()} style={{ flex: 1 }} /><button className="btn sm" onClick={() => void navigator.clipboard.writeText(shareUrl).then(() => setMsg("Link copied."))}>Copy</button></div>}
          <p className="xs muted">Likes and comments are not available yet. Setting the album back to Private stops old links working at once.</p></section>
        <section className="card stack"><h2 style={{ fontSize: "1.3rem" }}><Sparkles size={18} /> AI helpers</h2>
          <p className="small muted">Uses only your album's text (title, place, story, captions). Your photos and videos are never sent to an AI service.</p>
          <div className="row">{[["titles", "Suggest titles"], ["summary", "Trip summary"], ["highlights", "Highlights"]].map(([t, l]) => <button key={t} className="btn sm" disabled={busy} onClick={() => void runAi(t)}>{l}</button>)}</div>
          {busy && <p className="small">Writing...</p>}{ai && <div><p style={{ whiteSpace: "pre-wrap" }}>{ai.text}</p><p className="xs muted">{ai.note}</p></div>}</section>
      </div>
      <p style={{ marginTop: "2rem" }}><button className="btn ghost" onClick={() => void del()}><Trash2 size={14} /> Delete album</button></p>
      {show !== null && <Slideshow photos={photos} start={show} onClose={() => setShow(null)} />}
    </div>
  );
}
