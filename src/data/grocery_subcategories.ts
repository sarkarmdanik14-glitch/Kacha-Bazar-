/**
 * Customer-Friendly Subcategory Definitions for Groceries (মুদি পণ্য)
 * 6 Predefined Categories:
 * 1. চাল ও খাদ্যশস্য (Rice & Grains) - All Rice Varieties & Grain Staples
 * 2. ডাল ও ছোলা (Lentils & Pulses) - All Lentil, Pulse & Chola Varieties
 * 3. আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)
 * 4. তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)
 * 5. মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)
 * 6. রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)
 */

export const GROCERY_SECTIONS = [
  "চাল ও খাদ্যশস্য (Rice & Grains)",
  "ডাল ও ছোলা (Lentils & Pulses)",
  "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)",
  "তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)",
  "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)"
] as const;

/**
 * Checks if a product is any variety of Dal, Lentil, Chickpea or Pulse
 */
export const isDalOrPulseProduct = (product: { nameBn?: string; nameEn?: string; id?: string }): boolean => {
  const bn = product.nameBn || "";
  const en = (product.nameEn || "").toLowerCase();

  // Exclude cooked meals, snacks, personal care, chips, chanachur, sprays, meat, fish
  if (
    bn.includes("চিপস") ||
    bn.includes("চানাচুর") ||
    bn.includes("মাছ") ||
    bn.includes("মাংস") ||
    bn.includes("স্প্রে") ||
    bn.includes("ডালিম") ||
    bn.includes("পিৎজা") ||
    bn.includes("বার্গার") ||
    bn.includes("স্যান্ডউইচ") ||
    bn.includes("পাস্তা") ||
    bn.includes("হালিম মিক্স") ||
    bn.includes("বোরহানি") ||
    en.includes("chips") ||
    en.includes("chanachur") ||
    en.includes("spray")
  ) {
    return false;
  }

  // Any product with Dal or Pulse in Bengali name
  if (
    (bn.includes("ডাল") && !bn.includes("ডালিম")) ||
    bn.includes("ছোলা") ||
    bn.includes("মুগ") ||
    bn.includes("মসুর") ||
    bn.includes("খেসারি") ||
    bn.includes("মাসকলাই") ||
    bn.includes("মাষকলাই") ||
    bn.includes("মটর ডাল") ||
    bn.includes("বুটের ডাল") ||
    bn.includes("বুট ডাল") ||
    bn.includes("ছোলার ডাল") ||
    bn.includes("অড়হর") ||
    bn.includes("কাঁচা ছোলা")
  ) {
    return true;
  }

  // English fallback only if Bengali does not contradict (and not rice/spices/oils)
  if (
    !bn.includes("চাল") &&
    !bn.includes("মসলা") &&
    !bn.includes("তেল") &&
    (en.includes("dal") || en.includes("lentil") || en.includes("chickpea") || en.includes("pulse") || en.includes("chola") || en.includes("gram"))
  ) {
    return true;
  }

  return false;
};

/**
 * Checks if a product name indicates a rice or grain staple
 */
