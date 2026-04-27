export type RawRow = Record<string, string | number | null>;

export interface Inspection {
  id: string;
  timestamp: string;
  timestampDate: Date | null;
  assistant: string;
  supervisor: string;
  company: "سنا" | "ركين" | "أخرى";
  companyFull: string;
  siteId: string;
  notes: string;
  overallScore: number;
  missingItems: { name: string; score: number }[];
  checklist: { name: string; score: number | null; raw: string | number | null }[];
  centerNumber: string;   // from sheet column AL ("رقم المركز")
  centerHead: string;     // from sheet column AM ("اسم رئيس المركز")
}

const COL_TIMESTAMP = "طابع زمني";
const COL_ASSISTANT = "المعاون";
const COL_SUPERVISOR_1 = "المراقب";
const COL_SUPERVISOR_2 = "المراقب  2";
const COL_COMPANY = "شركة";
const COL_SITE_1 = "رقم الشاخص";
const COL_SITE_2 = "رقم الشاخص  2";
const COL_NOTES_PREFIX = "ملاحظات المراقب";
const COL_CENTER_NUMBER = "رقم المركز";
const COL_CENTER_HEAD = "اسم رئيس المركز";

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function findHeader(headers: string[], target: string): string | undefined {
  const t = target.replace(/\s+/g, " ").trim();
  return headers.find((h) => h && h.replace(/\s+/g, " ").trim() === t);
}

function findHeaderStartingWith(headers: string[], prefix: string): string | undefined {
  return headers.find((h) => h && h.replace(/\s+/g, " ").trim().startsWith(prefix));
}

function scoreFromValue(colName: string, raw: string | number | null): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (colName.includes("عدد")) {
    const n = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (isNaN(n)) return null;
    return n >= 1 ? 100 : 0;
  }
  if (typeof raw === "number") {
    if (raw <= 1) return Math.round(raw * 100);
    return Math.min(100, Math.round(raw));
  }
  const s = String(raw).trim();
  if (s.endsWith("%")) {
    const n = parseFloat(s.replace("%", ""));
    return isNaN(n) ? null : Math.round(n);
  }
  if (/(نعم|مطابق|مكتمل|تم|يوجد|متوفر|جاهز|صح|100)/.test(s)) return 100;
  if (/(^لا|غير|لم|ناقص|خطأ|^0)/.test(s)) return 0;
  const num = parseFloat(s);
  if (!isNaN(num)) return num <= 1 ? Math.round(num * 100) : Math.min(100, Math.round(num));
  return null;
}

function detectCompany(companyFull: string): "سنا" | "ركين" | "أخرى" {
  if (companyFull.includes("سنا")) return "سنا";
  if (companyFull.includes("ركين")) return "ركين";
  return "أخرى";
}

/**
 * Parse a timestamp string. Google Sheets/Forms often returns dates as
 * "DD/MM/YYYY HH:mm:ss" or "D/M/YYYY H:mm:ss" which `new Date()` will
 * misinterpret (or fail). We try a few formats explicitly.
 */
