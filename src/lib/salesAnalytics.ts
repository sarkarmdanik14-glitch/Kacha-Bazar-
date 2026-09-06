/**
 * Sales Analytics & Weight Calculation Utilities for Daily Sales Overview
 * Accurately parses kg, gram, pcs and calculates completed/delivered order metrics.
 */

// Convert Bengali numerals to Western Arabic digits
export function convertBengaliDigitsToWestern(str: string): string {
  if (!str) return "";
  const bnToEn: Record<string, string> = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
  };
  return str.replace(/[০-৯]/g, (match) => bnToEn[match] || match);
}

// Convert Western digits to Bengali numerals
export function convertWesternDigitsToBengali(num: number | string): string {
  if (num === null || num === undefined) return "০";
  const str = String(num);
  const enToBn: Record<string, string> = {
    "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
    "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯"
  };
  return str.replace(/[0-9]/g, (match) => enToBn[match] || match);
}

export interface WeightExtractionResult {
  isWeightBased: boolean;
  gramsPerUnit: number;
  totalGrams: number;
  unitLabelBn: string;
  unitLabelEn: string;
}

/**
 * Accurately extracts weight in grams from an order item
 * Checks selectedOption, item.unit, product.unitBn/unitEn, and product name strings.
 */
export function extractItemWeight(item: any): WeightExtractionResult {
  const quantity = Math.max(1, Number(item.quantity) || 1);

  // 1. Check selectedOption if present
  if (item.selectedOption) {
    const optValue = Number(item.selectedOption.value) || 0;
    const optUnit = String(item.selectedOption.unit || "").toLowerCase();

    if (optUnit.includes("kg") || optUnit.includes("কেজি") || optUnit.includes("kilo")) {
      const gramsPerUnit = optValue * 1000;
      return {
        isWeightBased: true,
        gramsPerUnit,
        totalGrams: gramsPerUnit * quantity,
        unitLabelBn: `${optValue} কেজি`,
        unitLabelEn: `${optValue} kg`
      };
    }

    if (
      optUnit.includes("gm") || 
      optUnit.includes("gram") || 
      optUnit.includes("গ্রাম") || 
      optUnit === "g"
    ) {
      const gramsPerUnit = optValue;
      return {
        isWeightBased: true,
        gramsPerUnit,
        totalGrams: gramsPerUnit * quantity,
        unitLabelBn: `${optValue} গ্রাম`,
        unitLabelEn: `${optValue} gm`
      };
    }
  }

  // 2. Combine all potential unit description strings
  const rawUnitStrings = [
    item.unit,
    item.product?.unitBn,
    item.product?.unitEn,
    item.nameBn,
    item.name,
    item.product?.nameBn,
    item.product?.nameEn
  ].filter(Boolean).join(" ");

  const normalizedStr = convertBengaliDigitsToWestern(rawUnitStrings).toLowerCase();

  // Pattern A: e.g. "1.5 kg", "2 kg", "1 কেজি", "0.5 কেজি", "2.5kg"
  const kgMatch = normalizedStr.match(/(\d+(?:\.\d+)?)\s*(?:kg|কেজি|kilo|কে\.জি)/i);
  if (kgMatch) {
    const kgVal = parseFloat(kgMatch[1]);
    if (!isNaN(kgVal) && kgVal > 0) {
      const gramsPerUnit = kgVal * 1000;
      return {
        isWeightBased: true,
        gramsPerUnit,
        totalGrams: gramsPerUnit * quantity,
        unitLabelBn: `${kgVal} কেজি`,
        unitLabelEn: `${kgVal} kg`
      };
    }
  }

  // Pattern B: e.g. "500 gm", "250 gram", "৫০০ গ্রাম", "100g"
  const gmMatch = normalizedStr.match(/(\d+(?:\.\d+)?)\s*(?:gm|gram|গ্রাম|g|গ্রা)\b/i);
  if (gmMatch) {
    const gmVal = parseFloat(gmMatch[1]);
    if (!isNaN(gmVal) && gmVal > 0) {
      const gramsPerUnit = gmVal;
      return {
        isWeightBased: true,
        gramsPerUnit,
        totalGrams: gramsPerUnit * quantity,
        unitLabelBn: `${gmVal} গ্রাম`,
        unitLabelEn: `${gmVal} gm`
      };
    }
  }

  // Pattern C: Plain "kg" or "কেজি" without explicit number (defaults to 1 kg per quantity)
  if (
    normalizedStr.includes("kg") || 
    normalizedStr.includes("কেজি") || 
    normalizedStr.includes("kilo")
  ) {
    const gramsPerUnit = 1000;
    return {
      isWeightBased: true,
      gramsPerUnit,
      totalGrams: gramsPerUnit * quantity,
      unitLabelBn: "১ কেজি",
      unitLabelEn: "1 kg"
    };
  }

  // Pattern D: Plain "gram", "gm", "গ্রাম" without explicit number (defaults to 100g or 1 unit)
  if (
    normalizedStr.includes("গ্রাম") || 
    normalizedStr.includes("gram") || 
    normalizedStr.includes("gm")
  ) {
    const gramsPerUnit = 100;
    return {
      isWeightBased: true,
      gramsPerUnit,
      totalGrams: gramsPerUnit * quantity,
      unitLabelBn: "১০০ গ্রাম",
      unitLabelEn: "100 gm"
    };
  }

  // Non-weight item (e.g. piece, dozen, bottle, packet)
  const fallbackUnitBn = item.unit || item.product?.unitBn || "পিস";
  const fallbackUnitEn = item.unit || item.product?.unitEn || "pcs";

  return {
    isWeightBased: false,
    gramsPerUnit: 0,
    totalGrams: 0,
    unitLabelBn: fallbackUnitBn,
    unitLabelEn: fallbackUnitEn
  };
}