export const isRiceOrGrainProduct = (product: { nameBn?: string; nameEn?: string; id?: string }): boolean => {
  const bn = product.nameBn || "";
  const en = (product.nameEn || "").toLowerCase();

  // If name explicitly indicates spices, mixes, flours, lentils, oils, non-grocery or cooked items
  if (
    bn.includes("মসলা") ||
    bn.includes("মিক্স") ||
    bn.includes("আটা") ||
    bn.includes("ময়দা") ||
    bn.includes("সুজি") ||
    bn.includes("সেমাই") ||
    bn.includes("ডাল") ||
    bn.includes("ছোলা") ||
    bn.includes("মুগ") ||
    bn.includes("মসুর") ||
    bn.includes("খেসারি") ||
    bn.includes("মাসকলাই") ||
    bn.includes("মাষকলাই") ||
    bn.includes("তেল") ||
    bn.includes("লবণ") ||
    bn.includes("শুঁটকি") ||
    bn.includes("শুটকি") ||
    bn.includes("পিৎজা") ||
    bn.includes("বার্গার") ||
    bn.includes("স্যান্ডউইচ") ||
    bn.includes("পাস্তা") ||
    bn.includes("কফি") ||
    bn.includes("জুস") ||
    bn.includes("মিল্কশেক") ||
    bn.includes("মাছ") ||
    bn.includes("মাংস") ||
    bn.includes("পান") ||
    bn.includes("জর্দা") ||
    bn.includes("সুপারি")
  ) {
    return false;
  }

  // Any product with "চাল" in its Bengali name is 100% a Rice product
  if (bn.includes("চাল")) {
    return true;
  }

  // Other Rice & Grain products in groceries (Puffed rice, Flattened rice, Pop rice, grains)
  if (
    bn.includes("ধানের চিঁড়ে") ||
    bn.includes("চিঁড়ে") ||
    bn.includes("চিড়া") ||
    bn.includes("মুড়ি") ||
    bn.includes("মুড়ি") ||
    bn.includes("খই") ||
    bn.includes("রাইস") ||
    bn.includes("বাসমতি") ||
    bn.includes("মিনিকেট") ||
    bn.includes("নাজিরশাইল") ||
    bn.includes("কাটারিভোগ") ||
    bn.includes("চিনিগুঁড়া") ||
    bn.includes("চিনিগুড়া") ||
    bn.includes("কালিজিরা চাল") ||
    bn.includes("জিরাশাইল") ||
    bn.includes("আতপ") ||
    bn.includes("স্বর্ণা") ||
    bn.includes("বাংলামতি") ||
    bn.includes("BRRI") ||
    bn.includes("BR-28") ||
    bn.includes("BR-29") ||
    bn.includes("বিআর-২৮") ||
    bn.includes("বিআর-২৯") ||
    bn.includes("পোলাও চাল") ||
    bn.includes("পোলাওর চাল") ||
    bn.includes("বিরিয়ানি চাল") ||
    bn.includes("বিরিয়ানি চাল") ||
    bn.includes("লাল চাল")
  ) {
    return true;
  }

  // English fallback only if English specifically indicates rice/grain (and not dal/spice/oil)
  if (
    (en.includes("rice") || en.includes("basmati") || en.includes("chinigura") || en.includes("nazirshail") || en.includes("miniket") || en.includes("katari") || en.includes("chira") || en.includes("muri")) &&
    !en.includes("dal") && !en.includes("masala") && !en.includes("oil") && !en.includes("flour") && !en.includes("suji")
  ) {
    return true;
  }

  return false;
};

/**
 * Robustly resolves subcategory for grocery products:
 * Guarantees that ALL dal names belong to 'ডাল ও ছোলা (Lentils & Pulses)'
 * and ALL rice names belong to 'চাল ও খাদ্যশস্য (Rice & Grains)'
 */
