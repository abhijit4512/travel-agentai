import { Maximize2, MessageCircle, Minimize2, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import ChatView from "./ChatView";

/** Floating AI concierge button. Opens a chat window you can expand to full screen. */
export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const { pathname } = useLocation();
  if (pathname === "/chat") return null;
  if (!open) return <button className="fab no-print" onClick={() => setOpen(true)} aria-label="Open the AI travel assistant"><MessageCircle size={20} /> Ask AI</button>;
  return (
    <aside className={`widget ${full ? "full" : ""}`} aria-label="AI travel assistant">
      <div className="widget-head">
        <h3><Sparkles size={16} style={{ verticalAlign: "-2px" }} /> Yatra AI concierge</h3>
        <div className="row" style={{ gap: 0 }}>
          <button onClick={() => setFull(!full)} aria-label={full ? "Exit full screen" : "Full-screen planner"}>{full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
          <button onClick={() => { setOpen(false); setFull(false); }} aria-label="Close assistant"><X size={18} /></button>
        </div>
      </div>
      <div className="widget-body"><ChatView compact /></div>
    </aside>
  );
}
