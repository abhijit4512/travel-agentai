import { useCallback, useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const SpeechRecognitionImpl: any =
  typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;

export const LANGUAGES = [
  { code: "en-IN", label: "English (India)" }, { code: "hi-IN", label: "Hindi" },
  { code: "te-IN", label: "Telugu" }, { code: "ta-IN", label: "Tamil" },
  { code: "kn-IN", label: "Kannada" }, { code: "ml-IN", label: "Malayalam" },
];

/** Speech to text using the browser. Support varies by browser and language (Chrome and Edge work best). */
export function useSpeechRecognition(lang: string, onText: (text: string) => void) {
  const supported = Boolean(SpeechRecognitionImpl);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  const start = useCallback(() => {
    if (!supported) { setError("Voice input is not supported in this browser. Please type instead."); return; }
    setError(null);
    const rec = new SpeechRecognitionImpl();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      onText(text);
    };
    rec.onerror = (e: any) => {
      setError(e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "Microphone permission was denied. You can still type your message."
        : e.error === "no-speech" ? "I did not hear anything. Try again or type."
        : e.error === "language-not-supported" ? "This browser does not support voice input in the selected language."
        : "Voice input failed. Please type instead.");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setError("Voice input could not start."); }
  }, [lang, onText, supported]);

  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);
  useEffect(() => () => recRef.current?.abort?.(), []);
  return { supported, listening, error, start, stop };
}

/** Text to speech using the browser. Available voices depend on the device. */
export function useSpeechSynthesis() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => { if (supported) window.speechSynthesis.cancel(); setSpeaking(false); }, [supported]);
  const speak = useCallback((text: string, lang: string) => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();                 // interrupt anything already playing
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang === lang);
    if (voice) u.voice = voice;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [supported]);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);
  return { supported, speaking, speak, stop };
}
