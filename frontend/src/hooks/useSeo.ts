import { useEffect } from "react";

interface Seo { title: string; description?: string; image?: string; jsonLd?: object }

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", value);
}

/** Sets the page title, description, canonical link, Open Graph tags and optional JSON-LD for each page. */
export function useSeo({ title, description, image, jsonLd }: Seo) {
  useEffect(() => {
    const full = title.includes("Yatra") ? title : `${title} | Yatra AI`;
    document.title = full;
    const desc = description ?? "Discover temples, forests, beaches, hill stations and heritage across India with an AI travel companion.";
    setMeta("name", "description", desc);
    setMeta("property", "og:title", full); setMeta("property", "og:description", desc); setMeta("property", "og:type", "website");
    if (image) setMeta("property", "og:image", image);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = window.location.origin + window.location.pathname;
    let script = document.getElementById("jsonld") as HTMLScriptElement | null;
    if (jsonLd) {
      if (!script) { script = document.createElement("script"); script.id = "jsonld"; script.type = "application/ld+json"; document.head.appendChild(script); }
      script.textContent = JSON.stringify(jsonLd);
    } else script?.remove();
  }, [title, description, image, jsonLd]);
}
