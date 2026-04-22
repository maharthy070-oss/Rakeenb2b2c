import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SiteAggregate } from "@/lib/inspections";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  aggregates: SiteAggregate[];
}

const TREND_COLORS: Record<string, string> = {
  "تحسن كبير": "hsl(var(--success))",
  "تحسن طفيف": "hsl(var(--primary))",
  ثابت: "hsl(var(--muted-foreground))",
  "تراجع طفيف": "hsl(var(--warning))",
  "تراجع كبير": "hsl(var(--destructive))",
};

function perfColor(score: number) {
  if (score >= 90) return "hsl(var(--success))";
  if (score >= 70) return "hsl(var(--primary))";
  if (score >= 50) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

type CompanyFilter = "all" | "سنا" | "ركين";

const COMPANY_BAR_COLORS: Record<CompanyFilter, { first: string; latest: string; label: string }> = {
  all: { first: "hsl(var(--muted-foreground))", latest: "hsl(var(--primary))", label: "الكل" },
  سنا: { first: "hsl(0 72% 70%)", latest: "hsl(var(--sana))", label: "سنا" },
  ركين: { first: "hsl(25 45% 65%)", latest: "hsl(var(--rakeen))", label: "ركين" },
};

export function SitesPerformanceSection({ aggregates }: Props) {
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>("all");

  const filteredAggregates = useMemo(
    () =>
      companyFilter === "all"
        ? aggregates
        : aggregates.filter((a) => a.company === companyFilter),
    [aggregates, companyFilter],
  );

  if (aggregates.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-10 text-center text-muted-foreground">
        لا توجد بيانات كافية لعرض أداء المواقع.
      </div>
    );
  }


  const total = aggregates.length;
  const avgCurrent = Math.round((aggregates.reduce((s, a) => s + a.latestScore, 0) / total) * 10) / 10;
  const improved = aggregates.filter((a) => a.improvement > 0).length;
  const declined = aggregates.filter((a) => a.improvement < 0).length;
  const excellent = aggregates.filter((a) => a.latestScore >= 90).length;
  const excellenceRate = Math.round((excellent / total) * 1000) / 10;
  const avgImprovement =
    Math.round((aggregates.reduce((s, a) => s + a.improvement, 0) / total) * 10) / 10;

  const sortedByImprovement = [...aggregates].sort((a, b) => b.improvement - a.improvement);
  const topImproved = sortedByImprovement[0];
  const topDeclined = sortedByImprovement[sortedByImprovement.length - 1];
  const bestNow = aggregates[0];
  const worstNow = aggregates[aggregates.length - 1];

  // Trend distribution
  const trendCounts = aggregates.reduce<Record<string, number>>((acc, a) => {
    acc[a.trend] = (acc[a.trend] ?? 0) + 1;
    return acc;
  }, {});
  const trendData = Object.entries(trendCounts).map(([name, value]) => ({ name, value }));

  // Comparison: first vs latest
  const compareData = aggregates.slice(0, 15).map((a) => ({
    site: a.siteId,
    "أول تقييم": a.firstScore,
    "الأداء الحالي": a.latestScore,
  }));

  // Timeline data
  const timelineData: Array<Record<string, number | string>> = [];
  const maxVisits = Math.max(...aggregates.map((a) => a.visits));
  for (let i = 1; i <= maxVisits; i++) {
    const point: Record<string, number | string> = { visit: `زيارة ${i}` };
    for (const a of aggregates) {
      const ins = a.inspections[i - 1];
      if (ins) point[a.siteId] = ins.overallScore;
    }
    timelineData.push(point);
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="إجمالي المواقع" value={total} color="primary" />
        <Kpi label="متوسط الأداء العام" value={`${avgCurrent}%`} color="primary" />
        <Kpi label="مواقع تحسنت" value={improved} color="success" />
        <Kpi label="مواقع تراجعت" value={declined} color="danger" />
      </div>

      {/* Insights */}
      <section>
        <h2 className="text-xl font-bold mb-4">🧠 تحليلات ذكية</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {topImproved && topImproved.improvement > 0 && (
              <div className="insight-success">
                <h3 className="font-bold mb-1">🏆 أكثر موقع تحسناً: {topImproved.siteId}</h3>
                <p className="text-sm opacity-90">
                  ارتفع من {topImproved.firstScore}% إلى {topImproved.latestScore}% (تحسن +
                  {topImproved.improvement}%)
                </p>
              </div>
            )}
            <div className="insight-success">
              <h3 className="font-bold mb-1">⭐ أعلى موقع أداءً حالياً: {bestNow.siteId}</h3>
              <p className="text-sm opacity-90">
                بنسبة إنجاز {bestNow.latestScore}% ({bestNow.companyFull})
              </p>
            </div>
            <div className="insight-info">
              <h3 className="font-bold mb-1">📊 نسبة التميز: {excellenceRate}%</h3>
              <p className="text-sm opacity-90">
                {excellent} من أصل {total} مواقع تجاوزت 90%
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {topDeclined && topDeclined.improvement < 0 && (
              <div className="insight-danger">
                <h3 className="font-bold mb-1">⚠️ أكثر موقع تراجعاً: {topDeclined.siteId}</h3>
                <p className="text-sm opacity-90">
                  انخفض من {topDeclined.firstScore}% إلى {topDeclined.latestScore}% (تراجع{" "}
                  {topDeclined.improvement}%)
                </p>
              </div>
            )}
            <div className="insight-danger">
              <h3 className="font-bold mb-1">🚨 أقل موقع أداءً حالياً: {worstNow.siteId}</h3>
              <p className="text-sm opacity-90">
                بنسبة إنجاز {worstNow.latestScore}% — يحتاج لمتابعة عاجلة
              </p>
            </div>
            <div
              className={
                avgImprovement > 0
                  ? "insight-success"
                  : avgImprovement < 0
                  ? "insight-danger"
                  : "insight-info"
              }
            >
              <h3 className="font-bold mb-1">
                {avgImprovement > 0 ? "📈" : avgImprovement < 0 ? "📉" : "➖"} متوسط معدل التحسن:{" "}
                {avgImprovement}%
              </h3>
              <p className="text-sm opacity-90">عبر جميع المواقع منذ بداية المتابعة</p>
            </div>
          </div>
        </div>
      </section>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="الأداء الحالي لكل موقع">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={aggregates.map((a) => ({ site: a.siteId, score: a.latestScore }))}
              margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="site" reversed tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis orientation="right" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "var(--primary)",
                }}
                labelStyle={{ color: "var(--primary)" }}
                itemStyle={{ color: "var(--primary)" }}
                formatter={(v: number) => [`${v}%`, "الأداء"]}
              />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {aggregates.map((a, i) => (
                  <Cell key={i} fill={perfColor(a.latestScore)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="مقدار التحسن (مقارنة بأول تقييم)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sortedByImprovement.map((a) => ({ site: a.siteId, change: a.improvement }))}
              margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="site" reversed tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "var(--primary)",
                }}
                labelStyle={{ color: "var(--primary)" }}
                itemStyle={{ color: "var(--primary)" }}
                formatter={(v: number) => [`${v}%`, "التحسن"]}
              />
              <Bar dataKey="change" radius={[8, 8, 0, 0]}>
                {sortedByImprovement.map((a, i) => (
                  <Cell
                    key={i}
                    fill={
                      a.improvement > 0
                        ? "hsl(var(--success))"
                        : a.improvement < 0
                        ? "hsl(var(--destructive))"
                        : "hsl(var(--muted-foreground))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Per-site comparison: first vs latest, with company filter */}
      <section className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-bold">📊 مقارنة أداء المواقع: أول تقييم مقابل الأداء الحالي</h3>
          <div className="flex gap-2">
            {(["all", "سنا", "ركين"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setCompanyFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                  companyFilter === f
                    ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-glow)]"
                    : "bg-secondary text-muted-foreground border-border hover:border-primary/50",
                )}
              >
                {COMPANY_BAR_COLORS[f].label}
              </button>
            ))}
          </div>
        </div>
        {filteredAggregates.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            لا توجد مواقع لهذه الشركة.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={filteredAggregates.map((a) => ({
                site: a.siteId,
                "أول تقييم": a.firstScore,
                "الأداء الحالي": a.latestScore,
              }))}
              margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="site"
                reversed
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis
                orientation="right"
                domain={[0, 100]}
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
                formatter={(v: number) => [`${v}%`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="أول تقييم"
                fill={COMPANY_BAR_COLORS[companyFilter].first}
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="الأداء الحالي"
                fill={COMPANY_BAR_COLORS[companyFilter].latest}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="توزيع المواقع حسب حالة التقدم">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart margin={{ top: 16, right: 80, bottom: 16, left: 80 }}>
              <Pie
                data={trendData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                stroke="hsl(var(--card))"
                strokeWidth={2}
                minAngle={6}
                labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                label={({ cx, cy, midAngle, outerRadius, name, value, percent }) => {
                  const RAD = Math.PI / 180;
                  const r = outerRadius + 18;
                  const x = cx + r * Math.cos(-midAngle * RAD);
                  const y = cy + r * Math.sin(-midAngle * RAD);
                  const anchor = x > cx ? "start" : "end";
                  return (
                    <text
                      x={x}
                      y={y}
                      textAnchor={anchor}
                      dominantBaseline="central"
                      fill="hsl(var(--foreground))"
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                      paintOrder="stroke"
                      style={{ fontSize: 12, fontWeight: 700 }}
                    >
                      {`${name}: ${value} (${Math.round((percent ?? 0) * 100)}%)`}
                    </text>
                  );
                }}
              >
                {trendData.map((d, i) => (
                  <Cell key={i} fill={TREND_COLORS[d.name] ?? "hsl(var(--primary))"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "var(--primary)",
                }}
                labelStyle={{ color: "var(--primary)" }}
                itemStyle={{ color: "var(--primary)" }}
                formatter={(v: number, n: string) => [`${v} موقع`, n]}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="مقارنة أول تقييم مقابل الأداء الحالي">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={compareData} margin={{ top: 20, right: 10, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="site" reversed tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis orientation="right" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "var(--primary)",
                }}
                labelStyle={{ color: "var(--primary)" }}
                itemStyle={{ color: "var(--primary)" }}
              />
              <Legend />
              <Bar dataKey="أول تقييم" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="الأداء الحالي" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Detailed table */}
      <section className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-xl font-bold mb-4">📋 تقرير تفصيلي للمواقع</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-right py-2 px-3">الموقع</th>
                <th className="text-right py-2 px-3">الشركة</th>
                <th className="text-center py-2 px-3">الأداء الحالي</th>
                <th className="text-center py-2 px-3">أول تقييم</th>
                <th className="text-center py-2 px-3">التحسن</th>
                <th className="text-center py-2 px-3">المتوسط</th>
                <th className="text-center py-2 px-3">أعلى</th>
                <th className="text-center py-2 px-3">أقل</th>
                <th className="text-center py-2 px-3">عدد الزيارات</th>
                <th className="text-right py-2 px-3">حالة التقدم</th>
              </tr>
            </thead>
            <tbody>
              {aggregates.map((a) => (
                <tr key={a.siteId} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-2 px-3 font-bold">{a.siteId}</td>
                  <td className="py-2 px-3 text-muted-foreground">{a.companyFull}</td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className="inline-block px-2 py-1 rounded-md font-bold"
                      style={{ background: perfColor(a.latestScore), color: "white" }}
                    >
                      {a.latestScore}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">{a.firstScore}%</td>
                  <td
                    className="py-2 px-3 text-center font-bold"
                    style={{
                      color:
                        a.improvement > 0
                          ? "hsl(var(--success))"
                          : a.improvement < 0
                          ? "hsl(var(--destructive))"
                          : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {a.improvement > 0 ? "+" : ""}
                    {a.improvement}%
                  </td>
                  <td className="py-2 px-3 text-center">{a.avgScore}%</td>
                  <td className="py-2 px-3 text-center">{a.maxScore}%</td>
                  <td className="py-2 px-3 text-center">{a.minScore}%</td>
                  <td className="py-2 px-3 text-center">{a.visits}</td>
                  <td className="py-2 px-3">
                    <span style={{ color: TREND_COLORS[a.trend] }}>
                      {a.trendIcon} {a.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "primary" | "success" | "danger";
}) {
  const cmap: Record<string, string> = {
    primary: "text-primary",
    success: "text-[hsl(var(--success))]",
    danger: "text-destructive",
  };
  return (
    <div className="metric-card">
      <div className={`text-3xl md:text-4xl font-extrabold ${cmap[color]}`}>{value}</div>
      <div className="text-xs md:text-sm text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-card)]">
      <h3 className="font-bold mb-3 text-center">{title}</h3>
      {children}
    </section>
  );
}
