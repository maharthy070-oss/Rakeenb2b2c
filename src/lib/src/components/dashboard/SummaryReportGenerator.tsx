import { useEffect, useRef, useState } from "react";
import { Inspection, latestPerSite } from "@/lib/inspections";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import rakeenLogo from "@/assets/rakeen-logo.webp";
import sanaLogo from "@/assets/sana-logo.png";
import { getSiteMeta } from "@/lib/siteMetadata";

interface Props {
  inspections: Inspection[];
  companyFilter?: "ركين" | "سنا";
  trigger?: React.ReactNode;
  autoOpen?: boolean;
  onDone?: () => void;
}

type Company = "سنا" | "ركين";

/**
 * Group an inspection's missing items / notes into the labeled categories
 * the Sana-style report uses (البداد، أعمال الجبس، أرضية الموقع، …).
 *
 * We do this heuristically by matching keywords in the checklist column
 * names. Unmatched items fall under "أخرى".
 */
const CATEGORY_KEYWORDS: { key: string; words: string[] }[] = [
  { key: "البداد", words: ["خيم", "بداد", "هيكل", "سقف", "اسقف"] },
  { key: "أعمال الجبس", words: ["جبس", "دهان", "مدخل"] },
  { key: "أرضية الموقع", words: ["أرضي", "ارضي", "تمهيد", "ممهد", "ممرات", "حفر", "تنظيف", "اتربة"] },
  { key: "دورات المياه", words: ["دورات", "حمام", "مياه", "اكسسوار"] },
  { key: "المكيفات", words: ["مكيف", "تبريد"] },
  { key: "الكهرباء", words: ["كهرب", "إنار", "انار"] },
  { key: "البكجات", words: ["بكج", "package"] },
  { key: "المطبخ", words: ["مطبخ"] },
  { key: "أغراض الكرار", words: ["كرار", "أغراض", "اغراض", "توريد"] },
  { key: "الكاميرات", words: ["كامير"] },
  { key: "فرش الموكيت", words: ["موكيت", "فرش", "سجاد"] },
];

function categorize(name: string): string {
  for (const c of CATEGORY_KEYWORDS) {
    if (c.words.some((w) => name.includes(w))) return c.key;
  }
  return "أخرى";
}

interface CategorySummary {
  category: string;
  status: string; // human readable summary
  ok: boolean;
}

function summarizeSite(site: Inspection): CategorySummary[] {
  const groups = new Map<string, { ok: number; bad: number; items: { name: string; score: number | null }[] }>();
  for (const item of site.checklist) {
    const cat = categorize(item.name);
    const g = groups.get(cat) ?? { ok: 0, bad: 0, items: [] };
    g.items.push({ name: item.name, score: item.score });
    if (item.score === null) {
      // skip
    } else if (item.score >= 100) g.ok += 1;
    else g.bad += 1;
    groups.set(cat, g);
  }
  const result: CategorySummary[] = [];
  // Stable order following the report
  const order = [
    "البداد",
    "أعمال الجبس",
    "أرضية الموقع",
    "دورات المياه",
    "المكيفات",
    "الكهرباء",
    "البكجات",
    "المطبخ",
    "فرش الموكيت",
    "أغراض الكرار",
    "الكاميرات",
    "أخرى",
  ];
  for (const cat of order) {
    const g = groups.get(cat);
    if (!g || g.items.length === 0) continue;
    const total = g.ok + g.bad;
    if (total === 0) continue;
    const ok = g.bad === 0;
    let status: string;
    if (ok) status = "مكتمل";
    else if (g.ok === 0) status = "غير منجز";
    else status = `منجز جزئياً (${g.ok}/${total})`;
    result.push({ category: cat, status, ok });
  }
  return result;
}

function readinessColor(score: number) {
  if (score >= 90) return { bg: "#e8f5e9", text: "#1b5e20" };
  if (score >= 70) return { bg: "#e3f2fd", text: "#0d47a1" };
  if (score >= 50) return { bg: "#fff8e1", text: "#7a4f01" };
  return { bg: "#ffebee", text: "#b71c1c" };
}

