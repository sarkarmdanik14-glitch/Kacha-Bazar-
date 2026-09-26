import { Product, ProductOption } from "../types";
import { GROCERY_SUBCATEGORY_MAP, GROCERY_ORDER_MAP, getResolvedGrocerySubcategory, getResolvedGroceryDisplayOrder } from "../data";
import { resolveAuthenticProductImage } from "./masterImageRegistry";

// Helper to translate numbers to Bangla script
export const toBnNum = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null || num === "") return "";
  const digits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num.toString().replace(/\d/g, (char) => digits[parseInt(char, 10)]);
};

// Helper to translate Bangla digits to standard English numbers
export const toEnNum = (str: string | number | undefined | null): string => {
  if (str === undefined || str === null || str === "") return "";
  const bnToEnMap: Record<string, string> = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
  };
  return str.toString().replace(/[০-৯]/g, (char) => bnToEnMap[char] || char);
};

// Specific known spice products weight map for guaranteed accuracy
const KNOWN_SPICE_WEIGHTS: Record<string, { unitBn: string; unitEn: string }> = {
  sp1: { unitBn: "১০০ গ্রাম", unitEn: "100 g" },
  sp2: { unitBn: "২০০ গ্রাম", unitEn: "200 g" },
  sp3: { unitBn: "২০০ গ্রাম", unitEn: "200 g" },
  sp4: { unitBn: "১০০ গ্রাম", unitEn: "100 g" },
  sp5: { unitBn: "৫০ গ্রাম", unitEn: "50 g" },
  sp6: { unitBn: "১০০ গ্রাম", unitEn: "100 g" },
  sp7: { unitBn: "১০০ গ্রাম", unitEn: "100 g" },
  sp8: { unitBn: "৫০ গ্রাম", unitEn: "50 g" },
  sp9: { unitBn: "১০০ গ্রাম", unitEn: "100 g" },
  sp10: { unitBn: "১০০ গ্রাম", unitEn: "100 g" },
  sp11: { unitBn: "২০০ গ্রাম", unitEn: "200 g" },
  sp12: { unitBn: "২০০ গ্রাম", unitEn: "200 g" },
  sp17: { unitBn: "৫০ গ্রাম", unitEn: "50 g" },
  sp18: { unitBn: "৫০ গ্রাম", unitEn: "50 g" },
  sp19: { unitBn: "১০০ গ্রাম", unitEn: "100 g" },
  sp20: { unitBn: "২ গ্রাম", unitEn: "2 g" },
  sp21: { unitBn: "৫০ গ্রাম", unitEn: "50 g" },
  sp22: { unitBn: "১০০ গ্রাম", unitEn: "100 g" },
  sp23: { unitBn: "৫০ গ্রাম", unitEn: "50 g" },
  sp24: { unitBn: "৫০ গ্রাম", unitEn: "50 g" },
  sp25: { unitBn: "৫০ গ্রাম", unitEn: "50 g" },
  sp30: { unitBn: "১০০ গ্রাম", unitEn: "100 g" },
};

/**
 * Universal product unit / measurement resolver
 * Intelligently extracts exact measurements (kg, gram, pcs, liter, ml) from product names or units
 * and formats them with high contrast and crystal clarity across the entire application.
 */
