// Hardcoded site metadata extracted from the official Rakeen PDF report.
// Keyed by siteId (الشاخص). Fields not in the Google Sheet live here.

export interface SiteMeta {
  centerNumber: string;      // رقم المركز
  centerHead: string;        // اسم رئيس المركز
  nationality: string;       // جنسية الحجاج
  pilgrimsCount: number;     // عدد الحجاج
  category: string;          // الفئة
  contractor: string;        // اسم المتعهد
}

export const SITE_METADATA: Record<string, SiteMeta> = {
  "8/520": {
    centerNumber: "212",
    centerHead: "أحمد أشعري",
    nationality: "الهند",
    pilgrimsCount: 4325,
    category: "د",
    contractor: "حسام مرداد",
  },
  "3/518": {
    centerNumber: "211",
    centerHead: "أحمد أشعري",
    nationality: "الهند",
    pilgrimsCount: 4325,
    category: "ب",
    contractor: "حسام مرداد",
  },
  "1/518": {
    centerNumber: "211",
    centerHead: "أحمد أشعري",
    nationality: "الهند",
    pilgrimsCount: 4325,
    category: "ب",
    contractor: "حسام مرداد",
  },
  "2/529": {
    centerNumber: "215",
    centerHead: "علاء دمهوري",
    nationality: "باكستان - بنجلاديش",
    pilgrimsCount: 2879,
    category: "د",
    contractor: "حسام مرداد",
  },
  "3/522": {
    centerNumber: "214",
    centerHead: "محمد قستي",
    nationality: "بنجلاديش",
    pilgrimsCount: 4583,
    category: "د",
    contractor: "حسام مرداد",
  },
  "5/508": {
    centerNumber: "213",
    centerHead: "منصور جمبي",
    nationality: "الهند",
    pilgrimsCount: 1762,
    category: "د",
    contractor: "حسام مرداد",
  },
};

export function getSiteMeta(siteId: string): SiteMeta {
  return (
    SITE_METADATA[siteId] ?? {
      centerNumber: "—",
      centerHead: "—",
      nationality: "—",
      pilgrimsCount: 0,
      category: "—",
      contractor: "حسام مرداد",
    }
  );
}
