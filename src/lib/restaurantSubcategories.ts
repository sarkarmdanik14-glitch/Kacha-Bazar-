export interface RestaurantSubcategoryDef {
  id: string;
  nameBn: string;
  nameEn: string;
  iconEmoji: string;
  badgeColor?: string;
  order: number;
}

export const RESTAURANT_SUBCATEGORIES: RestaurantSubcategoryDef[] = [
  {
    id: "biryani-rice",
    nameBn: "বিরিয়ানি, পোলাও ও রাইস",
    nameEn: "Biryani, Polao & Rice",
    iconEmoji: "🍲",
    order: 1
  },
  {
    id: "burger-sandwich-shawarma",
    nameBn: "বার্গার, স্যান্ডউইচ ও শাওয়ার্মা",
    nameEn: "Burger, Sandwich & Shawarma",
    iconEmoji: "🍔",
    order: 2
  },
  {
    id: "pizza-pasta-chowmein",
    nameBn: "পিজ্জা, পাস্তা ও চাউমিন",
    nameEn: "Pizza, Pasta & Chowmein",
    iconEmoji: "🍕",
    order: 3
  },
  {
    id: "fried-chicken-wings",
    nameBn: "চিকেন ফ্রাই, উইংস ও ললিপপ",
    nameEn: "Fried Chicken, Wings & Lollipops",
    iconEmoji: "🍗",
    order: 4
  },
  {
    id: "grill-sizzling-kabab",
    nameBn: "গ্রিল, সিজলিং ও কাবাব",
    nameEn: "Grill, Sizzling & Kabab",
    iconEmoji: "🍢",
    order: 5
  },
  {
    id: "appetizers-fastfood-soup",
    nameBn: "অ্যাপেটাইজার, ফাস্ট ফুড ও স্যুপ",
    nameEn: "Snacks, Soup & Salad",
    iconEmoji: "🍟",
    order: 6
  },
  {
    id: "curry-chinese",
    nameBn: "দেশি তরকারি ও চাইনিজ ডিশ",
    nameEn: "Curry & Chinese Dishes",
    iconEmoji: "🍛",
    order: 7
  },
  {
    id: "naan-roti-halim",
    nameBn: "নান, রুটি, পরোটা ও হালিম",
    nameEn: "Naan, Roti & Halim",
    iconEmoji: "🫓",
    order: 8
  },
  {
    id: "drinks-juice-sweets",
    nameBn: "পানীয়, জুস ও মিষ্টি",
    nameEn: "Drinks, Juice & Sweets",
    iconEmoji: "🥤",
    order: 9
  }
];

export const RESTAURANT_SUBCATEGORY_NAMES_BN = RESTAURANT_SUBCATEGORIES.map(s => s.nameBn);

function normalizeBn(s: string): string {
  return (s || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/য়|য়/g, "য়")
    .replace(/ড়|ড়/g, "ড়")
    .replace(/ঢ়|ঢ়/g, "ঢ়")
    .trim()
    .toLowerCase();
}

/**
 * Verified mapping dictionary of all restaurant products to their exact 9 standardized subcategories.
 */
