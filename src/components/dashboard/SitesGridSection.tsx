import { useMemo, useState } from "react";
import { Inspection } from "@/lib/inspections";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  latest: Inspection[];
  all: Inspection[];
}

function scoreColor(score: number) {
  if (score >= 90) return "text-[hsl(var(--success))] border-[hsl(var(--success))]";
  if (score >= 70) return "text-primary border-primary";
  if (score >= 50) return "text-[hsl(var(--warning))] border-[hsl(var(--warning))]";
  return "text-destructive border-destructive";
}

function ringBg(score: number) {
  if (score >= 90) return "var(--gradient-success)";
  if (score >= 70) return "var(--gradient-info)";
  if (score >= 50) return "var(--gradient-warning)";
  return "var(--gradient-danger)";
}

export function SitesGridSection({ latest, all }: Props) {
  const [openSite, setOpenSite] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "سنا" | "ركين">("all");

  const filtered = useMemo(() => {
    const list = filter === "all" ? latest : latest.filter((l) => l.company === filter);
    return [...list].sort((a, b) => {
      if (a.company !== b.company) return a.company.localeCompare(b.company);
      return a.siteId.localeCompare(b.siteId);
    });
  }, [latest, filter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h2 className="text-xl font-bold">🏕️ خريطة جاهزية المواقع</h2>
        <div className="flex gap-2">
          {(["all", "سنا", "ركين"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm border transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-glow)]"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {f === "all" ? "الكل" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filtered.map((site) => {
          const icon = site.company === "سنا" ? "🔴" : site.company === "ركين" ? "🟤" : "⚪";
          return (
            <button
              key={site.id}
              onClick={() => setOpenSite(site.siteId)}
              className="group rounded-2xl bg-card border border-border p-4 text-right hover:border-primary hover:scale-[1.03] transition-all shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg">{icon}</span>
                <div
                  className={cn(
                    "w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm",
                    scoreColor(site.overallScore)
                  )}
                  style={{ background: ringBg(site.overallScore), color: "white", borderColor: "white" }}
                >
                  {site.overallScore}%
                </div>
              </div>
              <div className="font-bold text-sm truncate" title={site.siteId}>
                {site.siteId}
              </div>
              <div className="text-xs text-muted-foreground truncate mt-1">{site.companyFull}</div>
            </button>
          );
        })}
      </div>

      <SiteDetailsDialog
        siteId={openSite}
        onClose={() => setOpenSite(null)}
        all={all}
      />
    </div>
  );
}

function SiteDetailsDialog({
  siteId,
  onClose,
  all,
}: {
  siteId: string | null;
  onClose: () => void;
  all: Inspection[];
}) {
  const history = useMemo(
    () => {
      if (!siteId) return [];
      const list = all.filter((a) => a.siteId === siteId);
      // Newest first. Fall back to original order if timestamps are missing.
      return list.sort((a, b) => {
        const ta = a.timestampDate?.getTime() ?? 0;
        const tb = b.timestampDate?.getTime() ?? 0;
        return tb - ta;
      });
    },
    [siteId, all]
  );
  const [selectedTs, setSelectedTs] = useState<string | null>(null);

  const current = useMemo(() => {
    if (history.length === 0) return null;
    if (selectedTs) {
      return history.find((h) => h.timestamp === selectedTs) ?? history[0];
    }
    return history[0];
  }, [history, selectedTs]);

  return (
    <Dialog open={!!siteId} onOpenChange={(o) => !o && (onClose(), setSelectedTs(null))}>
      <DialogContent className="max-w-2xl bg-card border-border" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-xl">
            🏕️ تفاصيل الموقع: <span className="text-primary">{siteId}</span>
          </DialogTitle>
        </DialogHeader>

        {current && (
          <div className="space-y-4">
            {history.length > 1 && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  🕒 عرض تقرير بتاريخ:
                </label>
                <Select
                  value={current.timestamp}
                  onValueChange={(v) => setSelectedTs(v)}
                  dir="rtl"
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {history.map((h) => (
                      <SelectItem key={h.timestamp} value={h.timestamp}>
                        {h.timestamp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="rounded-2xl bg-secondary/50 p-5 border-r-4 border-[hsl(var(--warning))] relative">
              <div
                className="absolute left-5 top-5 w-20 h-20 rounded-full border-4 flex items-center justify-center font-extrabold text-xl"
                style={{
                  background: ringBg(current.overallScore),
                  borderColor: "white",
                  color: "white",
                }}
              >
                {current.overallScore}%
              </div>
              <div className="space-y-2 pl-24">
                <div>
                  <span className="text-muted-foreground text-sm">المعاون: </span>
                  <span className="font-bold">{current.assistant}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">المراقب: </span>
                  <span className="font-bold">{current.supervisor}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">الشركة: </span>
                  <span className="font-bold">{current.companyFull}</span>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <div className="text-muted-foreground text-sm mb-1">📝 ملاحظات المراقب:</div>
                  <div className="text-sm">
                    {current.notes && current.notes.trim() !== ""
                      ? current.notes
                      : "لا توجد ملاحظات."}
                  </div>
                </div>
              </div>
            </div>

            {current.missingItems.length > 0 && (
              <div>
                <h3 className="font-bold mb-2 text-destructive">
                  ⚠️ النواقص ({current.missingItems.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {current.missingItems.map((m, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-3 bg-destructive/10 border-r-4 border-destructive text-sm text-right"
                    >
                      ❌ {m.name} <span className="text-destructive font-bold">({m.score}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
