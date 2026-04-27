import type { Inspection } from "./inspections";
import { aggregateBySite } from "./inspections";
import { getSiteMeta } from "./siteMetadata";

/**
 * Build a compact text summary of all inspection data to send as
 * system context to the AI. Keeps token usage bounded.
 */
export function buildChatContext(inspections: Inspection[]): string {
  if (!inspections.length) return "لا توجد بيانات تفتيش متاحة بعد.";

  const aggregates = aggregateBySite(inspections);
  const totalReports = inspections.length;
  const totalSites = aggregates.length;
  const avgScore =
    Math.round(
      (aggregates.reduce((s, a) => s + a.latestScore, 0) / totalSites) * 10,
    ) / 10;

  const byCompany = aggregates.reduce<Record<string, number>>((acc, a) => {
    acc[a.companyFull] = (acc[a.companyFull] ?? 0) + 1;
    return acc;
  }, {});

  const lines: string[] = [];
  lines.push(`إجمالي المواقع: ${totalSites}`);
  lines.push(`إجمالي تقارير التفتيش: ${totalReports}`);
  lines.push(`متوسط نتيجة المواقع: ${avgScore}%`);
  lines.push(
    `التوزيع حسب الشركة: ${Object.entries(byCompany)
      .map(([c, n]) => `${c} (${n})`)
      .join(" / ")}`,
  );
  lines.push("");
  lines.push("تفاصيل المواقع:");

  for (const a of aggregates) {
    const meta = getSiteMeta(a.siteId);
    const topMissing = a.inspections[a.inspections.length - 1].missingItems
      .slice(0, 5)
      .map((m) => m.name)
      .join("، ");
    lines.push(
      `- شاخص ${a.siteId} | ${a.companyFull} | مراقب: ${a.supervisor} | مركز ${meta.centerNumber} (${meta.centerHead}) | جنسية: ${meta.nationality} | حجاج: ${meta.pilgrimsCount} | فئة: ${meta.category} | متعهد: ${meta.contractor} | آخر: ${a.latestScore}% | متوسط: ${a.avgScore}% | زيارات: ${a.visits} | اتجاه: ${a.trend} ${a.trendIcon}${topMissing ? ` | نواقص: ${topMissing}` : ""}`,
    );
  }

  return lines.join("\n");
}