export const getResolvedGrocerySubcategory = (
  id?: string,
  nameBn?: string,
  nameEn?: string,
  existingSub?: string,
  category?: string
): string => {
  const bn = nameBn || "";
  const en = (nameEn || "").toLowerCase();

  // 1. ALL DAL & PULSE VARIETIES -> ডাল ও ছোলা (Lentils & Pulses)
  // Absolute Priority for all dal, lentil, and pulse products
  if (isDalOrPulseProduct({ nameBn, nameEn, id })) {
    return "ডাল ও ছোলা (Lentils & Pulses)";
  }

  // 2. ALL RICE VARIETIES & GRAINS -> চাল ও খাদ্যশস্য (Rice & Grains)
  // Absolute Priority for all products with "চাল" or rice in groceries
  if (isRiceOrGrainProduct({ nameBn, nameEn, id })) {
    return "চাল ও খাদ্যশস্য (Rice & Grains)";
  }

  // 3. Ready Mix & Baking Spices (e.g. বিরিয়ানি মসলা, হালিম মিক্স, ফিরনি মিক্স, বেকিং পাউডার)
  if (
    (bn.includes("রেডি মসলা") ||
    bn.includes("মাংসের মসলা") ||
    bn.includes("মাছের মসলা") ||
    bn.includes("হালিম মিক্স") ||
    bn.includes("ফিরনি মিক্স") ||
    bn.includes("বোরহানি মিক্স") ||
    (bn.includes("বিরিয়ানি") && bn.includes("মসলা")) ||
    (bn.includes("বিরিয়ানি") && bn.includes("মসলা")) ||
    (bn.includes("বেকিং পাউডার") && !bn.includes("ডাল")) ||
    (bn.includes("বেকিং সোডা") && !bn.includes("ডাল")) ||
    bn.includes("কাস্টার্ড") ||
    bn.includes("জেলাটিন") ||
    en.includes("baking powder") ||
    en.includes("baking soda") ||
    en.includes("custard powder") ||
    en.includes("gelatine") ||
    en.includes("curry masala") ||
    en.includes("haleem mix") ||
    en.includes("kheer mix") ||
    en.includes("biryani masala") ||
    en.includes("borhani mix")) &&
    !bn.includes("ডাল") &&
    !bn.includes("ছোলা")
  ) {
    return "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)";
  }

  // 4. আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)
  if (
    bn.includes("আটা") ||
    bn.includes("ময়দা") ||
    bn.includes("সুজি") ||
    bn.includes("সেমাই") ||
    bn.includes("কর্ন ফ্লাওয়ার") ||
    bn.includes("কর্ন ফ্লাওয়ার") ||
    bn.includes("সাবুদানা") ||
    en.includes("flour") ||
    en.includes("atta") ||
    en.includes("maida") ||
    en.includes("suji") ||
    en.includes("semolina") ||
    en.includes("semai") ||
    en.includes("sago")
  ) {
    return "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)";
  }

  // 5. মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)
  if (
    bn.includes("সাদা ফল") ||
    bn.includes("সাদাফল") ||
    bn.includes("দারুচিনি") ||
    bn.includes("হলুদ") ||
    bn.includes("মরিচ") ||
    bn.includes("ধনে") ||
    bn.includes("জিরে") ||
    bn.includes("এলাচ") ||
    bn.includes("লবঙ্গ") ||
    bn.includes("গোল মরিচ") ||
    bn.includes("মেথি") ||
    bn.includes("কালোজিরা") ||
    bn.includes("জাফরান") ||
    bn.includes("তেজপাতা") ||
    bn.includes("পাঁচফোড়ন") ||
    bn.includes("পাঁচফোড়ন") ||
    bn.includes("মৌরি") ||
    bn.includes("জয়ফল") ||
    bn.includes("জয়ত্রী") ||
    bn.includes("তেঁতুল গুঁড়ো") ||
    bn.includes("মসলা") ||
    en.includes("white fruit") ||
    en.includes("turmeric") ||
    en.includes("chili") ||
    en.includes("coriander") ||
    en.includes("cumin") ||
    en.includes("cardamom") ||
    en.includes("cinnamon") ||
    en.includes("clove") ||
    en.includes("pepper") ||
    en.includes("spice")
  ) {
    return "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)";
  }

  // 6. তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)
  if (
    bn.includes("তেল") ||
    bn.includes("চিনি") ||
    bn.includes("লবণ") ||
    bn.includes("গুড়") ||
    bn.includes("গুড়") ||
    en.includes("oil") ||
    en.includes("sugar") ||
    en.includes("salt") ||
    en.includes("gur") ||
    en.includes("molasses")
  ) {
    return "তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)";
  }

  // Fallback to static mapping if defined
  if (id && GROCERY_SUBCATEGORY_MAP[id]) {
    return GROCERY_SUBCATEGORY_MAP[id];
  }

  if (existingSub && (GROCERY_SECTIONS as readonly string[]).includes(existingSub as any)) {
    return existingSub;
  }

  return existingSub || "General";
};

/**
 * Calculates display order within Groceries so items are logically grouped:
 * 1-25: চাল ও খাদ্যশস্য (Rice & Grains)
 * 26-45: ডাল ও ছোলা (Lentils & Pulses)
 * 46-65: আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)
 * 66-85: তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)
 * 86-120: মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)
 * 121-140: রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)
 */
