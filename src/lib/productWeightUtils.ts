import { Product, ProductOption } from "../types";

// Helper to translate numbers to Bangla script
export const toBnNum = (num: number | string): string => {
  const digits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num.toString().split("").map(char => {
    const p = parseInt(char, 10);
    return isNaN(p) ? char : digits[p];
  }).join("");
};

// Helper to map Firestore doc data to Product type
export const mapDocToProduct = (docId: string, data: any): Product => {
  return {
    id: data.id || docId,
    nameBn: data.nameBn,
    nameEn: data.nameEn,
    price: Number(data.price),
    originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
    unitBn: data.unitBn,
    unitEn: data.unitEn,
    category: data.category,
    image: data.image,
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
    sku: data.sku || `KB-${data.category?.substring(0, 3).toUpperCase()}-${data.id}`,
    subcategory: data.subcategory || "General",
    options: data.options || [],
    isDeleted: !!data.isDeleted || data.status === "deleted" || !!data.deleted,
    deleted: !!data.isDeleted || data.status === "deleted" || !!data.deleted,
    status: data.status || (data.isDeleted ? "deleted" : "active"),
    isAvailable: (data.isDeleted || data.status === "deleted" || data.deleted) ? false : (data.isAvailable !== false),
    displayOrder: typeof data.displayOrder === "number" ? data.displayOrder : (typeof data.order === "number" ? data.order : undefined),
    order: typeof data.order === "number" ? data.order : (typeof data.displayOrder === "number" ? data.displayOrder : undefined)
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
