"use client";

import { useSyncExternalStore } from "react";
import { PERSONAS, type PersonaId } from "./personas";

const KEY = "persona";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
}
function read(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
const valid = (x: string | null | undefined): x is PersonaId => !!x && PERSONAS.some((p) => p.id === x);

/** Remember the visitor's industry across pages (per browser only). */
export function savePersona(id: PersonaId) {
  try { localStorage.setItem(KEY, id); } catch { /* storage blocked: still works for this page */ }
  listeners.forEach((l) => l());
}

/** Industry from the ?for= link first (so shared links work), else the saved choice. */
export function usePersonaId(fromUrl?: string | null): PersonaId | null {
  const stored = useSyncExternalStore(subscribe, read, () => null);
  if (valid(fromUrl)) return fromUrl;
  return valid(stored) ? stored : null;
}
