import ChatView from "../components/ChatView";
import { useSeo } from "../hooks/useSeo";

export default function Chat() {
  useSeo({ title: "AI travel planner", description: "Chat or speak with your AI travel concierge to plan trips across India." });
  return (
    <div className="container page" style={{ maxWidth: 900, height: "calc(100vh - 68px)", display: "flex", flexDirection: "column" }}>
      <div className="page-head" style={{ marginBottom: ".75rem" }}><p className="eyebrow">Concierge</p><h1 style={{ marginBottom: 0 }}>AI travel planner</h1></div>
      <div style={{ flex: 1, minHeight: 0 }}><ChatView /></div>
    </div>
  );
}
