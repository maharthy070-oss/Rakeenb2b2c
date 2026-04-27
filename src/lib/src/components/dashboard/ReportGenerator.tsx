import { useEffect, useRef, useState } from "react";
import { Inspection, latestPerSite } from "@/lib/inspections";
import { getSiteMeta } from "@/lib/siteMetadata";

import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";
import rakeenLogo from "@/assets/rakeen-logo.webp";
import sanaLogo from "@/assets/sana-logo.png";

interface Props {
  inspections: Inspection[];
  companyFilter?: "ركين" | "سنا";
  trigger?: React.ReactNode;
  autoOpen?: boolean;
  onDone?: () => void;
}

export function ReportGenerator({ inspections, companyFilter, trigger, autoOpen, onDone }: Props) {
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const sites = latestPerSite(inspections).filter(
    (s) =>
      s.siteId &&
      s.siteId !== "غير معرف" &&
      (!companyFilter || s.company === companyFilter)
  );

  async function handleGenerate() {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const cards = Array.from(
        reportRef.current.querySelectorAll<HTMLElement>("[data-report-card]")
      );

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;

      for (let i = 0; i < cards.length; i++) {
        const canvas = await html2canvas(cards[i], {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
        });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        const imgW = pageW - margin * 2;
        const imgH = (canvas.height * imgW) / canvas.width;
        const finalH = Math.min(imgH, pageH - margin * 2);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", margin, margin, imgW, finalH);
      }

      const suffix = companyFilter ? `-${companyFilter}` : "";
      pdf.save(`تقرير-جاهزية-المخيمات${suffix}-${new Date().toLocaleDateString("ar-SA")}.pdf`);
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
    if (autoOpen && !generating && sites.length > 0) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  return (
    <>
      {trigger !== undefined ? (
        trigger
      ) : (
        <Button
          onClick={handleGenerate}
          disabled={generating || sites.length === 0}
          className="gap-2"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          {generating ? "جاري الإنشاء…" : "تحميل التقرير PDF"}
        </Button>
      )}

      {/* Off-screen render target for PDF capture */}
      <div
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "794px", // ~A4 width @96dpi
          background: "#fff",
        }}
        aria-hidden
      >
        <div ref={reportRef}>
          {sites.map((site) => (
            <ReportCard key={site.id} site={site} />
          ))}
        </div>
      </div>
    </>
  );
}

function ReportCard({ site }: { site: Inspection }) {
  const meta = getSiteMeta(site.siteId);
  const completed = site.overallScore;
  const remaining = 100 - completed;
  const companyLabel =
    site.company === "ركين"
      ? "ركين (مشارق المتميزة)"
      : site.company === "سنا"
      ? "سنا"
      : site.companyFull;
  const postedDateTime = site.timestampDate
    ? site.timestampDate.toLocaleString("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : site.timestamp || "—";
  const challenges =
    site.notes?.trim() ||
    site.missingItems
      .slice(0, 3)
      .map((m) => m.name)
      .join(" + ") ||
    "لا توجد تحديات";

  return (
    <div
      data-report-card
      dir="rtl"
      style={{
        width: "794px",
        minHeight: "1100px",
        padding: "40px",
        fontFamily: "'Cairo','Tajawal',Arial,sans-serif",
        background: "#fff",
        color: "#1a1a1a",
        boxSizing: "border-box",
      }}
    >
      {/* Header bar — show only the logo of the company that owns this site */}
      <div
        style={{
          background: "linear-gradient(90deg,#7a3a1f,#a85a2e)",
          color: "#fff",
          padding: "16px 24px",
          borderRadius: "8px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <img
          src={site.company === "ركين" ? rakeenLogo : sanaLogo}
          alt={site.company === "ركين" ? "Rakeen" : "Sana"}
          crossOrigin="anonymous"
          style={{
            height: "56px",
            width: "auto",
            background: "#fff",
            padding: "6px 10px",
            borderRadius: "6px",
          }}
        />
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: "22px", fontWeight: 800 }}>
            شركة مشارق الذهبية المتميزة — موسم عام 1447
          </div>
          <div style={{ fontSize: "16px", marginTop: "4px", opacity: 0.95 }}>
            التقرير التنظيمي لقطاع المشاعر
          </div>
        </div>
        {/* spacer to keep the title centered */}
        <div style={{ width: "92px" }} />
      </div>

      {/* Site title */}
      <div
        style={{
          background: "#f1e6da",
          padding: "12px 20px",
          borderRight: "6px solid #a85a2e",
          marginBottom: "16px",
          fontSize: "20px",
          fontWeight: 700,
        }}
      >
        الشاخص: <span style={{ color: "#7a3a1f" }}>{site.siteId}</span>
      </div>

      {/* Info table: contractor / company / supervisor / posted at */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
          marginBottom: "20px",
        }}
      >
        <tbody>
          {[
            ["اسم المتعهد", meta.contractor],
            ["الشركة", companyLabel],
            ["المراقب", site.supervisor],
            ["تاريخ ووقت الإدخال", postedDateTime],
          ].map(([label, value]) => (
            <tr key={label}>
              <td
                style={{
                  background: "#f1e6da",
                  border: "1px solid #d9c7b3",
                  padding: "10px 14px",
                  fontWeight: 700,
                  width: "30%",
                  textAlign: "right",
                  color: "#7a3a1f",
                }}
              >
                {label}
              </td>
              <td
                style={{
                  border: "1px solid #d9c7b3",
                  padding: "10px 14px",
                  textAlign: "right",
                }}
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>


      {/* Readiness section */}
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
        نسبة جاهزية الخيم
      </div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr style={{ background: "#7a3a1f", color: "#fff" }}>
            <th style={{ border: "1px solid #7a3a1f", padding: "10px" }}>التحديات</th>
            <th style={{ border: "1px solid #7a3a1f", padding: "10px", width: "15%" }}>
              مكتمل
            </th>
            <th style={{ border: "1px solid #7a3a1f", padding: "10px", width: "15%" }}>
              متبقي
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #d9c7b3", padding: "12px", textAlign: "right" }}>
              {challenges}
            </td>
            <td
              style={{
                border: "1px solid #d9c7b3",
                padding: "12px",
                textAlign: "center",
                background: "#e8f5e9",
                fontWeight: 700,
                color: "#1b5e20",
              }}
            >
              {completed}%
            </td>
            <td
              style={{
                border: "1px solid #d9c7b3",
                padding: "12px",
                textAlign: "center",
                background: "#ffebee",
                fontWeight: 700,
                color: "#b71c1c",
              }}
            >
              {remaining}%
            </td>
          </tr>
        </tbody>
      </table>

      {/* Missing items detail */}
      {site.missingItems.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
            ⚠️ النواقص التفصيلية ({site.missingItems.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {site.missingItems.slice(0, 12).map((m, i) => (
              <div
                key={i}
                style={{
                  background: "#fff3e0",
                  borderRight: "4px solid #e65100",
                  padding: "8px 12px",
                  fontSize: "13px",
                  borderRadius: "4px",
                }}
              >
                {m.name} — <strong style={{ color: "#b71c1c" }}>{m.score}%</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: "30px",
          paddingTop: "12px",
          borderTop: "2px solid #a85a2e",
          textAlign: "center",
          fontSize: "12px",
          color: "#666",
        }}
      >
        تاريخ ووقت الإدخال: {postedDateTime} · قطاع المشاعر
      </div>
    </div>
  );
}
