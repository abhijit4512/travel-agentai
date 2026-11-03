// Replace the existing ImageManager.tsx with this version.
import { useRef, useState } from "react";
import { Search, CheckCircle2, Loader2, Image as ImageIcon, Upload } from "lucide-react";
import { adminApi } from "../../services/adminApi";

type Photo = {
  url: string; alt: string; attribution: string; attribution_uri: string;
  provider: string; license?: string; license_uri?: string; photo_uri?: string; source_id?: string;
};
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function ImageManager() {
  const [name,setName] = useState(""); const [state,setState] = useState("");
  const [id,setId] = useState(""); const [items,setItems] = useState<Photo[]>([]);
  const [chosen,setChosen] = useState<Photo|null>(null); const [busy,setBusy] = useState(false);
  const [uploading,setUploading] = useState(false); const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState(""); const [error,setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function search() {
    if (name.trim().length < 2) { setError("Enter a destination name."); return; }
    setBusy(true); setError(""); setNotice(""); setChosen(null);
    try {
      const r = await adminApi.searchImages([name.trim(),state.trim(),"India"].filter(Boolean).join(" "),8);
      setItems(r.items || []); if (!id.trim()) setId(slug(name));
      if (!r.items?.length) setNotice((r.errors || []).join(" ") || "No images found.");
      else if (r.errors?.length) setNotice(r.errors.join(" "));
    } catch(e) { setError(e instanceof Error ? e.message : "Search failed."); }
    finally { setBusy(false); }
  }

  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Image must be 8 MB or smaller."); return; }
    setUploading(true); setError(""); setNotice("");
    try {
      const r = await adminApi.uploadImage(file);
      setItems(current => [r.item, ...current]);
      setChosen(r.item);
      setNotice("Image uploaded. It is selected below; click Select and Save to publish it on the destination card.");
    } catch(e) { setError(e instanceof Error ? e.message : "Image upload failed."); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function save() {
    if (!chosen) return;
    const destinationId = id.trim() || slug(name);
    if (!/^[a-z0-9-]{2,100}$/.test(destinationId)) { setError("Destination ID must use lowercase letters, numbers, and hyphens."); return; }
    if (name.trim().length < 2) { setError("Enter the destination name."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      await adminApi.saveImageSelection({destination_id:destinationId,
        destination_name:name.trim(),state:state.trim(),photo:chosen});
      setNotice(`Saved the selected image for ${name}. It will now be returned by the destination photo API.`);
    } catch(e) { setError(e instanceof Error ? e.message : "Save failed."); }
    finally { setSaving(false); }
  }

  return <section className="im-manager">
    <header><p className="eyebrow">CONTENT MANAGEMENT</p><h1>Destination Image Manager</h1>
      <p className="muted">Upload your own photo or search online, select one image, and publish it to the destination card.</p></header>
    <div className="card im-search"><div className="im-fields">
      <label>Destination / landmark<input value={name} onChange={e=>setName(e.target.value)} placeholder="Hampi"/></label>
      <label>State<input value={state} onChange={e=>setState(e.target.value)} placeholder="Karnataka"/></label>
      <label>Destination ID<input value={id} onChange={e=>setId(e.target.value)} placeholder="hampi"/></label>
      <button className="btn primary" onClick={search} disabled={busy}><Search size={16}/>{busy?"Searching…":"Search online"}</button>
    </div><p className="small muted">Use the exact catalogue ID for an existing destination.</p>
      <div className="im-upload-row">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>upload(e.target.files?.[0])}/>
        <button className="btn ghost" type="button" onClick={()=>fileRef.current?.click()} disabled={uploading}>
          {uploading?<Loader2 size={16}/>:<Upload size={16}/>} {uploading?"Uploading…":"Upload image from computer"}
        </button>
        <small className="muted">JPG, PNG or WEBP · Maximum 8 MB</small>
      </div>
    </div>
    {error && <p className="im-alert error">{error}</p>}{notice && <p className="im-alert">{notice}</p>}
    <h2>Available images ({items.length})</h2>
    <div className="im-grid">{items.map((p,i)=><article className={`card im-card ${chosen===p?"is-selected":""}`} key={`${p.provider}-${p.source_id||i}`}>
      <img src={p.url} alt={p.alt||name} loading="lazy"/><div className="im-card-body">
        <strong>{p.provider}</strong><p className="small">By {p.attribution||"Contributor"}</p>
        <p className="small muted">{p.license||"Check source licence"}</p>
        <div className="im-links">{p.attribution_uri&&<a href={p.attribution_uri} target="_blank" rel="noreferrer">Creator</a>}
          {p.photo_uri&&<a href={p.photo_uri} target="_blank" rel="noreferrer">Original</a>}
          {p.license_uri&&<a href={p.license_uri} target="_blank" rel="noreferrer">Licence</a>}</div>
        <button className={`btn sm ${chosen===p?"primary":"ghost"}`} onClick={()=>setChosen(p)}>{chosen===p?"Selected":"Select this image"}</button>
      </div></article>)}</div>
    {chosen&&<div className="card im-savebar"><span><b>Selected: {chosen.provider}</b><br/><small className="muted">Save this image to use it on the public destination card.</small></span>
      <button className="btn primary" onClick={save} disabled={saving}>{saving?<Loader2 size={16}/>:<CheckCircle2 size={16}/>} {saving?"Saving…":"Select and Save"}</button></div>}
    {!items.length&&!busy&&<div className="card im-empty"><ImageIcon/><p>Upload an image or search online to view images.</p></div>}
  </section>;
}
