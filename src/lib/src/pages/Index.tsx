import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { aggregateBySite, latestPerSite } from "@/lib/inspections";
import { OverviewSection } from "@/components/dashboard/OverviewSection";
import { SitesGridSection } from "@/components/dashboard/SitesGridSection";
import { SitesPerformanceSection } from "@/components/dashboard/SitesPerformanceSection";
import {
  useInspections,
  useFormattedLastUpdated,
  POLL_INTERVAL_MS,
} from "@/hooks/useInspections";
import { Loader2, RefreshCw, AlertCircle, FileDown, ChevronDown } from "lucide-react";
import { ReportGenerator } from "@/components/dashboard/ReportGenerator";
import { SummaryReportGenerator } from "@/components/dashboard/SummaryReportGenerator";
import { ChatBot } from "@/components/dashboard/ChatBot";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type ReportKey =
  | "site-rakeen"
  | "site-sana"
  | "summary-rakeen"
  | "summary-sana"
  | null;

const Index = () => {
  const { inspections, loading, error, lastUpdated } = useInspections();
  const latest = useMemo(() => latestPerSite(inspections), [inspections]);
  const aggregates = useMemo(() => aggregateBySite(inspections), [inspections]);
  const [tab, setTab] = useState("overview");
  const lastUpdatedStr = useFormattedLastUpdated(lastUpdated);
  const [activeReport, setActiveReport] = useState<ReportKey>(null);

  const isBusy = activeReport !== null;
  const handleDone = () => setActiveReport(null);

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-l from-primary to-primary-glow bg-clip-text text-transparent">
              لوحة جاهزيه قطاع المشاعر B2b2C لمخيمات عرفة عام 1447
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              متابعة مباشرة من Google Sheets — تحديث كل {POLL_INTERVAL_MS / 1000} ثانية
            </p>
          </div>
          <div className="flex items-center gap-4 md:gap-6 text-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isBusy} className="gap-2">
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  {isBusy ? "جاري الإنشاء…" : "التقارير"}
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>تقرير جاهزية المخيمات</DropdownMenuLabel>
                <DropdownMenuItem disabled={isBusy} onSelect={() => setActiveReport("site-rakeen")}>
                  📄 ركين (مشارق المتميزة)
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isBusy} onSelect={() => setActiveReport("site-sana")}>
                  📄 سنا
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>تقرير الاستعداد المسبق</DropdownMenuLabel>
                <DropdownMenuItem disabled={isBusy} onSelect={() => setActiveReport("summary-rakeen")}>
                  📋 ركين (مشارق المتميزة)
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isBusy} onSelect={() => setActiveReport("summary-sana")}>
                  📋 سنا
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ReportGenerator
              inspections={inspections}
              companyFilter="ركين"
              autoOpen={activeReport === "site-rakeen"}
              onDone={handleDone}
              trigger={null}
            />
            <ReportGenerator
              inspections={inspections}
              companyFilter="سنا"
              autoOpen={activeReport === "site-sana"}
              onDone={handleDone}
              trigger={null}
            />
            <SummaryReportGenerator
              inspections={inspections}
              companyFilter="ركين"
              autoOpen={activeReport === "summary-rakeen"}
              onDone={handleDone}
              trigger={null}
            />
            <SummaryReportGenerator
              inspections={inspections}
              companyFilter="سنا"
              autoOpen={activeReport === "summary-sana"}
              onDone={handleDone}
              trigger={null}
            />
            <div className="text-left">
              <div className="text-xs text-muted-foreground">إجمالي المواقع</div>
              <div className="text-xl font-bold text-primary">{latest.length}</div>
            </div>
            <div className="text-left">
              <div className="text-xs text-muted-foreground">عدد التقارير</div>
              <div className="text-xl font-bold">{inspections.length}</div>
            </div>
            <div className="text-left flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60 border border-border">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : error ? (
                <AlertCircle className="w-4 h-4 text-destructive" />
              ) : (
                <RefreshCw className="w-4 h-4 text-success" />
              )}
              <div className="leading-tight">
                <div className="text-[10px] text-muted-foreground">آخر تحديث</div>
                <div className="text-xs font-bold tabular-nums">{lastUpdatedStr}</div>
              </div>
            </div>
          </div>
        </div>
        {error && (
          <div className="container mx-auto px-4 pb-3">
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs px-3 py-2 text-right">
              تعذّر تحديث البيانات: {error}. سنحاول مجدداً تلقائياً.
            </div>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading && inspections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            جاري تحميل البيانات من Google Sheets…
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} dir="rtl">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-6 bg-card border border-border">
              <TabsTrigger value="overview">📊 التحليل العام</TabsTrigger>
              <TabsTrigger value="sites">🏕️ خريطة المواقع</TabsTrigger>
              <TabsTrigger value="performance">🏗️ أداء المواقع</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <OverviewSection latest={latest} all={inspections} />
            </TabsContent>
            <TabsContent value="sites" className="mt-0">
              <SitesGridSection latest={latest} all={inspections} />
            </TabsContent>
            <TabsContent value="performance" className="mt-0">
              <SitesPerformanceSection aggregates={aggregates} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="border-t border-border mt-10 py-4 text-center text-xs text-muted-foreground">
        لوحة قطاع المشاعر · بيانات حية من Google Sheets
      </footer>

      <ChatBot inspections={inspections} />
    </div>
  );
};

export default Index;