export const resolveProductUnit = (
  product: { 
    id?: string;
    nameBn?: string; 
    nameEn?: string; 
    unitBn?: string; 
    unitEn?: string;
    category?: string;
    subcategory?: string;
  }
): { unitBn: string; unitEn: string } => {
  const bn = (product.nameBn || "").trim();
  const en = (product.nameEn || "").trim();
  const rawBn = (product.unitBn || "").trim();
  const rawEn = (product.unitEn || "").trim();

  // 1. Check known specific product ID overrides
  if (product.id && KNOWN_SPICE_WEIGHTS[product.id]) {
    return KNOWN_SPICE_WEIGHTS[product.id];
  }
  if (product.id === "prod_mu48bsvj" || bn.includes("সাদা ফল")) {
    return { unitBn: "১০০ গ্রাম", unitEn: "100 g" };
  }
  if (product.id === "prod_mu1865t1" || bn === "গরম মসলা") {
    return { unitBn: "৫০ গ্রাম", unitEn: "50 g" };
  }

  // 2. Extract precise weight/count from Bengali title, e.g. (১০০ গ্রাম), (২০০ মিলি), (১.২৫ লিটার), (৫ কেজি), (৪টি), (১২ পিস)
  const bnMatch = bn.match(/\(([\d০-৯\.\s]+)\s*(গ্রাম|কেজি|পিস|টি|লিটার|মিলি|মি\.লি\.|প্যাক|প্যাকেট|ডজন)\)/i);
  if (bnMatch) {
    const rawVal = bnMatch[1].trim();
    const rawType = bnMatch[2].trim();
    const bnVal = toBnNum(rawVal);
    const enVal = toEnNum(rawVal);
    const countNum = parseFloat(enVal);

    let resolvedBnType = rawType;
    let resolvedEnType = "g";

    if (rawType === "গ্রাম") {
      resolvedBnType = "গ্রাম";
      resolvedEnType = "g";
    } else if (rawType === "কেজি") {
      resolvedBnType = "কেজি";
      resolvedEnType = "kg";
    } else if (rawType === "লিটার") {
      resolvedBnType = "লিটার";
      resolvedEnType = "L";
    } else if (rawType === "মিলি" || rawType === "মি.লি.") {
      resolvedBnType = "মিলি";
      resolvedEnType = "ml";
    } else if (rawType === "পিস" || rawType === "টি") {
      resolvedBnType = countNum > 1 ? `${rawType === "টি" ? "টি" : "পিস"}` : "পিস";
      resolvedEnType = countNum > 1 ? "pcs" : "pc";
    } else if (rawType === "প্যাক" || rawType === "প্যাকেট") {
      resolvedBnType = "প্যাকেট";
      resolvedEnType = "pack";
    } else if (rawType === "ডজন") {
      resolvedBnType = "ডজন";
      resolvedEnType = "dozen";
    }

    return {
      unitBn: `${bnVal} ${resolvedBnType}`,
      unitEn: `${enVal} ${resolvedEnType}`
    };
  }

  // 3. Extract from English title, e.g. (100 g), (200 ml), (1 kg), (4 pcs), (1 dozen)
  const enMatch = en.match(/\(([\d\.\s]+)\s*(g|gm|kg|ml|l|liter|litre|pc|pcs|pack|packet|tin|can|jar|bottle|dozen)\)/i);
  if (enMatch) {
    const rawVal = enMatch[1].trim();
    const u = enMatch[2].toLowerCase();
    const bnVal = toBnNum(rawVal);
    const enVal = rawVal;
    const countNum = parseFloat(enVal);

    if (u === "g" || u === "gm") return { unitBn: `${bnVal} গ্রাম`, unitEn: `${enVal} g` };
    if (u === "kg") return { unitBn: `${bnVal} কেজি`, unitEn: `${enVal} kg` };
    if (u === "ml") return { unitBn: `${bnVal} মিলি`, unitEn: `${enVal} ml` };
    if (u === "l" || u === "liter" || u === "litre") return { unitBn: `${bnVal} লিটার`, unitEn: `${enVal} L` };
    if (u === "pc" || u === "pcs") return { unitBn: `${bnVal} পিস`, unitEn: `${enVal} ${countNum > 1 ? "pcs" : "pc"}` };
    if (u === "pack" || u === "packet") return { unitBn: `${bnVal} প্যাকেট`, unitEn: `${enVal} pack` };
    if (u === "dozen") return { unitBn: `${bnVal} ডজন`, unitEn: `${enVal} dozen` };
  }

  // 4. Clean up provided rawUnitBn & rawUnitEn
  if (rawBn) {
    if (/^\d+\s*kg$/i.test(rawBn)) {
      const n = toBnNum(rawBn.replace(/\D/g, ""));
      return { unitBn: `${n} কেজি`, unitEn: `${rawBn.replace(/\D/g, "")} kg` };
    }
    if (/^\d+\s*g$/i.test(rawBn)) {
      const n = toBnNum(rawBn.replace(/\D/g, ""));
      return { unitBn: `${n} গ্রাম`, unitEn: `${rawBn.replace(/\D/g, "")} g` };
    }
    if (/^\d+\s*pc/i.test(rawBn)) {
      const n = toBnNum(rawBn.replace(/\D/g, ""));
      return { unitBn: `${n} পিস`, unitEn: `${rawBn.replace(/\D/g, "")} pc` };
    }
    let cleanBn = toBnNum(rawBn);
    // Ensure clean separation between number and unit word
    cleanBn = cleanBn.replace(/([০-৯]+)([কখগঘচছজঝটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়])/g, "$1 $2");
    return { unitBn: cleanBn, unitEn: rawEn || "1 unit" };
  }

  return { unitBn: "১ কেজি", unitEn: "1 kg" };
};

