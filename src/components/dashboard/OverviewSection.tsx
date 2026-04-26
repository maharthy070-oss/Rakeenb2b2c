import { Inspection } from "@/lib/inspections";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  latest: Inspection[];
  all: Inspection[];
}

const COMPANY_COLORS: Record<string, string> = {
  سنا: "hsl(var(--sana))",
  ركين: "hsl(var(--rakeen))",
  أخرى: "hsl(var(--muted-foreground))",
};

const COMPANY_ICONS: Record<string, string> = {
  سنا: "🔴",
  ركين: "🟤",
  أخرى: "⚪",
};

export function OverviewSection({ latest, all }: Props) {
  const companies: Array<"سنا" | "ركين"> = ["سنا", "ركين"];

  // Global KPIs
  const overallAvg =
    latest.length > 0
      ? Math.round(latest.reduce((s, x) => s + x.overallScore, 0) / latest.length)
      : 0;
  const excellent = latest.filter((x) => x.overallScore >= 90).length;
  const needsAttention = latest.filter((x) => x.overallScore < 60).length;

  return (
    <div className="space-y-6">
      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="متوسط الجاهزية" value={`${overallAvg}%`} accent="primary" />
        <KpiCard label="مواقع متميزة (≥90%)" value={`${excellent}`} accent="success" />
        <KpiCard label="مواقع تحتاج متابعة (<60%)" value={`${needsAttention}`} accent="danger" />
        <KpiCard label="إجمالي التقارير" value={`${all.length}`} accent="info" />
      </div>

      {/* Per company sections */}
      {companies.map((company) => {
        const subset = latest.filter((x) => x.company === company);
        if (subset.length === 0) return null;
        const avg = Math.round(subset.reduce((s, x) => s + x.overallScore, 0) / subset.length);
        return (
          <section
            key={company}
            className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>{COMPANY_ICONS[company]}</span>
                <span>شركة {company}</span>
              </h2>
              <div className="text-sm text-muted-foreground">
                عدد المواقع: <span className="text-foreground font-bold">{subset.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-stretch">
              <div className="metric-card flex flex-col justify-center">
                <div className="text-xs text-muted-foreground">متوسط الإنجاز</div>
                <div className="text-4xl font-extrabold text-primary mt-1">{avg}%</div>
                <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${avg}%`,
                      background: COMPANY_COLORS[company],
                    }}
                  />
                </div>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subset.map((s) => ({
                      site: s.siteId,
                      score: s.overallScore,
                    }))}
                    margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="site"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      reversed
                    />
                    <YAxis
                      orientation="right"
                      domain={[0, 100]}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        color: "var(--primary)",
                      }}
                      labelStyle={{ color: "var(--primary)" }}
                      itemStyle={{ color: "var(--primary)" }}
                      formatter={(v: any) => [`${v}%`, "الإنجاز"]}
                    />
                    <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                      {subset.map((s, i) => (
                        <Cell
                          key={i}
                          fill={COMPANY_COLORS[company]}
                          opacity={0.6 + (s.overallScore / 100) * 0.4}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        );
      })}

      {/* Combined comparison */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-xl font-bold mb-4">مقارنة جميع المواقع</h2>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={latest.map((s) => ({
                site: s.siteId,
                score: s.overallScore,
                company: s.company,
              }))}
              margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="site"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                reversed
              />
              <YAxis
                orientation="right"
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "var(--primary)",
                }}
                labelStyle={{ color: "var(--primary)" }}
                itemStyle={{ color: "var(--primary)" }}
                formatter={(v: any) => [`${v}%`, "الإنجاز"]}
              />
              <Legend />
              <Bar dataKey="score" name="نسبة الجاهزية" radius={[8, 8, 0, 0]}>
                {latest.map((s, i) => (
                  <Cell key={i} fill={COMPANY_COLORS[s.company]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "primary" | "success" | "danger" | "info";
}) {
  const colorMap: Record<string, string> = {
    primary: "text-primary",
    success: "text-[hsl(var(--success))]",
    danger: "text-destructive",
    info: "text-[hsl(var(--info))]",
  };
  return (
    <div className="metric-card">
      <div className={`text-3xl md:text-4xl font-extrabold ${colorMap[accent]}`}>{value}</div>
      <div className="text-xs md:text-sm text-muted-foreground mt-2">{label}</div>
    </div>
  );
}
