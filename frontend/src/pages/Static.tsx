import { FormEvent, ReactNode, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorBox } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";

const Page = ({ title, children }: { title: string; children: ReactNode }) => <div className="container page"><div className="prose"><h1>{title}</h1>{children}</div></div>;

export function About() {
  useSeo({ title: "About" });
  return (
    <Page title="About Yatra AI">
      <p>Yatra AI helps travellers discover places across every Indian state and union territory and plan trips with an AI concierge, an editable itinerary and an illustrative budget in rupees.</p>
      <h2>What to know</h2>
      <ul><li>The destination catalogue is a seed list written from general knowledge. It is not complete and has not been verified against official sources.</li>
        <li>Opening hours, entry fees, permits, ritual rules and live prices are deliberately not shown as facts. Please use official websites for those.</li>
        <li>Budgets are illustrative estimates. This app cannot book tickets, hotels or safaris.</li>
        <li>Photos come from Wikimedia Commons and are credited with their licenses.</li></ul>
      <p>Spot something wrong? <Link to="/contact">Tell us</Link>.</p>
    </Page>
  );
}

export function Contact() {
  useSeo({ title: "Contact and feedback" });
  const [sp] = useSearchParams();
  const place = sp.get("place") ?? undefined;
  const [kind, setKind] = useState(place ? "incorrect_info" : "other");
  const [message, setMessage] = useState(""), [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle"), [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setError("");
    if (message.trim().length < 5) { setError("Please write at least a few words."); return; }
    setState("busy");
    try { await api.feedback({ kind, message, place_id: place, email: email || undefined }); setState("done"); } catch (err) { setError((err as Error).message); setState("idle"); }
  }
  return (
    <Page title="Contact and feedback">
      <p>Use this form to report incorrect destination details, bugs or ideas. We do not publish a business address or phone number here yet.</p>
      {state === "done" ? <p className="notice warn" role="status">Thank you. Your feedback was received.</p> : (
        <form className="stack" onSubmit={submit}>
          <label>Type<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="incorrect_info">Incorrect destination information</option><option value="bug">Something is broken</option><option value="idea">Idea</option><option value="other">Other</option></select></label>
          {place && <p className="small muted">About destination: <strong>{place}</strong></p>}
          <label>Message<textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} /></label>
          <label>Email (optional, only if you want a reply)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} /></label>
          {error && <ErrorBox message={error} />}
          <button className="btn primary" disabled={state === "busy"}>{state === "busy" ? "Sending..." : "Send feedback"}</button>
        </form>)}
    </Page>
  );
}

export function Privacy() {
  useSeo({ title: "Privacy policy (draft)" });
  return (
    <Page title="Privacy policy">
      <p className="notice warn"><strong>Draft text for review.</strong> This is not legal advice. Have a qualified professional review it before you publish the site.</p>
      <h2>What we store</h2><ul><li>If you create an account: your name, email and a salted hash of your password (never the password itself).</li>
        <li>Saved trips, wishlist items and preferences, linked to your account or to a random guest id in your browser.</li>
        <li>Feedback you send us, and your email if you choose to give it.</li></ul>
      <h2>In your browser</h2><p>We keep a login token, a guest id, your theme choice, chat history and recent searches in your browser storage. You can clear them in your browser settings.</p>
      <h2>Third parties</h2><p>Photos are loaded from Wikimedia Commons, weather from Open-Meteo, and AI replies may be produced by Google Gemini when the AI key is configured. Voice input and speech use your browser's own speech services.</p>
      <h2>Your choices</h2><p>You can delete saved trips and wishlist items in the app. To delete your account, contact the site operator.</p>
    </Page>
  );
}

export function Terms() {
  useSeo({ title: "Terms of use (draft)" });
  return (
    <Page title="Terms of use">
      <p className="notice warn"><strong>Draft text for review.</strong> Have a qualified professional review it before you publish the site.</p>
      <ul><li>Content is general information only. Verify opening hours, prices, permits, safety and travel rules with official sources.</li>
        <li>Budgets are illustrative estimates, not quotes or live prices.</li>
        <li>This service does not make bookings and is not a travel agent.</li>
        <li>You are responsible for your travel decisions and for following local laws, temple, park and forest rules.</li>
        <li>Photos remain the property of their creators and are shown under their stated licenses.</li></ul>
    </Page>
  );
}

const FAQ: [string, string][] = [
  ["Can I book tickets or hotels here?", "No. The app helps you plan. Book on official sites such as IRCTC, airline and hotel websites."],
  ["Are the prices real?", "No. They are illustrative estimates built from simple rules. Live fares are not connected."],
  ["Why is a place I want missing?", "The catalogue is a growing seed list. You can ask for additions through the feedback form."],
  ["Does voice work in every language?", "Voice input and playback use your browser. Support for Hindi, Telugu, Tamil, Kannada and Malayalam depends on your browser and device voices."],
  ["Is the AI always right?", "No. Check important details such as timings, permits and safety with official sources."],
  ["How do I share a trip?", "Save the trip, choose Share link, and send the link. Turn sharing off any time."],
  ["Do I need an account?", "No. Without an account your saved trips stay in this browser. An account keeps them across devices."],
];
export function Help() {
  useSeo({ title: "Help and FAQ", jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } });
  return <Page title="Help and FAQ">{FAQ.map(([q, a]) => <details key={q} className="acc"><summary>{q}</summary><p>{a}</p></details>)}<p style={{ marginTop: "1.5rem" }}>Still stuck? <Link to="/contact">Send feedback</Link>.</p></Page>;
}

export function NotFound() {
  useSeo({ title: "Page not found" });
  return <div className="container page"><h1>We could not find that page</h1><p className="muted">The link may be old or mistyped.</p><div className="row"><Link className="btn primary" to="/">Go home</Link><Link className="btn" to="/explore">Explore India</Link></div></div>;
}