export const resolveProductDisplayUnit = (
  product: { 
    id?: string;
    nameBn?: string; 
    nameEn?: string; 
    unitBn?: string; 
    unitEn?: string;
    category?: string;
    subcategory?: string;
  }, 
  lang: "bn" | "en" = "bn"
): string => {
  const resolved = resolveProductUnit(product);
  return lang === "bn" ? resolved.unitBn : resolved.unitEn;
};

// Helper to map Firestore doc data to Product type
export const mapDocToProduct = (docId: string, data: any): Product => {
  const rawCat = data.category || (docId.startsWith("st") || docId.startsWith("sp") ? "groceries" : "others");
  const resolvedCategory = (rawCat === "staples" || rawCat === "spices-oils") ? "groceries" : rawCat;
  const isGrocery = resolvedCategory === "groceries" || docId.startsWith("st") || docId.startsWith("sp") || (data.id && (data.id.startsWith("st") || data.id.startsWith("sp")));
  const resolvedSubcategory = isGrocery
    ? getResolvedGrocerySubcategory(data.id || docId, data.nameBn, data.nameEn, data.subcategory, resolvedCategory)
    : (data.subcategory || "General");
  const resolvedOrder = isGrocery
    ? getResolvedGroceryDisplayOrder(data.id || docId, data.nameBn, data.nameEn, resolvedSubcategory, data.displayOrder ?? data.order)
    : (typeof data.displayOrder === "number" ? data.displayOrder : (typeof data.order === "number" ? data.order : undefined));

  const resolvedUnits = resolveProductUnit({
    id: data.id || docId,
    nameBn: data.nameBn,
    nameEn: data.nameEn,
    unitBn: data.unitBn,
    unitEn: data.unitEn,
    category: resolvedCategory,
    subcategory: resolvedSubcategory
  });

  return {
    id: data.id || docId,
    nameBn: data.nameBn,
    nameEn: data.nameEn,
    price: data.price !== undefined && data.price !== null && data.price !== "" && !isNaN(Number(data.price))
      ? Number(data.price)
      : undefined,
    originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
    unitBn: resolvedUnits.unitBn,
    unitEn: resolvedUnits.unitEn,
    category: resolvedCategory,
    categoryId: data.categoryId || resolvedCategory,
    subcategoryId: data.subcategoryId || "",
    image: resolveAuthenticProductImage(
      data.id || docId, 
      data.image || data.imageUrl || data.image_url || data.photoUrl || data.img || (Array.isArray(data.images) && data.images[0]) || ""
    ),
    imageUrl: resolveAuthenticProductImage(
      data.id || docId, 
      data.image || data.imageUrl || data.image_url || data.photoUrl || data.img || (Array.isArray(data.images) && data.images[0]) || ""
    ),
    isFlashSale: !!data.isFlashSale,
    discount: Number(data.discount || 0),
    rating: Number(data.rating || 4.5),
    stock: typeof data.stock === "number" && !isNaN(data.stock)
      ? data.stock
      : (data.stock !== undefined && data.stock !== null && data.stock !== "" ? Number(data.stock) : 50),
    descriptionBn: data.descriptionBn || "",
    descriptionEn: data.descriptionEn || "",
    isBestSelling: !!data.isBestSelling,
    isNewArrival: !!data.isNewArrival,
    isPopular: !!data.isPopular,
    isSeasonal: !!data.isSeasonal,
    isCombo: !!data.isCombo,
    isBuyMoreSaveMore: !!data.isBuyMoreSaveMore,
    brand: data.brand || "Kacha Bazar",
    reviewCount: Number(data.reviewCount || 1),
    sellerId: data.sellerId || "admin",
    sku: data.sku || `KB-${resolvedCategory.substring(0, 3).toUpperCase()}-${data.id || docId}`,
    subcategory: resolvedSubcategory,
    options: data.options || [],
    isDeleted: !!data.isDeleted || data.status === "deleted" || !!data.deleted,
    deleted: !!data.isDeleted || data.status === "deleted" || !!data.deleted,
    status: data.status || (data.isDeleted ? "deleted" : "active"),
    isAvailable: (data.isDeleted || data.status === "deleted" || data.deleted) ? false : (data.isAvailable !== false),
    displayOrder: resolvedOrder,
    order: resolvedOrder
  } as Product;
};