export function SummaryReportGenerator({ inspections, companyFilter, trigger, autoOpen, onDone }: Props) {
  const [generating, setGenerating] = useState(false);
  const sanaRef = useRef<HTMLDivElement>(null);
  const rakeenRef = useRef<HTMLDivElement>(null);

  const sites = latestPerSite(inspections).filter(
    (s) => s.siteId && s.siteId !== "غير معرف"
  );
  const sanaSites = !companyFilter || companyFilter === "سنا"
    ? sites.filter((s) => s.company === "سنا")
    : [];
  const rakeenSites = !companyFilter || companyFilter === "ركين"
    ? sites.filter((s) => s.company === "ركين")
    : [];

  // Build per-site latest non-empty centerNumber / centerHead from the sheet
  // (columns AL = "رقم المركز", AM = "اسم رئيس المركز"). Inspections are
  // already sorted newest-first, so we walk and take the first non-empty one.
  const sheetCenterInfo = (() => {
    const numbers = new Map<string, string>();
    const heads = new Map<string, string>();
    for (const ins of inspections) {
      if (!ins.siteId || ins.siteId === "غير معرف") continue;
      if (!numbers.has(ins.siteId) && ins.centerNumber.trim()) {
        numbers.set(ins.siteId, ins.centerNumber.trim());
      }
      if (!heads.has(ins.siteId) && ins.centerHead.trim()) {
        heads.set(ins.siteId, ins.centerHead.trim());
      }
    }
    return { numbers, heads };
  })();

  function getCenterNumber(siteId: string): string {
    const fromSheet = sheetCenterInfo.numbers.get(siteId);
    if (fromSheet) return fromSheet;
    const meta = getSiteMeta(siteId);
    return meta.centerNumber && meta.centerNumber !== "—" ? meta.centerNumber : "";
  }

  function getCenterHead(siteId: string): string {
    const fromSheet = sheetCenterInfo.heads.get(siteId);
    if (fromSheet) return fromSheet;
    const meta = getSiteMeta(siteId);
    return meta.centerHead && meta.centerHead !== "—" ? meta.centerHead : "";
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      let firstPage = true;

      const refs: { ref: React.RefObject<HTMLDivElement | null>; sites: Inspection[] }[] = [
        { ref: sanaRef, sites: sanaSites },
        { ref: rakeenRef, sites: rakeenSites },
      ];

      for (const { ref, sites: list } of refs) {
        if (list.length === 0 || !ref.current) continue;

        const root = ref.current;
        const canvas = await html2canvas(root, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          allowTaint: true,
          logging: false,
        });

        const imgW = pageW - margin * 2;
        const pxPerMm = canvas.width / imgW;
        const pageContentMm = pageH - margin * 2;
        const pageSlicePx = Math.floor(pageContentMm * pxPerMm);

        // Build a list of "atomic" elements (rows we must NOT split across pages)
        // along with their pixel offsets within the captured canvas.
        const rootRect = root.getBoundingClientRect();
        const scaleY = canvas.height / rootRect.height;
        const atomicEls = Array.from(
          root.querySelectorAll<HTMLElement>("[data-pdf-atomic='1']")
        );
        type Block = { topPx: number; bottomPx: number };
        const blocks: Block[] = atomicEls
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              topPx: Math.max(0, Math.floor((r.top - rootRect.top) * scaleY)),
              bottomPx: Math.min(
                canvas.height,
                Math.ceil((r.bottom - rootRect.top) * scaleY)
              ),
            };
          })
          .sort((a, b) => a.topPx - b.topPx);

        // Determine page break positions: start at 0; each page extends as far
        // as it can without splitting any block.
        const breaks: number[] = [0];
        let cursor = 0;
        while (cursor < canvas.height) {
          const target = Math.min(cursor + pageSlicePx, canvas.height);
          if (target >= canvas.height) {
            breaks.push(canvas.height);
            break;
          }
          // Find a block straddling `target`; if found, break just before it.
          let safeEnd = target;
          for (const b of blocks) {
            if (b.topPx >= target) break;
            if (b.bottomPx > target && b.topPx > cursor) {
              safeEnd = b.topPx;
              break;
            }
          }
          // If we couldn't find any safe spot (a single block taller than a
          // page), fall back to the original target so we don't infinite-loop.
          if (safeEnd <= cursor) safeEnd = target;
          breaks.push(safeEnd);
          cursor = safeEnd;
        }

        for (let i = 0; i < breaks.length - 1; i++) {
          const yPx = breaks[i];
          const endY = breaks[i + 1];
          const sliceH = endY - yPx;
          if (sliceH <= 0) continue;
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, yPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceImg = sliceCanvas.toDataURL("image/jpeg", 0.92);
          const sliceMm = sliceH / pxPerMm;
          if (!firstPage) pdf.addPage();
          firstPage = false;
          pdf.addImage(sliceImg, "JPEG", margin, margin, imgW, sliceMm);
        }
      }

      const suffix = companyFilter ? `-${companyFilter}` : "";
      pdf.save(`تقرير-الاستعداد-المسبق${suffix}-${new Date().toLocaleDateString("ar-SA")}.pdf`);
    } catch (e) {
      console.error(e);
      alert("تعذّر إنشاء التقرير. حاول مجدداً.");
    } finally {
      setGenerating(false);
      onDone?.();
    }
  }

  // Allow parent (dropdown) to trigger generation programmatically.
  useEffect(() => {
    if (autoOpen && !generating && (sanaSites.length > 0 || rakeenSites.length > 0)) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  return (
    <>
      {trigger !== undefined ? (
        trigger
      ) : (
        <div className="flex items-center gap-1">
          <Button
            onClick={handleGenerate}
            disabled={generating || sites.length === 0}
            variant="secondary"
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {generating ? "جاري الإنشاء…" : "تقرير الاستعداد المسبق"}
          </Button>
        </div>
      )}

      {/* Off-screen render targets */}
      <div
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "794px",
          background: "#fff",
        }}
        aria-hidden
      >
        <div ref={sanaRef}>
          {sanaSites.length > 0 && (
            <SummaryPage
              company="سنا"
              logo={sanaLogo}
              sites={sanaSites}
              getCenterNumber={getCenterNumber}
              getCenterHead={getCenterHead}
            />
          )}
        </div>
        <div ref={rakeenRef}>
          {rakeenSites.length > 0 && (
            <SummaryPage
              company="ركين"
              logo={rakeenLogo}
              sites={rakeenSites}
              getCenterNumber={getCenterNumber}
              getCenterHead={getCenterHead}
            />
          )}
        </div>
      </div>
    </>
  );
}

