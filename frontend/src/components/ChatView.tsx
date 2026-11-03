import { Download, Mic, RotateCcw, Send, Square, Trash2, Volume2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { LANGUAGES, useSpeechRecognition, useSpeechSynthesis } from "../hooks/useSpeech";
import { api } from "../services/api";
import { stripMarkdown } from "../services/text";
import Markdown from "./Markdown";
import MiniPlace from "./MiniPlace";

interface Msg { role: "user" | "ai"; text: string; ids?: string[]; followUps?: string[]; notice?: string | null; error?: boolean; retry?: string }
const STORE = "yatra_chat_history";
const PROMPTS = [
  "Plan a 7-day South India temple trip starting from Hyderabad",
  "Show me the best beaches in Andhra Pradesh",
  "Plan a forest and wildlife trip for my family",
  "Suggest less crowded hill stations for December",
  "Plan a Char Dham pilgrimage",
  "Find waterfalls near Bengaluru",
  "Plan a trip covering Goa, Gokarna and Murudeshwar",
  "Show historical monuments within 300 km of Hyderabad",
];
const load = (): Msg[] => { try { return JSON.parse(localStorage.getItem(STORE) ?? "[]"); } catch { return []; } };

/** The AI concierge. Used both as the full page and inside the floating widget. Calls the existing ADK /api/chat endpoint. */
export default function ChatView({ compact = false }: { compact?: boolean }) {
  const location = useLocation();
  const [msgs, setMsgs] = useState<Msg[]>(load);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState("en-IN");
  const [readAloud, setReadAloud] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const sentPrefill = useRef(false);
  const tts = useSpeechSynthesis();
  const onVoice = useCallback((t: string) => setInput(t), []);   // recognised text lands in the box so it can be edited
  const stt = useSpeechRecognition(lang, onVoice);

  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-40))); } catch { /* storage full or blocked */ } endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    stt.stop(); tts.stop();
    setMsgs((m) => [...m.filter((x) => !x.error), { role: "user", text }]);
    setInput(""); setBusy(true);
    try {
      const r = await api.chat(text, lang);
      setMsgs((m) => [...m, { role: "ai", text: r.reply, ids: r.destination_ids, followUps: r.follow_ups, notice: r.notice }]);
      if (readAloud) tts.speak(stripMarkdown(r.reply), lang);
    } catch (e) {
      setMsgs((m) => [...m, { role: "ai", text: (e as Error).message, error: true, retry: text }]);
    } finally { setBusy(false); }
  }, [busy, lang, readAloud, stt, tts]);

  useEffect(() => {
    const pre = (location.state as { prefill?: string } | null)?.prefill;
    if (pre && !sentPrefill.current) { sentPrefill.current = true; void send(pre); }
  }, [location.state, send]);

  function exportChat() {
    const text = msgs.map((m) => `${m.role === "user" ? "You" : "Yatra AI"}: ${m.text}`).join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a"); a.href = url; a.download = "yatra-ai-conversation.txt"; a.click(); URL.revokeObjectURL(url);
  }
  const submit = (e: FormEvent) => { e.preventDefault(); void send(input); };

  return (
    <div className="chatview">
      <div className="row" style={{ marginBottom: ".5rem", justifyContent: "space-between" }}>
        <label style={{ flexDirection: "row", alignItems: "center", fontWeight: 500 }}>Language
          <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ width: "auto", minHeight: 36 }}>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select></label>
        <div className="row" style={{ gap: ".25rem" }}>
          <label className="chip" style={{ flexDirection: "row", fontWeight: 500 }}><input type="checkbox" checked={readAloud} onChange={(e) => setReadAloud(e.target.checked)} disabled={!tts.supported} /><Volume2 size={14} /> Read aloud</label>
          {tts.speaking && <button className="btn sm live" onClick={tts.stop}><Square size={14} /> Stop</button>}
          <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={exportChat} aria-label="Download conversation" disabled={!msgs.length}><Download size={16} /></button>
          <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => { tts.stop(); setMsgs([]); }} aria-label="Clear conversation" disabled={!msgs.length}><Trash2 size={16} /></button>
        </div>
      </div>
      <p className="xs muted" style={{ margin: "0 0 .5rem" }}>Voice depends on your browser and language. Typing always works.</p>

      <div className="log" role="log" aria-live="polite" aria-label="Conversation" style={compact ? { minHeight: 0 } : undefined}>
        {msgs.length === 0 && (
          <div className="stack"><p><strong>Where would you like to go?</strong> Try one of these:</p>
            <div className="chips">{PROMPTS.slice(0, compact ? 4 : 8).map((s) => <button key={s} className="chip" onClick={() => void send(s)}>{s}</button>)}</div></div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role} ${m.error ? "err" : ""}`}>
            {m.role === "ai" && !m.error ? <Markdown text={m.text} /> : <p>{m.text}</p>}
            {m.notice && <p className="xs muted">{m.notice}</p>}
            {m.ids && m.ids.length > 0 && <div className="mini-row">{m.ids.map((id) => <MiniPlace key={id} id={id} />)}</div>}
            {m.error && m.retry && <button className="btn sm ghost" onClick={() => void send(m.retry!)}><RotateCcw size={14} /> Retry</button>}
            {m.role === "ai" && !m.error && tts.supported && <button className="link xs" onClick={() => tts.speak(stripMarkdown(m.text), lang)}>Listen</button>}
            {m.followUps && i === msgs.length - 1 && <div className="chips">{m.followUps.map((f) => <button key={f} className="chip" onClick={() => void send(f)}>{f}</button>)}</div>}
          </div>
        ))}
        {busy && <div className="bubble ai"><p className="typing">Planning<span>.</span><span>.</span><span>.</span></p></div>}
        <div ref={endRef} />
      </div>

      {stt.listening && <p className="listening" role="status"><i /> Listening... speak now</p>}
      {stt.error && <p className="notice warn" role="status">{stt.error}</p>}
      <form className="composer" onSubmit={submit}>
        <label style={{ flex: 1 }}><span className="sr">Message</span>
          <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000} placeholder="Type or tap the microphone..." autoComplete="off" /></label>
        <button type="button" className={`icon-btn ${stt.listening ? "live" : ""}`} onClick={stt.listening ? stt.stop : stt.start} aria-pressed={stt.listening}
          aria-label={stt.listening ? "Stop listening" : "Start voice input"} disabled={!stt.supported} title={stt.supported ? "" : "Voice input is not supported in this browser"}><Mic size={18} /></button>
        <button className="btn primary" type="submit" disabled={busy || !input.trim()}><Send size={16} /> Send</button>
      </form>
    </div>
  );
}