// Helper to extract or generate available weight/unit options for a product
export const getProductWeightOptions = (product: Product): ProductOption[] => {
  if (product.options && Array.isArray(product.options) && product.options.length > 0) {
    return product.options;
  }

  const basePrice = product.price || 0;
  const baseStock = typeof product.stock === "number" ? product.stock : 50;
  const unitEn = (product.unitEn || "").toLowerCase().trim();
  const unitBn = (product.unitBn || "").trim();

  const makeOpt = (value: number, unit: string, priceRatio: number, stock?: number): ProductOption => ({
    value,
    unit,
    price: Math.max(1, Math.round(basePrice * priceRatio)),
    stock: stock !== undefined ? stock : baseStock
  });

  const isKg = unitEn.includes("kg") || unitBn.includes("কেজি");
  const isG = unitEn.includes("g") || unitBn.includes("গ্রাম");

  if (isKg || isG) {
    let baseInKg = 1;
    if (unitEn.includes("500") || unitBn.includes("৫০০")) baseInKg = 0.5;
    else if (unitEn.includes("250") || unitBn.includes("২৫০")) baseInKg = 0.25;
    else if (unitEn.includes("1.5") || unitBn.includes("১.৫")) baseInKg = 1.5;
    else if (unitEn.includes("2") || unitBn.includes("২")) baseInKg = 2;
    else if (isG && !isKg) baseInKg = 0.5;

    return [
      makeOpt(250, "g", 0.25 / baseInKg),
      makeOpt(500, "g", 0.5 / baseInKg),
      makeOpt(1, "kg", 1 / baseInKg),
      makeOpt(1.5, "kg", 1.5 / baseInKg),
      makeOpt(2, "kg", 2 / baseInKg),
    ];
  }

  const isL = unitEn.includes("liter") || unitEn.includes("litre") || unitEn.includes(" l") || unitEn === "l" || unitBn.includes("লিটার");
  const isMl = unitEn.includes("ml") || unitBn.includes("মিলি");

  if (isL || isMl) {
    let baseInL = 1;
    if (unitEn.includes("500") || unitBn.includes("৫০০")) baseInL = 0.5;
    else if (unitEn.includes("250") || unitBn.includes("২৫০")) baseInL = 0.25;
    else if (unitEn.includes("2") || unitBn.includes("২")) baseInL = 2;

    return [
      makeOpt(250, "ml", 0.25 / baseInL),
      makeOpt(500, "ml", 0.5 / baseInL),
      makeOpt(1, "L", 1 / baseInL),
      makeOpt(2, "L", 2 / baseInL),
      makeOpt(5, "L", 5 / baseInL),
    ];
  }

  if (Array.isArray(product.weightSizeOptions) && product.weightSizeOptions.length > 1) {
    return product.weightSizeOptions.map((optStr) => {
      const match = optStr.match(/([\d.]+)\s*([a-zA-Z]+)/);
      if (match) {
        const val = parseFloat(match[1]);
        const u = match[2];
        return makeOpt(val, u, 1);
      }
      return makeOpt(1, optStr, 1);
    });
  }

  return [
    makeOpt(1, product.unitEn || "unit", 1, baseStock)
  ];
};

export const getOptionLabel = (opt: ProductOption, lang: "bn" | "en", fmtNum: (n: number | string) => string) => {
  let unitText = opt.unit;
  let valText = String(opt.value);
  if (lang === "bn") {
    valText = fmtNum(opt.value);
    if (opt.unit === "g") unitText = "গ্রাম";
    else if (opt.unit === "kg") unitText = "কেজি";
    else if (opt.unit === "ml") unitText = "মি.লি.";
    else if (opt.unit === "L") unitText = "লিটার";
    else if (opt.unit.toLowerCase() === "pc" || opt.unit.toLowerCase() === "pcs") unitText = "টি";
  }
  return `${valText} ${unitText} - ৳${fmtNum(opt.price)}`;
};