function SummaryPage({
  company,
  logo,
  sites,
  getCenterNumber,
  getCenterHead,
}: {
  company: Company;
  logo: string;
  sites: Inspection[];
  getCenterNumber: (siteId: string) => string;
  getCenterHead: (siteId: string) => string;
}) {
  // Group sites by nationality (prefer hardcoded site metadata, then text heuristic)
  const groups = new Map<string, Inspection[]>();
  for (const s of sites) {
    const meta = getSiteMeta(s.siteId);
    const nationality =
      (meta.nationality && meta.nationality !== "—" ? meta.nationality : null) ||
      extractNationality(s.companyFull) ||
      extractNationality(s.notes) ||
      "مواقع";
    const arr = groups.get(nationality) ?? [];
    arr.push(s);
    groups.set(nationality, arr);
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString("ar-SA-u-ca-islamic", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  const headerColor = company === "ركين" ? "#7a3a1f" : "#b1132b";
  const headerBg = company === "ركين" ? "#f1e6da" : "#fdecef";

  return (
    <div
      dir="rtl"
      style={{
        width: "794px",
        padding: "32px 36px",
        fontFamily: "'Cairo','Tajawal',Arial,sans-serif",
        background: "#fff",
        color: "#1a1a1a",
        boxSizing: "border-box",
      }}
    >
      {/* Top: logo on the right (RTL) + centered title + spacer on the left */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <img
          src={logo}
          alt={company}
          crossOrigin="anonymous"
          style={{ height: "70px", width: "auto" }}
        />
        <div style={{ textAlign: "center", flex: 1, padding: "0 16px" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#222" }}>
            تقرير الاستعداد المسبق لمواقع (عرفات)
          </div>
          <div style={{ fontSize: "13px", color: "#555", marginTop: "6px" }}>
            التاريخ: {dateStr}
          </div>
        </div>
        <div style={{ width: "120px" }} />
      </div>

      {Array.from(groups.entries()).map(([nationality, list]) => (
        <div key={nationality} style={{ marginBottom: "18px" }}>
          <div
            style={{
          fontSize: "15px",
              fontWeight: 700,
              marginBottom: "8px",
              color: headerColor,
            }}
          >
            {nationality === "مواقع" ? "المواقع :-" : `مواقع ${nationality} :-`}
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "48%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: headerBg, color: headerColor }} data-pdf-atomic="1">
                <Th>رقم الشاخص</Th>
                <Th>رقم المركز</Th>
                <Th>رئيس المركز</Th>
                <Th>مستوى الجاهزية</Th>
                <Th>ملاحظات الموقع</Th>
                <Th>صورة رقم</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((site) => {
                const summary = summarizeSite(site);
                const rc = readinessColor(site.overallScore);
                const meta = getSiteMeta(site.siteId);
                const centerNo = getCenterNumber(site.siteId);
                return (
                  <tr key={site.id} data-pdf-atomic="1">
                    <Td>
                      <div style={{ fontWeight: 700 }}>{site.siteId}</div>
                      <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
                        {nationality}
                      </div>
                    </Td>
                    <Td center>
                      <span style={{ fontWeight: 700 }}>{centerNo || "—"}</span>
                    </Td>
                    <Td>{getCenterHead(site.siteId) || "—"}</Td>
                    <Td center>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          background: rc.bg,
                          color: rc.text,
                          fontWeight: 800,
                        }}
                      >
                        %{site.overallScore}
                      </span>
                    </Td>
                    <Td>
                      {summary.length === 0 ? (
                        <span style={{ color: "#666" }}>لا توجد بيانات تفصيلية</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {summary.map((s, i) => (
                            <div key={i} style={{ lineHeight: 1.55 }}>
                              <strong style={{ color: headerColor }}>{s.category}:</strong>{" "}
                              <span style={{ color: s.ok ? "#1b5e20" : "#b71c1c" }}>
                                {s.status}
                              </span>
                            </div>
                          ))}
                          {site.notes && site.notes.trim() !== "" && (
                            <div
                              style={{
                                marginTop: "4px",
                                paddingTop: "4px",
                                borderTop: "1px dashed #ddd",
                                color: "#444",
                              }}
                            >
                              <strong>ملاحظات المراقب:</strong> {site.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </Td>
                    <Td center>—</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div
        style={{
          marginTop: "24px",
          paddingTop: "10px",
          borderTop: `2px solid ${headerColor}`,
          textAlign: "center",
          fontSize: "11px",
          color: "#666",
        }}
      >
        شركة {company === "ركين" ? "ركين (مشارق المتميزة)" : "سنا"} · قطاع المشاعر · موسم 1447هـ
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        border: "1px solid #d9c7b3",
        padding: "8px 6px",
        fontWeight: 700,
        textAlign: "center",
        fontSize: "12px",
        whiteSpace: "normal",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <td
      style={{
        border: "1px solid #d9c7b3",
        padding: "8px 8px",
        verticalAlign: "top",
        textAlign: center ? "center" : "right",
        whiteSpace: "normal",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        lineHeight: 1.55,
      }}
    >
      {children}
    </td>
  );
}

/**
 * Try to extract a nationality keyword (e.g. "الهند", "باكستان", "بنجلاديش",
 * "نيجيريا") from a free-text field. Returns null if none found.
 */
function extractNationality(text: string): string | null {
  if (!text) return null;
  const KEYWORDS = [
    "الهند",
    "باكستان",
    "بنجلاديش",
    "بنغلاديش",
    "نيجيريا",
    "إندونيسيا",
    "اندونيسيا",
    "ماليزيا",
    "تركيا",
    "إيران",
    "ايران",
    "مصر",
    "اليمن",
    "السودان",
    "أفريقيا",
    "افريقيا",
  ];
  for (const k of KEYWORDS) {
    if (text.includes(k)) return k;
  }
  return null;
}