export const getResolvedGroceryDisplayOrder = (
  id?: string,
  nameBn?: string,
  nameEn?: string,
  resolvedSub?: string,
  existingOrder?: number
): number => {
  const sub = resolvedSub || getResolvedGrocerySubcategory(id, nameBn, nameEn);
  const bn = nameBn || "";

  if (sub === "চাল ও খাদ্যশস্য (Rice & Grains)") {
    if (bn.includes("চিনিগুঁড়া") || bn.includes("চিনিগুড়া")) return 1;
    if (bn.includes("কালিজিরা")) return 2;
    if (bn.includes("কাটারিভোগ")) return 3;
    if (bn.includes("বাসমতি")) return 4;
    if (bn.includes("বিরিয়ানি চাল") || bn.includes("বিরিয়ানি চাল")) return 5;
    if (bn.includes("মিনিকেট")) return 6;
    if (bn.includes("নাজিরশাইল")) return 7;
    if (bn.includes("বিআর-২৮") || bn.includes("BRRI-28") || bn.includes("BR-28")) return 8;
    if (bn.includes("বিআর-২৯") || bn.includes("BRRI-29") || bn.includes("BR-29")) return 9;
    if (bn.includes("বাংলামতি")) return 10;
    if (bn.includes("স্বর্ণা")) return 11;
    if (bn.includes("জিরাশাইল")) return 12;
    if (bn.includes("পাইজাম")) return 13;
    if (bn.includes("আতপ")) return 14;
    if (bn.includes("লাল চাল") || bn.includes("ঢেঁকি ছাঁটা")) return 15;
    if (bn.includes("চিঁড়ে") || bn.includes("চিড়া")) return 16;
    if (bn.includes("মুড়ি") || bn.includes("মুড়ি")) return 17;
    if (bn.includes("খই")) return 18;
    return 19;
  }

  if (sub === "ডাল ও ছোলা (Lentils & Pulses)") {
    if (bn.includes("মসুর")) return 26;
    if (bn.includes("মুগ")) return 27;
    if (bn.includes("বুট") || bn.includes("ছোলার ডাল")) return 28;
    if (bn.includes("ছোলা")) return 29;
    if (bn.includes("মাসকলাই") || bn.includes("মাষকলাই")) return 30;
    if (bn.includes("খেসারি")) return 31;
    if (bn.includes("মটর")) return 32;
    return 33;
  }

  if (sub === "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)") {
    if (bn.includes("আটা")) return 46;
    if (bn.includes("ময়দা")) return 47;
    if (bn.includes("সুজি")) return 48;
    if (bn.includes("সেমাই")) return 49;
    if (bn.includes("কর্ন ফ্লাওয়ার") || bn.includes("কর্ন ফ্লাওয়ার")) return 50;
    if (bn.includes("সাবুদানা")) return 51;
    return 55;
  }

  if (sub === "তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)") {
    if (bn.includes("সরিষার তেল")) return 66;
    if (bn.includes("সয়াবিন")) return 67;
    if (bn.includes("তেল")) return 68;
    if (bn.includes("লবণ")) return 69;
    if (bn.includes("চিনি")) return 70;
    if (bn.includes("গুড়") || bn.includes("গুড়")) return 71;
    return 75;
  }

  if (sub === "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)") {
    if (bn.includes("সাদা ফল") || bn.includes("সাদাফল") || id === "prod_mu48bsvj") {
      return 101;
    }
    if (id && GROCERY_ORDER_MAP[id] !== undefined && GROCERY_ORDER_MAP[id] >= 86 && GROCERY_ORDER_MAP[id] <= 120) {
      return GROCERY_ORDER_MAP[id];
    }
    return (existingOrder && existingOrder >= 86 && existingOrder <= 120) ? existingOrder : 90;
  }

  if (sub === "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)") {
    if (id && GROCERY_ORDER_MAP[id] !== undefined && GROCERY_ORDER_MAP[id] >= 121) {
      return GROCERY_ORDER_MAP[id];
    }
    return (existingOrder && existingOrder >= 121) ? existingOrder : 125;
  }

  return typeof existingOrder === "number" ? existingOrder : 999;
};