export const getWeightOnlyLabel = (opt: ProductOption, lang: "bn" | "en", fmtNum: (n: number | string) => string) => {
  let unitText = opt.unit;
  let valText = String(opt.value);
  if (lang === "bn") {
    valText = fmtNum(opt.value);
    if (opt.unit === "g") unitText = "গ্রাম";
    else if (opt.unit === "kg") unitText = "কেজি";
    else if (opt.unit === "ml") unitText = "মি.লি.";
    else if (opt.unit === "L") unitText = "লিটার";
    else if (opt.unit.toLowerCase() === "pc" || opt.unit.toLowerCase() === "pcs") unitText = "টি";
  }
  return `${valText} ${unitText}`;
};

export const calculateProductPriceForWeight = (
  product: Product,
  val: number,
  unit: string
): number => {
  if (typeof val !== "number" || isNaN(val) || val <= 0) {
    return product.price || 0;
  }
  const availableOptions = getProductWeightOptions(product);
  const normalizedUnit = (unit || "").toLowerCase().trim();

  // 1. Exact match in preconfigured options
  const exact = availableOptions.find(
    o => o.value === val && (
      o.unit.toLowerCase().trim() === normalizedUnit || 
      (normalizedUnit === "গ্রাম" && o.unit === "g") || 
      (normalizedUnit === "কেজি" && o.unit === "kg")
    )
  );
  if (exact) {
    return exact.price;
  }

  const basePrice = product.price || 0;
  const unitEn = (product.unitEn || "").toLowerCase().trim();
  const unitBn = (product.unitBn || "").trim();

  const isKg = normalizedUnit === "kg" || normalizedUnit === "কেজি";
  const isG = normalizedUnit === "g" || normalizedUnit === "গ্রাম";

  if (isKg || isG) {
    const valInKg = isKg ? val : val / 1000;
    
    // Check if 1kg option exists in available options
    const kgOpt = availableOptions.find(o => o.unit.toLowerCase() === "kg" && o.value === 1);
    let pricePerKg = kgOpt ? kgOpt.price : basePrice;

    if (!kgOpt) {
      let baseInKg = 1;
      if (unitEn.includes("500") || unitBn.includes("৫০০")) baseInKg = 0.5;
      else if (unitEn.includes("250") || unitBn.includes("২৫০")) baseInKg = 0.25;
      else if (unitEn.includes("1.5") || unitBn.includes("১.৫")) baseInKg = 1.5;
      else if (unitEn.includes("2") || unitBn.includes("২")) baseInKg = 2;
      else if (isG && !isKg) baseInKg = 0.5;
      pricePerKg = basePrice / baseInKg;
    }

    return Math.max(1, Math.round(pricePerKg * valInKg));
  }

  const isL = normalizedUnit === "l" || normalizedUnit === "liter" || normalizedUnit === "লিটার";
  const isMl = normalizedUnit === "ml" || normalizedUnit === "মি.লি." || normalizedUnit === "মিলি";

  if (isL || isMl) {
    const valInL = isL ? val : val / 1000;
    const lOpt = availableOptions.find(o => o.unit.toLowerCase() === "l" && o.value === 1);
    let pricePerL = lOpt ? lOpt.price : basePrice;

    if (!lOpt) {
      let baseInL = 1;
      if (unitEn.includes("500") || unitBn.includes("৫০০")) baseInL = 0.5;
      else if (unitEn.includes("250") || unitBn.includes("২৫০")) baseInL = 0.25;
      else if (unitEn.includes("2") || unitBn.includes("২")) baseInL = 2;
      pricePerL = basePrice / baseInL;
    }

    return Math.max(1, Math.round(pricePerL * valInL));
  }

  return Math.max(1, Math.round(basePrice * val));
};

export const validateWeightLimit = (
  value: number,
  _unit?: string
): { isValid: boolean; errorMsgBn?: string; errorMsgEn?: string } => {
  if (typeof value !== "number" || isNaN(value) || value <= 0) {
    return {
      isValid: false,
      errorMsgBn: "সঠিক ওজন বা পরিমাণ লিখুন",
      errorMsgEn: "Enter a valid weight or quantity"
    };
  }

  return { isValid: true };
};