/**
 * Nicely formats total grams into human readable string
 * e.g. "24.5 কেজি (২৪,৫০০ গ্রাম)"
 */
export function formatTotalWeight(
  totalGrams: number, 
  lang: "bn" | "en" = "bn"
): { 
  displayShort: string; 
  displayDetailed: string; 
  totalKg: number; 
  totalGrams: number;
} {
  const totalKg = totalGrams / 1000;
  const kgRounded = Math.floor(totalKg);
  const remainingGrams = Math.round(totalGrams % 1000);

  if (lang === "bn") {
    if (totalGrams >= 1000) {
      const kgFormatted = totalKg % 1 === 0 ? totalKg.toFixed(0) : totalKg.toFixed(2);
      const displayShort = `${convertWesternDigitsToBengali(kgFormatted)} কেজি`;
      const detailed = remainingGrams > 0 
        ? `${convertWesternDigitsToBengali(kgRounded)} কেজি ${convertWesternDigitsToBengali(remainingGrams)} গ্রাম`
        : `${convertWesternDigitsToBengali(kgFormatted)} কেজি`;
      return {
        displayShort,
        displayDetailed: detailed,
        totalKg,
        totalGrams
      };
    } else {
      const displayShort = `${convertWesternDigitsToBengali(Math.round(totalGrams))} গ্রাম`;
      return {
        displayShort,
        displayDetailed: displayShort,
        totalKg,
        totalGrams
      };
    }
  } else {
    if (totalGrams >= 1000) {
      const kgFormatted = totalKg % 1 === 0 ? totalKg.toFixed(0) : totalKg.toFixed(2);
      const displayShort = `${kgFormatted} kg`;
      const detailed = remainingGrams > 0 
        ? `${kgRounded} kg ${remainingGrams} gm`
        : `${kgFormatted} kg`;
      return {
        displayShort,
        displayDetailed: detailed,
        totalKg,
        totalGrams
      };
    } else {
      const displayShort = `${Math.round(totalGrams)} gm`;
      return {
        displayShort,
        displayDetailed: displayShort,
        totalKg,
        totalGrams
      };
    }
  }
}

/**
 * Parse any date representation from Firestore Order
 */
export function parseOrderDate(order: any): Date | null {
  if (!order) return null;

  // 1. deliveredAt or completedAt if available
  const dateField = order.deliveredAt || order.completedAt || order.createdAt || order.date || order.updatedAt;
  if (!dateField) return null;

  // Firestore Timestamp with toDate()
  if (typeof dateField.toDate === "function") {
    return dateField.toDate();
  }

  // Firestore Timestamp with seconds
  if (typeof dateField.seconds === "number") {
    return new Date(dateField.seconds * 1000);
  }

  // Milliseconds number
  if (typeof dateField === "number") {
    return new Date(dateField);
  }

  // ISO string or date string
  if (typeof dateField === "string") {
    const d = new Date(dateField);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Filter condition: ONLY completed or delivered orders
 */
export function isOrderDelivered(order: any): boolean {
  if (!order) return false;
  const status = String(order.orderStatus || order.status || "").toLowerCase().trim();
  return status === "delivered" || status === "completed";
}

/**
 * Checks if a date falls inside a given range
 */
export function isDateInRange(
  date: Date, 
  filter: "today" | "yesterday" | "last7days" | "thismonth" | "custom",
  customStart?: Date,
  customEnd?: Date
): boolean {
  const targetTime = date.getTime();
  const now = new Date();

  // Helper for start of day
  const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const getEndOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  if (filter === "today") {
    const start = getStartOfDay(now).getTime();
    const end = getEndOfDay(now).getTime();
    return targetTime >= start && targetTime <= end;
  }

  if (filter === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const start = getStartOfDay(yesterday).getTime();
    const end = getEndOfDay(yesterday).getTime();
    return targetTime >= start && targetTime <= end;
  }

  if (filter === "last7days") {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const start = getStartOfDay(sevenDaysAgo).getTime();
    const end = getEndOfDay(now).getTime();
    return targetTime >= start && targetTime <= end;
  }

  if (filter === "thismonth") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    return targetTime >= start && targetTime <= end;
  }

  if (filter === "custom") {
    if (!customStart) return true;
    const start = getStartOfDay(customStart).getTime();
    const end = customEnd ? getEndOfDay(customEnd).getTime() : getEndOfDay(customStart).getTime();
    return targetTime >= start && targetTime <= end;
  }

  return true;
}

export interface SoldProductAggregate {
  productId: string;
  nameBn: string;
  nameEn: string;
  image: string;
  category: string;
  unit: string;
  totalQuantity: number;
  totalSalesAmount: number;
  totalWeightGrams: number;
  isWeightBased: boolean;
  ordersCount: number;
  avgPrice: number;
}

export interface HourlySalesPoint {
  hourLabelBn: string;
  hourLabelEn: string;
  hourNum: number;
  salesAmount: number;
  ordersCount: number;
  weightKg: number;
}

export interface DailySalesPoint {
  dateKey: string;
  dateLabelBn: string;
  dateLabelEn: string;
  salesAmount: number;
  ordersCount: number;
  weightKg: number;
}
