import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { loadInspections, type Inspection, type RawRow } from "@/lib/inspections";

const SHEET_ID = "1nfOahkHuUnWdsh40f0E3WvIUqTC4phKUxraGSOKyuUs";
// Public CSV export endpoint. Cache-busting query keeps polling fresh.
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const POLL_INTERVAL_MS = 20_000;

interface State {
  inspections: Inspection[];
  checklistCols: string[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useInspections() {
  const [state, setState] = useState<State>({
    inspections: [],
    checklistCols: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchSheet(isInitial: boolean) {
      try {
        const url = `${SHEET_CSV_URL}&_=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();

        const parsed = Papa.parse<RawRow>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.replace(/\r?\n/g, " ").trim(),
        });

        const headers = parsed.meta.fields ?? [];
        const rows = (parsed.data ?? []) as RawRow[];
        const { inspections, checklistCols } = loadInspections(headers, rows);

        if (!cancelled) {
          setState({
            inspections,
            checklistCols,
            loading: false,
            error: null,
            lastUpdated: new Date(),
          });
        }
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: isInitial ? false : s.loading,
          error: err instanceof Error ? err.message : "فشل تحميل البيانات",
        }));
      }
    }

    fetchSheet(true);
    const id = window.setInterval(() => fetchSheet(false), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return state;
}

export function useFormattedLastUpdated(date: Date | null): string {
  return useMemo(() => {
    if (!date) return "—";
    return date.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [date]);
}

export { POLL_INTERVAL_MS };