function parseTimestamp(raw: string): Date | null {
  if (!raw) return null;
  // Normalize Arabic-Indic digits → ASCII digits
  let s = raw.trim().replace(/[\u0660-\u0669]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30)
  );

  // Detect Arabic/English AM/PM markers and strip them before regex parsing.
  // `\b` does not reliably match Arabic letters, so we match them as standalone tokens.
  let meridiem: "am" | "pm" | null = null;
  const meridiemMatch = s.match(/(?:^|\s)(ص|م|AM|PM)(?:\s|$)/i);
  if (meridiemMatch) {
    meridiem = /^(م|PM)$/i.test(meridiemMatch[1]) ? "pm" : "am";
    s = s.replace(/(?:^|\s)(ص|م|AM|PM)(?:\s|$)/gi, " ").replace(/\s+/g, " ").trim();
  }

  const applyPm = (h: number) => {
    if (meridiem === "pm" && h < 12) return h + 12;
    if (meridiem === "am" && h === 12) return 0;
    return h;
  };

  // ISO-like: YYYY-MM-DD or YYYY/MM/DD with optional time
  const iso = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (iso) {
    const [, y, mo, d, h, mi, se] = iso;
    const dt = new Date(+y, +mo - 1, +d, applyPm(+(h ?? 0)), +(mi ?? 0), +(se ?? 0));
    if (!isNaN(dt.getTime())) return dt;
  }

  // Arabic-locale format sometimes places time first: HH:mm:ss YYYY/MM/DD
  const timeFirst = s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (timeFirst) {
    const [, h, mi, se, y, mo, d] = timeFirst;
    const dt = new Date(+y, +mo - 1, +d, applyPm(+h), +mi, +(se ?? 0));
    if (!isNaN(dt.getTime())) return dt;
  }

  // DD/MM/YYYY HH:mm(:ss)? or DD-MM-YYYY ...
  const dmy = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmy) {
    const [, d, mo, y, h, mi, se] = dmy;
    const dt = new Date(+y, +mo - 1, +d, applyPm(+(h ?? 0)), +(mi ?? 0), +(se ?? 0));
    if (!isNaN(dt.getTime())) return dt;
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Parse rows fetched from the live Google Sheet (CSV → object rows).
 */
export function loadInspections(
  headers: string[],
  rows: RawRow[]
): { inspections: Inspection[]; checklistCols: string[] } {
  const colTimestamp = findHeader(headers, COL_TIMESTAMP);
  const colAssistant = findHeader(headers, COL_ASSISTANT);

  // There can be 2 columns named "المراقب" and 2 named "رقم الشاخص" (duplicates from the form).
  // PapaParse will suffix duplicates as "_1", "_2"; we tolerate both styles.
  const supervisorCols = headers.filter((h) =>
    h && h.replace(/\s+/g, " ").trim().startsWith(COL_SUPERVISOR_1)
  );
  const siteCols = headers.filter((h) =>
    h && h.replace(/\s+/g, " ").trim().startsWith(COL_SITE_1)
  );
  const colCompany = findHeader(headers, COL_COMPANY);
  const colNotes = findHeaderStartingWith(headers, COL_NOTES_PREFIX);
  const colCenterNumber = findHeader(headers, COL_CENTER_NUMBER);
  const colCenterHead = findHeader(headers, COL_CENTER_HEAD);

  const reservedCols = new Set<string>(
    [
      colTimestamp,
      colAssistant,
      colCompany,
      colNotes,
      colCenterNumber,
      colCenterHead,
      ...supervisorCols,
      ...siteCols,
    ].filter(Boolean) as string[]
  );
  const checklistCols = headers.filter((h) => h && !reservedCols.has(h));

  const inspections: Inspection[] = rows
    .map((row, idx) => {
      const companyFull = normalize(colCompany ? row[colCompany] : "");
      const company = detectCompany(companyFull);

      // Pick first non-empty supervisor / site from the duplicate columns
      const supervisor =
        supervisorCols
          .map((c) => normalize(row[c]))
          .find((v) => v.length > 0) || "غير مسجل";

      const siteValues = siteCols.map((c) => normalize(row[c]));
      // For ركين the 2nd column is usually filled, for سنا the 1st.
      let siteId = "";
      if (company === "ركين") {
        siteId = siteValues[1] || siteValues[0] || "";
      } else {
        siteId = siteValues[0] || siteValues[1] || "";
      }

      const checklist = checklistCols.map((c) => ({
        name: c,
        score: scoreFromValue(c, row[c] as string | number | null),
        raw: row[c] as string | number | null,
      }));
      const validScores = checklist.filter((c) => c.score !== null) as {
        name: string;
        score: number;
      }[];
      const overall = validScores.length
        ? Math.round(validScores.reduce((s, c) => s + c.score, 0) / validScores.length)
        : 0;
      const missing = validScores
        .filter((c) => c.score < 100)
        .map((c) => ({ name: c.name, score: c.score }));

      const tsRaw = normalize(colTimestamp ? row[colTimestamp] : "");
      const dt = parseTimestamp(tsRaw);

      return {
        id: `${siteId || "غير معرف"}-${idx}`,
        timestamp: tsRaw,
        timestampDate: dt && !isNaN(dt.getTime()) ? dt : null,
        assistant: normalize(colAssistant ? row[colAssistant] : "") || "غير مسجل",
        supervisor,
        company,
        companyFull: companyFull || "غير محدد",
        siteId: siteId || "غير معرف",
        notes: normalize(colNotes ? row[colNotes] : ""),
        overallScore: overall,
        missingItems: missing,
        checklist,
        centerNumber: normalize(colCenterNumber ? row[colCenterNumber] : ""),
        centerHead: normalize(colCenterHead ? row[colCenterHead] : ""),
      } satisfies Inspection;
    })
    // Drop fully-empty rows (no timestamp AND no site)
    .filter((i) => i.timestamp || i.siteId !== "غير معرف");

  inspections.sort((a, b) => {
    const ta = a.timestampDate?.getTime() ?? 0;
    const tb = b.timestampDate?.getTime() ?? 0;
    return tb - ta;
  });

  return { inspections, checklistCols };
}

export interface SiteAggregate {
  siteId: string;
  company: "سنا" | "ركين" | "أخرى";
  companyFull: string;
  supervisor: string;
  inspections: Inspection[];
  firstScore: number;
  latestScore: number;
  improvement: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
  visits: number;
  trend: "تحسن كبير" | "تحسن طفيف" | "ثابت" | "تراجع طفيف" | "تراجع كبير";
  trendIcon: string;
}

export function aggregateBySite(inspections: Inspection[]): SiteAggregate[] {
  const groups = new Map<string, Inspection[]>();
  for (const ins of inspections) {
    if (ins.siteId === "غير معرف") continue;
    const arr = groups.get(ins.siteId) ?? [];
    arr.push(ins);
    groups.set(ins.siteId, arr);
  }
  const result: SiteAggregate[] = [];
  for (const [siteId, arr] of groups) {
    const sorted = [...arr].sort((a, b) => {
      const ta = a.timestampDate?.getTime() ?? 0;
      const tb = b.timestampDate?.getTime() ?? 0;
      return ta - tb;
    });
    const scores = sorted.map((s) => s.overallScore);
    const first = scores[0];
    const latest = scores[scores.length - 1];
    const improvement = latest - first;
    const avg = Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10;
    const latestRow = sorted[sorted.length - 1];

    let trend: SiteAggregate["trend"];
    let trendIcon: string;
    if (improvement > 10) {
      trend = "تحسن كبير";
      trendIcon = "📈";
    } else if (improvement > 0) {
      trend = "تحسن طفيف";
      trendIcon = "🔼";
    } else if (improvement === 0) {
      trend = "ثابت";
      trendIcon = "➖";
    } else if (improvement > -10) {
      trend = "تراجع طفيف";
      trendIcon = "🔽";
    } else {
      trend = "تراجع كبير";
      trendIcon = "📉";
    }

    result.push({
      siteId,
      company: latestRow.company,
      companyFull: latestRow.companyFull,
      supervisor: latestRow.supervisor,
      inspections: sorted,
      firstScore: first,
      latestScore: latest,
      improvement,
      avgScore: avg,
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
      visits: scores.length,
      trend,
      trendIcon,
    });
  }
  result.sort((a, b) => b.latestScore - a.latestScore);
  return result;
}

export function latestPerSite(inspections: Inspection[]): Inspection[] {
  const seen = new Set<string>();
  const out: Inspection[] = [];
  for (const ins of inspections) {
    if (seen.has(ins.siteId)) continue;
    seen.add(ins.siteId);
    out.push(ins);
  }
  return out;
}