const CANONICAL_ITEMS_MAPPING: Record<string, string[]> = {
  "বিরিয়ানি, পোলাও ও রাইস": [
    "বাসমতি খাসির কাচ্চি (ডিমসহ)", "মাটন কাচ্চি", "মুরগির বিরিয়ানী (ফুল/হাফ)", "মুরগির বিরিয়ানী (হাফ)", "মুরগির বিরিয়ানী (ফুল)",
    "মুরগির বিরিয়ানী", "মাটন বিরিয়ানি", "মাটন বিরিয়ানি", "চিকেন দম বিরিয়ানী (বাসমতি)", "শাহী মোরগ পোলাও (ডিমসহ)", "মোরগ পোলাও",
    "ডিম পোলাও (ফুল/হাফ)", "ডিম পোলাও (হাফ)", "ডিম পোলাও (ফুল)", "খাসির তেহেরী (ফুল/হাফ)", "খাসির তেহেরী (ফুল)", "খাসির তেহেরী (হাফ)",
    "তেহেরী", "ভুনা খিচুড়ি (ডিম হাফ)", "খিচুরী", "ভাত (Steamed Rice)", "ভাত", "বিরানী", "কিং স্পেশাল ফ্রাইড রাইস",
    "চিকেন ফ্রাইড রাইস", "এগ ফ্রাইড রাইস", "মেক্সিকান ফ্রাইড রাইস",
    "SET MENU-1 (500/-)", "SET MENU-2 (320/-)", "SET MENU-3 (280/-)", "SET MENU-4 (190/-)", "SET MENU-5 (300/-)", "SET MENU-6 (150/-)"
  ],
  "বার্গার, স্যান্ডউইচ ও শাওয়ার্মা": [
    "রেগুলার চিকেন বার্গার", "ক্রিসপি চিকেন চিজ বার্গার", "নাগা চিকেন চিজ বার্গার", "বারবিকিউ চিকেন চিজ বার্গার", "ডাবল লেয়ার চিজ বার্গার",
    "ডাবল লেয়ার চিজ বার্গার", "কিং স্পেশাল স্যান্ডউইচ", "ক্লাব স্যান্ডউইচ", "গ্রিল চিজি সাব-স্যান্ডউইচ", "চিকেন স্যান্ডউইচ",
    "গ্রিল চিকেন চিজ স্যান্ডউইচ", "ক্লাসিক চিকেন শাওয়ার্মা", "বারবিকিউ চিকেন শাওয়ার্মা", "নাগা চিকেন শাওয়ার্মা", "চিকেন শাওয়ার্মা"
  ],
  "পিজ্জা, পাস্তা ও চাউমিন": [
    "কিং স্পেশাল পিৎজা", "মিট লাভার পিৎজা", "বারবিকিউ স্মোকি পিৎজা", "চিকেন সসেজ পিৎজা", "মেক্সিকান হট অ্যান্ড স্পাইসি পিৎজা",
    "কিং স্পেশাল পাস্তা", "ওভেন বেকড পাস্তা", "ক্রিমি পাস্তা", "নাগা পাস্তা", "চিকেন পাস্তা", "কিং স্পেশাল চাউমিন", "চিকেন চাউমিন",
    "এগ চাউমিন", "চিকেন স্পাইসি চাউমিন", "মিক্সড চাউমিন"
  ],
  "চিকেন ফ্রাই, উইংস ও ললিপপ": [
    "থাই ফ্রাইড চিকেন (৬ পিস)", "থাই ফ্রাইড চিকেন ফ্যামিলি প্ল্যাটার (১২ পিস)", "ক্রিসপি চিকেন (৬ পিস)", "ফ্রাইড চিকেন উইথ ফ্রেঞ্চ ফ্রাই",
    "নাগা চিকেন উইংস (৬ পিস)", "ক্রিসপি চিকেন উইংস (৪ পিস)", "ক্রিসপি বাফেলো চিকেন উইংস (৬ পিস)", "ক্রিসপি চিকেন ললিপপ (৫ পিস)", "নাগা চিকেন ললিপপ (৬ পিস)"
  ],
  "গ্রিল, সিজলিং ও কাবাব": [
    "গ্রিল চিকেন", "গ্রীল ফুল সাইজ", "গ্রীল", "চাপ কোয়ার্টার", "চাপ কোয়ার্টার", "মসলা চিকেন চাপ", "চিকেন সিজলিং", "মাটন সিজলিং", "প্রন সিজলিং"
  ],
  "অ্যাপেটাইজার, ফাস্ট ফুড ও স্যুপ": [
    "ফ্রেঞ্চ ফ্রাই", "চিজি ফ্রেঞ্চ ফ্রাই", "পটেটো ওয়েজেস", "পটেটো ওয়েজেস", "রেগুলার নাচোস", "চিজি নাচোস",
    "ওয়ানথন (৪ পিস / ৮ পিস)", "ওয়ানথন (৪ পিস / ৮ পিস)", "স্পেশাল ওয়ানথন (৪ পিস / ৮ পিস)", "স্পেশাল ওয়ানথন (৪ পিস / ৮ পিস)",
    "ভেজিটেবল কাটলেট (১ পিস)", "চিকেন কাটলেট (৮ পিস)", "ফিশ ফিঙ্গার (৮ পিস)", "কিং স্পেশাল মিট বক্স", "মিট লাভার মিট বক্স",
    "নাগা চিকেন মিট বক্স", "বারবিকিউ চিকেন মিট বক্স", "কিংস স্পেশাল থাই স্যুপ", "থাই স্যুপ", "চিকেন কর্ন স্যুপ",
    "চিকেন হট অ্যান্ড সাওয়ার স্যুপ", "চিকেন হট অ্যান্ড সাওয়ার স্যুপ", "ক্রিম অফ মাশরুম স্যুপ", "চিকেন কাজুবাদাম সালাদ", "রায়তা সালাদ", "রায়তা সালাদ"
  ],
  "দেশি তরকারি ও চাইনিজ ডিশ": [
    "খাসির মাংস কারি", "খাসির মাংস", "মুরগীর মাংস কারি", "মুরগীর মাংস", "রুই মাছ (বড়)", "রুই মাছ (বড়)", "ছোট মাছ", "শুটকি মাছ",
    "ডিম (রান্না)", "ডিম ভাজা", "সবজি", "ডাউল", "সুইট অ্যান্ড সাওয়ার কারি", "সুইট অ্যান্ড সাওয়ার কারি", "চিকেন মসলা কারি",
    "চিকেন চিলি অনিয়ন", "চিকেন চিলি অনিয়ন", "প্রন মসলা", "প্রন চিলি অনিয়ন", "প্রন চিলি অনিয়ন", "প্রন গার্লিক",
    "প্রন সুইট অ্যান্ড সাওয়ার", "প্রন সুইট অ্যান্ড সাওয়ার", "মিক্সড ভেজিটেবল", "চিকেন মিক্স ভেজিটেবল", "সতে ভেজিটেবল"
  ],
  "নান, রুটি, পরোটা ও হালিম": [
    "প্লেন নান", "বাটার নান", "গার্লিক নান", "কাশ্মিরী নান", "নান", "তাান্দুরি", "তন্দুর রুটি", "রুটি", "পরোটা",
    "মোগলাই", "হাফ মোগলাই", "সিঙ্গারা", "ডিমের চপ", "শাহী হালিম"
  ],
  "পানীয়, জুস ও মিষ্টি": [
    "বোরহানী (১ লিটার, হাফ লিটার, প্রতি গ্লাস)", "বোরহানী (১ লিটার)", "বোরহানী (হাফ লিটার)", "বোরহানী (গ্লাস)",
    "ঘোল", "স্পেশাল লাচ্ছি", "রেগুলার হট কফি", "ব্ল্যাক কফি", "কোল্ড কফি", "চকলেট কোল্ড কফি", "ভ্যানিলা মিল্কশেক",
    "চকলেট মিল্কশেক", "স্ট্রবেরি মিল্কশেক", "ম্যাঙ্গো মিল্কশেক", "এনার্জি মিল্কশেক", "মিক্সড ফ্রুট জুস", "সিজনাল ফ্রুট জুস",
    "সিজনাল ফ্রুট জুস (আম, পেঁপে, তরমুজ, আনারস, ড্রাগন, স্ট্রবেরি)", "অরেঞ্জ জুস", "ফ্রেশ লেমন জুস", "ফ্রেশ লেমন মিন্ট",
    "সাদা মিষ্টি", "চমচম (ক্ষির মাখানো)", "দুধিয়া সন্দেশ", "দুধিয়া সন্দেশ", "কালো জাম", "বাদশা ভোগ", "মালাই",
    "দই বড় সাইজ", "দই বড় সাইজ", "দই সাড়া", "দই সাড়া", "স্পেশাল দই বড় সাইজ", "স্পেশাল দই বড় সাইজ"
  ]
};