export const GROCERY_SUBCATEGORY_MAP: Record<string, string> = {
  // 1. চাল ও খাদ্যশস্য (Rice & Grains)
  st1: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st2: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st4: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st5: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st6: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st10: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st11: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st12: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st13: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st14: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st15: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st16: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st17: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st18: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st19: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st20: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st21: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st22: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st31: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st32: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st33: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st34: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st35: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st36: "চাল ও খাদ্যশস্য (Rice & Grains)",
  st37: "চাল ও খাদ্যশস্য (Rice & Grains)",

  // 2. ডাল ও ছোলা (Lentils & Pulses)
  st3: "ডাল ও ছোলা (Lentils & Pulses)",
  st9: "ডাল ও ছোলা (Lentils & Pulses)",
  st23: "ডাল ও ছোলা (Lentils & Pulses)",
  st24: "ডাল ও ছোলা (Lentils & Pulses)",
  st25: "ডাল ও ছোলা (Lentils & Pulses)",
  st26: "ডাল ও ছোলা (Lentils & Pulses)",
  st27: "ডাল ও ছোলা (Lentils & Pulses)",
  st28: "ডাল ও ছোলা (Lentils & Pulses)",
  st29: "ডাল ও ছোলা (Lentils & Pulses)",
  st30: "ডাল ও ছোলা (Lentils & Pulses)",

  // 3. আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)
  st7: "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)",
  st8: "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)",
  prod_mu3pet9f: "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)",
  prod_mu3pfvvy: "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)",
  prod_mu3ph2pf: "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)",
  prod_mu46cyyw: "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)",
  prod_mu46i9hf: "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)",
  prod_mu46yoel: "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)",
  prod_mu46fvc8: "আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples)",

  // 4. তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)
  prod_mu17xixi: "তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)",
  prod_mu17yoy9: "তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)",
  prod_mu17znmw: "তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)",
  prod_mu18aytx: "তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)",
  prod_mu18ej5a: "তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)",
  prod_mu3pdi8g: "তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials)",

  // 5. মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)
  sp1: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp2: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp3: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp4: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp5: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp6: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp7: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp8: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp9: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp10: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp11: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp12: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp18: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp19: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp20: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp21: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp22: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp23: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp24: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp25: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  sp30: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",
  prod_mu48bsvj: "মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs)",

  // 6. রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)
  sp13: "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)",
  sp14: "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)",
  sp15: "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)",
  sp16: "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)",
  sp17: "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)",
  sp26: "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)",
  sp27: "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)",
  sp28: "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)",
  sp29: "রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items)"
};

export const GROCERY_ORDER_MAP: Record<string, number> = {
  // Category 1: চাল ও খাদ্যশস্য (Rice & Grains) - 1 to 25
  st1: 1,
  st31: 2,
  st15: 3,
  st17: 4,
  st5: 5,
  st16: 6,
  st6: 7,
  st21: 8,
  st36: 9,
  st22: 10,
  st4: 11,
  st10: 12,
  st2: 13,
  st11: 14,
  st12: 15,
  st32: 16,
  st33: 17,
  st14: 18,
  st13: 19,
  st37: 20,
  st18: 21,
  st34: 22,
  st19: 23,
  st35: 24,
  st20: 25,

  // Category 2: ডাল ও ছোলা (Lentils & Pulses) - 26 to 45
  st3: 26,
  st23: 26,
  st9: 27,
  st24: 27,
  st25: 28,
  st27: 28,
  st26: 30,
  st30: 30,
  st28: 31,
  st29: 32,

  // Category 3: আটা, ময়দা ও নাস্তার শুকনা খাবার (Flour & Breakfast Staples) - 50 to 65
  st7: 50,
  st8: 51,
  prod_mu3pfvvy: 52,
  prod_mu46i9hf: 53,
  prod_mu3ph2pf: 54,
  prod_mu46cyyw: 55,
  prod_mu3pet9f: 56,
  prod_mu46yoel: 57,
  prod_mu46fvc8: 58,

  // Category 4: তেল, চিনি, লবণ ও গুড় (Oil, Sugar & Basic Essentials) - 70 to 85
  prod_mu17yoy9: 70,
  prod_mu17xixi: 71,
  prod_mu17znmw: 72,
  prod_mu18aytx: 73,
  prod_mu18ej5a: 74,
  prod_mu3pdi8g: 75,

  // Category 5: মসলাপাতি — আস্ত ও গুঁড়ো (Spices & Herbs) - 90 to 115
  sp1: 90,
  sp2: 91,
  sp3: 92,
  sp4: 93,
  sp5: 94,
  sp6: 95,
  sp7: 96,
  sp8: 97,
  sp9: 98,
  sp10: 99,
  sp11: 100,
  prod_mu48bsvj: 101,
  sp12: 101,
  sp18: 102,
  sp19: 103,
  sp20: 104,
  sp21: 105,
  sp22: 106,
  sp23: 107,
  sp24: 108,
  sp25: 109,
  sp30: 110,

  // Category 6: রেডি মসলা ও বেকিং আইটেম (Ready Mix & Baking Items) - 120 to 135
  sp13: 120,
  sp14: 121,
  sp15: 122,
  sp16: 123,
  sp17: 124,
  sp26: 125,
  sp27: 126,
  sp28: 127,
  sp29: 128
};
