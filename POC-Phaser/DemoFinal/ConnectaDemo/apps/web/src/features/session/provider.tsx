"use client";
import {
  initialState,
  reduce,
  stateSchema,
  type Action,
  type AppState,
} from "@/domain/state";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
const STORAGE = "connecta.frontend.v1";
const Context = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
  ready: boolean;
  notify: (text: string) => void;
} | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.motion = state.motion ? "on" : "off";
  }, [state.motion]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const parsed = stateSchema.safeParse(JSON.parse(raw));
        if (parsed.success) setState(parsed.data);
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  const send = useCallback(
    (action: Action) => setState((previous) => reduce(previous, action)),
    [],
  );
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state));
    } catch {
      setStorageError(true);
    }
  }, [state, ready]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const notify = useCallback((text: string) => setNotice(text), []);
  return (
    <Context value={{ state, dispatch: send, ready, notify }}>
      {children}
      {storageError && (
        <div className="storage-warning" role="status">
          Browser storage is unavailable. Changes last for this visit.
        </div>
      )}
      <div
        className={`toast ${notice ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
    </Context>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("AppProvider is required");
  return value;
}
