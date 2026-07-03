import { useSyncExternalStore } from "react";
import type { Audit, AuditItem, ActivityEvent, Auditor, Role } from "./types";
import { AUDITS, AUDITORS, ACTIVITY } from "./seed";

interface Notification {
  id: string;
  title: string;
  body: string;
  when: string;
  read: boolean;
}
interface Settings {
  tolerance: number;
  defaultWarehouseId: string;
  emailNotifications: boolean;
  auditNumberFormat: string;
  theme: "light" | "dark";
}

interface State {
  audits: Audit[];
  auditors: Auditor[];
  activity: ActivityEvent[];
  notifications: Notification[];
  settings: Settings;
  currentUserId: string;
}

const LS_KEY = "spintify:auditing:v1";

function load(): State {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
  }
  return {
    audits: AUDITS,
    auditors: AUDITORS,
    activity: ACTIVITY,
    notifications: [
      { id: "n-1", title: "New audit assigned", body: "AUD-2601-0012 assigned to you", when: new Date().toISOString(), read: false },
      { id: "n-2", title: "Approval required", body: "AUD-2601-0009 awaits your approval", when: new Date().toISOString(), read: false },
      { id: "n-3", title: "Mismatch flagged", body: "3 mismatches on Chennai Central", when: new Date().toISOString(), read: true },
    ],
    settings: {
      tolerance: 2,
      defaultWarehouseId: "wh-1",
      emailNotifications: true,
      auditNumberFormat: "AUD-{YY}{MM}-####",
      theme: "light",
    },
    currentUserId: "u-1",
  };
}

let state: State = load();
const listeners = new Set<() => void>();
function emit() {
  if (typeof window !== "undefined") window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => sel(state),
    () => sel(state),
  );
}

export const actions = {
  addAudit(a: Audit) {
    state = { ...state, audits: [a, ...state.audits] };
    emit();
  },
  updateAudit(id: string, patch: Partial<Audit>) {
    state = { ...state, audits: state.audits.map((a) => (a.id === id ? { ...a, ...patch } : a)) };
    emit();
  },
  updateItem(auditId: string, partId: string, patch: Partial<AuditItem>) {
    state = {
      ...state,
      audits: state.audits.map((a) =>
        a.id === auditId ? { ...a, items: a.items.map((i) => (i.partId === partId ? { ...i, ...patch } : i)) } : a,
      ),
    };
    emit();
  },
  setUserRole(userId: string, role: Role) {
    state = { ...state, auditors: state.auditors.map((u) => (u.id === userId ? { ...u, role } : u)) };
    emit();
  },
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
    state = { ...state, settings: { ...state.settings, [k]: v } };
    if (k === "theme" && typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", v === "dark");
    }
    emit();
  },
  markAllRead() {
    state = { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    emit();
  },
  addNotification(n: Omit<Notification, "id" | "when" | "read">) {
    state = {
      ...state,
      notifications: [{ ...n, id: `n-${Date.now()}`, when: new Date().toISOString(), read: false }, ...state.notifications],
    };
    emit();
  },
  resetToSeed() {
    if (typeof window !== "undefined") window.localStorage.removeItem(LS_KEY);
    state = load();
    emit();
  },
};

export function currentUser() {
  return state.auditors.find((a) => a.id === state.currentUserId)!;
}
