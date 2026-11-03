import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import MiniDestination from "../components/MiniDestination";
import { LANGUAGES, useSpeechRecognition, useSpeechSynthesis } from "../hooks/useSpeech";
import { api } from "../services/api";
import { stripMarkdown } from "../services/text";

interface Msg { role: "user" | "ai"; text: string; ids?: string[]; followUps?: string[]; notice?: string | null; error?: boolean }
const STORE = "yatra_chat_history";
const STARTERS = ["Plan 5 days in Kerala for two, budget Rs 25,000", "Weekend trip near Hyderabad", "Best places for waterfalls and hills"];

function load(): Msg[] {
  try { return JSON.parse(localStorage.getItem(STORE) ?? "[]"); } catch { return []; }
}

export default function Chat() {
  const location = useLocation();
  const [msgs, setMsgs] = useState<Msg[]>(load);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState("en-IN");
  const [readAloud, setReadAloud] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const sentPrefill = useRef(false);
  const tts = useSpeechSynthesis();
  const onVoice = useCallback((t: string) => setInput(t), []);   // recognised text lands in the input so it can be edited
  const stt = useSpeechRecognition(lang, onVoice);

  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-40))); } catch { /* storage full or blocked */ } endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    stt.stop(); tts.stop();
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput(""); setBusy(true);
    try {
      const r = await api.chat(text, lang);
      setMsgs((m) => [...m, { role: "ai", text: r.reply, ids: r.destination_ids, followUps: r.follow_ups, notice: r.notice }]);
      if (readAloud) tts.speak(stripMarkdown(r.reply), lang);
    } catch (e) {
      setMsgs((m) => [...m, { role: "ai", text: (e as Error).message, error: true }]);
    } finally { setBusy(false); }
  }, [busy, lang, readAloud, stt, tts]);

  useEffect(() => {
    const pre = (location.state as { prefill?: string } | null)?.prefill;
    if (pre && !sentPrefill.current) { sentPrefill.current = true; void send(pre); }
  }, [location.state, send]);

  const submit = (e: FormEvent) => { e.preventDefault(); void send(input); };

  return (
    <div className="page chat">
      <div className="chat-head">
        <h1>AI travel chat</h1>
        <div className="chat-tools">
          <label>Language
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={readAloud} onChange={(e) => setReadAloud(e.target.checked)} disabled={!tts.supported} /> Read replies aloud</label>
          {tts.speaking && <button className="btn ghost" onClick={tts.stop}>Stop speaking</button>}
          <button className="btn ghost" onClick={() => { tts.stop(); setMsgs([]); }}>Clear</button>
        </div>
      </div>
      <p className="muted small">Voice support depends on your browser and language. Typing always works.</p>

      <div className="log" role="log" aria-live="polite" aria-label="Conversation">
        {msgs.length === 0 && (
          <div className="empty"><h3>Where would you like to go?</h3>
            <div className="chips">{STARTERS.map((s) => <button key={s} className="chip-btn" onClick={() => void send(s)}>{s}</button>)}</div></div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role} ${m.error ? "err" : ""}`}>
            <p>{m.text}</p>
            {m.notice && <p className="small muted">{m.notice}</p>}
            {m.ids && m.ids.length > 0 && <div className="mini-row">{m.ids.map((id) => <MiniDestination key={id} id={id} />)}</div>}
            {m.role === "ai" && !m.error && tts.supported && <button className="link" onClick={() => tts.speak(stripMarkdown(m.text), lang)}>Listen</button>}
            {m.followUps && i === msgs.length - 1 && (
              <div className="chips">{m.followUps.map((f) => <button key={f} className="chip-btn" onClick={() => void send(f)}>{f}</button>)}</div>
            )}
          </div>
        ))}
        {busy && <div className="bubble ai"><p className="typing">Planning<span>.</span><span>.</span><span>.</span></p></div>}
        <div ref={endRef} />
      </div>

      {stt.listening && <p className="listening" role="status"><i /> Listening... speak now</p>}
      {stt.error && <p className="notice warn" role="status">{stt.error}</p>}
      <form className="composer" onSubmit={submit}>
        <label htmlFor="msg" className="sr">Message</label>
        <input id="msg" value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000} placeholder="Type or tap the microphone..." autoComplete="off" />
        <button type="button" className={`btn icon ${stt.listening ? "live" : ""}`} onClick={stt.listening ? stt.stop : stt.start}
          aria-pressed={stt.listening} aria-label={stt.listening ? "Stop listening" : "Start voice input"} disabled={!stt.supported}
          title={stt.supported ? "" : "Voice input is not supported in this browser"}>{stt.listening ? "Stop" : "Mic"}</button>
        <button className="btn primary" type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