/**
 * Intelligent resolver for restaurant products into one of the exactly 9 standardized subcategories.
 */
export function getResolvedRestaurantSubcategory(product: any): string {
  if (!product) return "বিরিয়ানি, পোলাও ও রাইস";

  const rawSub = (product.subcategory || product.subCategory || "").trim();
  const rawSubId = (product.subcategoryId || product.subCategoryId || "").trim();

  // 1. HIGHEST PRIORITY: If an admin explicitly set or selected one of the 9 subcategories, honor it immediately!
  if (rawSub || rawSubId) {
    const rawSubLower = rawSub.toLowerCase();
    const rawSubIdLower = rawSubId.toLowerCase();
    const explicitMatch = RESTAURANT_SUBCATEGORIES.find(
      s => s.nameBn.toLowerCase() === rawSubLower ||
           s.nameEn.toLowerCase() === rawSubLower ||
           s.id.toLowerCase() === rawSubIdLower ||
           rawSubIdLower.includes(s.id.toLowerCase())
    );
    if (explicitMatch) {
      return explicitMatch.nameBn;
    }
  }

  const bn = (product.nameBn || "").trim();
  const normBn = normalizeBn(bn);

  // 2. PASS 1: Exact product title match against canonical dictionary
  for (const [catName, items] of Object.entries(CANONICAL_ITEMS_MAPPING)) {
    for (const item of items) {
      if (normBn === normalizeBn(item)) {
        return catName;
      }
    }
  }

  // 3. PASS 2: Product title contains canonical item
  for (const [catName, items] of Object.entries(CANONICAL_ITEMS_MAPPING)) {
    for (const item of items) {
      if (normBn.includes(normalizeBn(item))) {
        return catName;
      }
    }
  }

  // 4. KEYWORD-BASED FALLBACK RESOLVER
  const en = (product.nameEn || "").toLowerCase();
  const combined = `${normBn} ${en}`;

  // Drinks & Sweets
  if (
    combined.includes("বোরহানী") || combined.includes("borhani") ||
    combined.includes("ঘোল") || combined.includes("ghol") ||
    combined.includes("লাচ্ছি") || combined.includes("লাসি") || combined.includes("lacchi") || combined.includes("lassi") ||
    combined.includes("কফি") || combined.includes("coffee") ||
    combined.includes("মিল্কশেক") || combined.includes("milkshake") ||
    combined.includes("জুস") || combined.includes("juice") ||
    combined.includes("লেমন") || combined.includes("lemon") ||
    combined.includes("স্মুদি") || combined.includes("smoothie") ||
    combined.includes("মিষ্টি") || combined.includes("sweet") ||
    combined.includes("চমচম") || combined.includes("chomchom") ||
    combined.includes("সন্দেশ") || combined.includes("sandesh") ||
    combined.includes("কালো জাম") || combined.includes("kalo jam") ||
    combined.includes("বাদশা ভোগ") ||
    combined.includes("মালাই") || combined.includes("malai") ||
    combined.includes("দই") || combined.includes("doi") || combined.includes("curd") ||
    combined.includes("রসগোল্লা") || combined.includes("rasgulla") ||
    combined.includes("আইসক্রিম") || combined.includes("ice cream")
  ) {
    return "পানীয়, জুস ও মিষ্টি";
  }

  // Grill, Sizzling & Kabab
  if (
    combined.includes("সিজলিং") || combined.includes("sizzling") ||
    combined.includes("গ্রিল") || combined.includes("গ্রীল") || combined.includes("grill") ||
    combined.includes("চাপ") || combined.includes("chaap") || combined.includes("chap") ||
    combined.includes("কাবাব") || combined.includes("kabab") || combined.includes("kebab") ||
    combined.includes("তিক্কা") || combined.includes("tikka")
  ) {
    return "গ্রিল, সিজলিং ও কাবাব";
  }

  // Fried Chicken, Wings & Lollipops
  if (
    combined.includes("উইংস") || combined.includes("wings") ||
    combined.includes("ললিপপ") || combined.includes("lollipop") ||
    combined.includes("ফ্রাইড চিকেন") || combined.includes("fried chicken") ||
    combined.includes("চিকেন ফ্রাই") || combined.includes("chicken fry") ||
    combined.includes("ক্রিসপি চিকেন") || combined.includes("crispy chicken") ||
    combined.includes("বাফেলো") || combined.includes("buffalo")
  ) {
    return "চিকেন ফ্রাই, উইংস ও ললিপপ";
  }

  // Burger, Sandwich & Shawarma
  if (
    combined.includes("বার্গার") || combined.includes("burger") ||
    combined.includes("স্যান্ডউইচ") || combined.includes("sandwich") ||
    combined.includes("শাওয়ার্মা") || combined.includes("shawarma") ||
    combined.includes("sub-sandwich")
  ) {
    return "বার্গার, স্যান্ডউইচ ও শাওয়ার্মা";
  }

  // Pizza, Pasta & Chowmein
  if (
    combined.includes("পিজ্জা") || combined.includes("পিৎজা") || combined.includes("pizza") ||
    combined.includes("পাস্তা") || combined.includes("pasta") ||
    combined.includes("চাউমিন") || combined.includes("chowmein") ||
    combined.includes("নুডলস") || combined.includes("noodles")
  ) {
    return "পিজ্জা, পাস্তা ও চাউমিন";
  }

  // Naan, Roti, Paratha & Halim
  if (
    combined.includes("নান") || combined.includes("naan") ||
    combined.includes("তন্দুর") || combined.includes("tandoor") ||
    combined.includes("রুটি") || combined.includes("roti") ||
    combined.includes("পরোটা") || combined.includes("paratha") ||
    combined.includes("মোগলাই") || combined.includes("mughlai") ||
    combined.includes("সিঙ্গারা") || combined.includes("singara") ||
    combined.includes("হালিম") || combined.includes("halim") ||
    combined.includes("ডিমের চপ") || combined.includes("egg chop")
  ) {
    return "নান, রুটি, পরোটা ও হালিম";
  }

  // Appetizers, Fast Food & Soup
  if (
    combined.includes("ফ্রেঞ্চ ফ্রাই") || combined.includes("french fry") ||
    combined.includes("ওয়েজেস") || combined.includes("wedges") ||
    combined.includes("নাচোস") || combined.includes("nachos") ||
    combined.includes("ওয়ানথন") || combined.includes("wonton") ||
    combined.includes("কাটলেট") || combined.includes("cutlet") ||
    combined.includes("ফিঙ্গার") || combined.includes("finger") ||
    combined.includes("মিট বক্স") || combined.includes("meat box") ||
    combined.includes("স্যুপ") || combined.includes("soup") ||
    combined.includes("সালাদ") || combined.includes("salad")
  ) {
    return "অ্যাপেটাইজার, ফাস্ট ফুড ও স্যুপ";
  }

  // Curry & Chinese Dishes
  if (
    combined.includes("কারি") || combined.includes("curry") ||
    combined.includes("মাছ") || combined.includes("fish") ||
    combined.includes("ডিম") || combined.includes("egg") ||
    combined.includes("সবজি") || combined.includes("vegetable") ||
    combined.includes("ডাউল") || combined.includes("daal") ||
    combined.includes("প্রন") || combined.includes("prawn") ||
    combined.includes("চিলি") || combined.includes("chili") ||
    combined.includes("অনিয়ন") || combined.includes("onion") ||
    combined.includes("গার্লিক") || combined.includes("garlic") ||
    combined.includes("সতে") || combined.includes("saute") ||
    combined.includes("সুইট অ্যান্ড সাওয়ার") || combined.includes("sweet & sour") ||
    combined.includes("মাংস") || combined.includes("meat") ||
    combined.includes("বিফ") || combined.includes("beef") ||
    combined.includes("মাটন") || combined.includes("mutton")
  ) {
    return "দেশি তরকারি ও চাইনিজ ডিশ";
  }

  // Biryani, Polao & Rice
  if (
    combined.includes("সেট মেনু") || combined.includes("set menu") ||
    combined.includes("কাচ্চি") || combined.includes("kacchi") ||
    combined.includes("পোলাও") || combined.includes("polao") ||
    combined.includes("বিরিয়ানি") || combined.includes("biryani") ||
    combined.includes("তেহেরী") || combined.includes("tehari") ||
    combined.includes("খিচুড়ি") || combined.includes("khichuri") ||
    combined.includes("ফ্রাইড রাইস") || combined.includes("fried rice") ||
    combined.includes("ভাত") || combined.includes("rice")
  ) {
    return "বিরিয়ানি, পোলাও ও রাইস";
  }

  return "বিরিয়ানি, পোলাও ও রাইস";
}

/**
 * Checks whether a restaurant product matches a target subcategory filter (by Bn name, En name, or ID).
 */
export function matchesRestaurantSubcategory(product: any, targetSub: string): boolean {
  if (!targetSub || targetSub === "all") return true;

  const targetNorm = targetSub.toLowerCase().trim();
  const resolvedBn = getResolvedRestaurantSubcategory(product);

  const subObj = RESTAURANT_SUBCATEGORIES.find(
    s => s.id.toLowerCase() === targetNorm || s.nameBn.toLowerCase() === targetNorm || s.nameEn.toLowerCase() === targetNorm
  );

  if (subObj) {
    return resolvedBn.toLowerCase() === subObj.nameBn.toLowerCase();
  }

  return resolvedBn.toLowerCase() === targetNorm;
}
