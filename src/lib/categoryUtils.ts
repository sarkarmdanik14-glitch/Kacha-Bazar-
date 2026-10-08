import { Category } from "../types";
export const isAllowedPanSupariProduct = (_product?: any): boolean => true;

/**
 * Merged Grocery Category Definition
 * Combines "চাল ও ডাল" (staples) and "মসলা ও রান্নার তেল" (spices-oils) into "মুদি পণ্য" (groceries).
 */
export const MERGED_GROCERY_CATEGORY: Category = {
  id: "groceries",
  nameBn: "মুদি পণ্য",
  nameEn: "Groceries",
  iconName: "Wheat",
  colorClass: "bg-amber-50 text-amber-800 hover:bg-amber-100",
  borderColor: "border-amber-100",
  displayOrder: 2,
  order: 2,
  image: "https://res.cloudinary.com/upvkzb3p/image/upload/v1784818982/aisure-2f9b0144-2a3f-4bf8-ac23-9bb0efcf7756_r428ci.webp",
  imageUrl: "https://res.cloudinary.com/upvkzb3p/image/upload/v1784818982/aisure-2f9b0144-2a3f-4bf8-ac23-9bb0efcf7756_r428ci.webp",
  isAvailable: true
};

/**
 * Restaurant Category Definition
 * Serial #3 in the category list.
 */
export const RESTAURANT_CATEGORY: Category = {
  id: "bakery-sweets",
  nameBn: "রেস্টুরেন্ট",
  nameEn: "Restaurant",
  iconName: "Utensils",
  colorClass: "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100",
  borderColor: "border-fuchsia-100",
  displayOrder: 3,
  order: 3,
  isAvailable: true
};

/**
 * Merged Confectionery Category Definition
 * Combines "কনফেকশনারি" (snacks-biscuits) and "কোমল পানীয় ও জুস" (beverages) into "কনফেকশনারি" (Confectionery).
 * Serial #5 in the category list.
 */
export const MERGED_CONFECTIONERY_CATEGORY: Category = {
  id: "snacks-biscuits",
  nameBn: "কনফেকশনারি",
  nameEn: "Confectionery",
  iconName: "Cookie",
  colorClass: "bg-pink-50 text-pink-700 hover:bg-pink-100",
  borderColor: "border-pink-100",
  displayOrder: 5,
  order: 5,
  isAvailable: true
};

/**
 * Pharmacy Category Definition
 * Replaces "শিশুর যত্ন ও ডায়াপার" with "ফার্মেসি (Pharmacy)".
 * Serial #12 in the category list.
 */
export const PHARMACY_CATEGORY: Category = {
  id: "pharmacy",
  nameBn: "ফার্মেসি",
  nameEn: "Pharmacy",
  iconName: "Pill",
  colorClass: "bg-teal-50 text-teal-700 hover:bg-teal-100",
  borderColor: "border-teal-100",
  displayOrder: 12,
  order: 12,
  isAvailable: true
};

/**
 * Vehicles Category Definition
 * Rental services: Ambulance, Microbus, Bus, Easy Bike, Van, CNG, Pickup truck, etc.
 * Serial #17 in the category list.
 */
export const VEHICLES_CATEGORY: Category = {
  id: "vehicles",
  nameBn: "যানবাহন",
  nameEn: "Vehicles & Transport",
  iconName: "Truck",
  colorClass: "bg-blue-50 text-blue-700 hover:bg-blue-100",
  borderColor: "border-blue-100",
  displayOrder: 17,
  order: 17,
  image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80",
  imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80",
  isAvailable: true
};

/**
 * Mobile Zone Category Definition
 * Official smartphones: Vivo, Redmi, Infinix
 * Serial #18 in the category list.
 */
export const MOBILE_ZONE_CATEGORY: Category = {
  id: "mobile-zone",
  nameBn: "মোবাইল জোন",
  nameEn: "Mobile Zone",
  iconName: "Smartphone",
  colorClass: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
  borderColor: "border-indigo-100",
  displayOrder: 18,
  order: 18,
  image: "https://images.unsplash.com/photo-1511707171634-5f897ff02540?w=600&auto=format&fit=crop&q=80",
  imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02540?w=600&auto=format&fit=crop&q=80",
  isAvailable: true
};

/**
 * Cosmetics & Beauty Corner Category Definition
 * Serial #10 in the category list.
 */
export const COSMETICS_CATEGORY: Category = {
  id: "cosmetics",
  nameBn: "কসমেটিকস ও বিউটি কর্নার",
  nameEn: "Cosmetics & Beauty Corner",
  iconName: "Sparkles",
  colorClass: "bg-pink-50 text-pink-700 hover:bg-pink-100",
  borderColor: "border-pink-100",
  displayOrder: 10,
  order: 10,
  image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80",
  imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80",
  isAvailable: true
};

/**
 * Event Management Category Definition
 * Stage Decoration, Gate & Lighting, Bridal Room, Wedding Car, Photography, Sound & DJ, Catering, Car Rental
 * Serial #16 in the category list.
 */
export const EVENT_MANAGEMENT_CATEGORY: Category = {
  id: "pet-food-care",
  nameBn: "ইভেন্ট ম্যানেজমেন্ট",
  nameEn: "Event Management",
  iconName: "Sparkles",
  colorClass: "bg-orange-50 text-orange-700 hover:bg-orange-100",
  borderColor: "border-orange-100",
  displayOrder: 16,
  order: 16,
  image: "https://res.cloudinary.com/upvkzb3p/image/upload/v1790502262/Gemini_Generated_Image_56vcn756vcn756vc_gq1xfi.jpg",
  imageUrl: "https://res.cloudinary.com/upvkzb3p/image/upload/v1790502262/Gemini_Generated_Image_56vcn756vcn756vc_gq1xfi.jpg",
  isAvailable: true
};

/**
 * Standard category order map ensuring:
 * 1: vegetables (তাজা শাকসবজি)
 * 2: groceries (মুদি পণ্য)
 * 3: bakery-sweets (রেস্টুরেন্ট)
 * 4: fish (তাজা মাছ)
 * 5: snacks-biscuits (কনফেকশনারি)
 * 6: meat (মাংস)
 * 7: fruits (তাজা ফলমূল)
 * 8: dairy-eggs (ডেইরি ও ডিম)
 * 9: frozen (ড্রাই ফুড)
 * 10: cosmetics / personal-care (কসমেটিকস ও বিউটি কর্নার)
 * 11: household (কাঁচা চিপস কর্নার)
 * 12: pharmacy (ফার্মেসি)
 * 13: offers (পান সুপারি / অফার)
 * 14: organic-herbal (বাই-সেল জোন / অর্গানিক)
 * 15: pet-care (শুঁটকি মাছ)
 * 16: pet-food-care (ইভেন্ট ম্যানেজমেন্ট)
 * 17: vehicles (যানবাহন)
 * 18: mobile-zone (মোবাইল জোন)
 */
export const CATEGORY_SERIAL_MAP: Record<string, number> = {
  "vegetables": 1,
  "groceries": 2,
  "staples": 2,
  "spices-oils": 2,
  "spices": 2,
  "oil-spices": 2,
  "spices-cooking-oil": 2,
  "bakery-sweets": 3,
  "restaurant": 3,
  "bakery": 3,
  "fish": 4,
  "snacks-biscuits": 5,
  "confectionery": 5,
  "beverages": 5,
  "meat": 6,
  "fruits": 7,
  "dairy-eggs": 8,
  "frozen": 9,
  "dry-food": 9,
  "dryfood": 9,
  "dry-foods": 9,
  "dry food": 9,
  "dry_food": 9,
  "ড্রাই ফুড": 9,
  "ড্রাইফুড": 9,
  "cosmetics": 10,
  "personal-care": 10,
  "beauty": 10,
  "beauty-cosmetics": 10,
  "household": 11,
  "pharmacy": 12,
  "baby-care": 12,
  "offers": 13,
  "buy-sell": 14,
  "organic-herbal": 14,
  "buysell": 14,
  "pet-care": 15,
  "pet-food-care": 16,
  "event-management": 16,
  "event": 16,
  "events": 16,
  "ইভেন্ট ম্যানেজমেন্ট": 16,
  "ইভেন্ট": 16,
  "vehicles": 17,
  "transport": 17,
  "car-rental": 17,
  "vehicle": 17,
  "mobile-zone": 18,
  "mobile": 18,
  "mobiles": 18,
  "mobilezone": 18,
  "pan-supari": 19,
  "pan": 19,
  "supari": 19
};

/**
 * Checks whether a product matches a selected category filter.
 * - Treats "staples", "spices-oils", and "মসলা ও রান্নার তেল" as belonging to the merged "groceries" (মুদি পণ্য) category.
 * - Treats "snacks-biscuits" and "beverages" as belonging to the merged "কনফেকশনারি" (Confectionery) category.
 * - Treats "restaurant", "bakery", and "bakery-sweets" as matching "রেস্টুরেন্ট".
 * - Treats "pharmacy" and legacy "baby-care" as matching "ফার্মেসি".
 * - Treats "buy-sell" and "organic-herbal" as matching "বাই-সেল জোন".
 * - Treats "vehicles", "transport", "vehicle" as matching "যানবাহন".
 * - Treats "mobile-zone", "mobile", "mobiles", "mobilezone", "home-appliances" as matching "মোবাইল জোন".
 */
export function isCategoryMatch(
  productCategory: string | undefined | null,
  selectedCategoryId: string | undefined | null
): boolean {
  if (!selectedCategoryId || selectedCategoryId === "all") {
    return true;
  }
  if (!productCategory) {
    return false;
  }

  const pCat = productCategory.toLowerCase().trim();
  const sCat = selectedCategoryId.toLowerCase().trim();

  // If filtering by the merged groceries category (or legacy staples / spices-oils / spices / মুদি পণ্য)
  const isGroceryFilter = 
    sCat === "groceries" || 
    sCat === "grocery" ||
    sCat === "মুদি পণ্য" ||
    sCat === "মুদি" ||
    sCat === "মুদিপণ্য" ||
    sCat === "staples" || 
    sCat === "spices-oils" || 
    sCat === "spices" || 
    sCat === "oil-spices" || 
    sCat === "মসলা ও রান্নার তেল";

  if (isGroceryFilter) {
    return (
      pCat === "groceries" || 
      pCat === "grocery" || 
      pCat === "মুদি পণ্য" || 
      pCat === "মুদি" || 
      pCat === "মুদিপণ্য" || 
      pCat === "staples" || 
      pCat === "spices-oils" || 
      pCat === "spices" || 
      pCat === "oil-spices" || 
      pCat === "মসলা ও রান্নার তেল" ||
      (productCategory ? (productCategory.includes("মসলা") || productCategory.includes("রান্নার তেল") || productCategory.includes("মুদি")) : false)
    );
  }

  // If filtering by the merged confectionery category (combining snacks-biscuits, confectionery-snacks, snacks, and beverages)
  const isConfectioneryFilter = 
    sCat === "confectionery-snacks" ||
    sCat === "snacks-biscuits" || 
    sCat === "confectionery" || 
    sCat === "snacks" || 
    sCat === "beverages" || 
    sCat === "drinks" ||
    sCat === "কনফেকশনারি ও স্ন্যাকস" ||
    sCat === "কনফেকশনারি" ||
    sCat.includes("কনফেকশনারি") ||
    sCat.includes("স্ন্যাকস");

  if (isConfectioneryFilter) {
    return (
      pCat === "confectionery-snacks" ||
      pCat === "snacks-biscuits" || 
      pCat === "confectionery" || 
      pCat === "snacks" || 
      pCat === "beverages" || 
      pCat === "drinks" ||
      pCat === "কনফেকশনারি ও স্ন্যাকস" ||
      pCat === "কনফেকশনারি" ||
      pCat.includes("কনফেকশনারি") ||
      pCat.includes("স্ন্যাকস")
    );
  }

  // If filtering by restaurant category (supports bakery-sweets, restaurant, bakery, রেস্টুরেন্ট, রেস্তোরাঁ)
  if (sCat === "bakery-sweets" || sCat === "restaurant" || sCat === "bakery" || sCat === "রেস্টুরেন্ট" || sCat === "রেস্তোরাঁ" || sCat.includes("রেস্টুরেন্ট")) {
    return (
      pCat === "bakery-sweets" || 
      pCat === "restaurant" || 
      pCat === "bakery" || 
      pCat === "রেস্টুরেন্ট" || 
      pCat === "রেস্তোরাঁ" ||
      pCat.includes("রেস্টুরেন্ট") ||
      pCat.includes("restaurant")
    );
  }

  // If filtering by dry-food or frozen
  const isDryFoodFilter = 
    sCat === "frozen" || 
    sCat === "dry-food" || 
    sCat === "dryfood" || 
    sCat === "dry-foods" || 
    sCat === "dry food" || 
    sCat === "dry_food" || 
    sCat === "ড্রাই ফুড" || 
    sCat === "ড্রাইফুড" ||
    sCat.includes("ড্রাই ফুড");

  if (isDryFoodFilter) {
    return (
      pCat === "frozen" || 
      pCat === "dry-food" || 
      pCat === "dryfood" || 
      pCat === "dry-foods" || 
      pCat === "dry food" || 
      pCat === "dry_food" || 
      pCat === "ড্রাই ফুড" || 
      pCat === "ড্রাইফুড" ||
      pCat.includes("ড্রাই ফুড") ||
      pCat.includes("dry food")
    );
  }

  // If filtering by cosmetics or personal-care
  if (
    sCat === "cosmetics" || 
    sCat === "personal-care" || 
    sCat === "beauty" || 
    sCat === "beauty-cosmetics" || 
    sCat === "কসমেটিকস ও বিউটি কর্নার" ||
    sCat.includes("কসমেটিকস")
  ) {
    return (
      pCat === "cosmetics" || 
      pCat === "personal-care" || 
      pCat === "beauty" || 
      pCat === "beauty-cosmetics" || 
      pCat === "কসমেটিকস ও বিউটি কর্নার" ||
      pCat.includes("কসমেটিকস")
    );
  }

  // If filtering by pharmacy or legacy baby-care
  if (
    sCat === "pharmacy" || 
    sCat === "baby-care" || 
    sCat === "medicine" || 
    sCat === "ফার্মেসি" || 
    sCat.includes("ফার্মেসি")
  ) {
    return (
      pCat === "pharmacy" || 
      pCat === "baby-care" || 
      pCat === "medicine" || 
      pCat === "ফার্মেসি" || 
      pCat.includes("ফার্মেসি")
    );
  }

  // If filtering by buy-sell or organic-herbal
  if (sCat === "buy-sell" || sCat === "buysell" || sCat === "organic-herbal") {
    return pCat === "buy-sell" || pCat === "buysell" || pCat === "organic-herbal";
  }

  // If filtering by vehicles
  if (sCat === "vehicles" || sCat === "transport" || sCat === "car-rental" || sCat === "vehicle") {
    return pCat === "vehicles" || pCat === "transport" || pCat === "car-rental" || pCat === "vehicle";
  }

  // If filtering by mobile-zone
  if (sCat === "mobile-zone" || sCat === "mobile" || sCat === "mobiles" || sCat === "mobilezone" || sCat === "home-appliances") {
    return pCat === "mobile-zone" || pCat === "mobile" || pCat === "mobiles" || pCat === "mobilezone" || pCat === "home-appliances";
  }

  // If filtering by pan-supari
  if (sCat === "pan-supari" || sCat === "pan" || sCat === "supari") {
    return pCat === "pan-supari" || pCat === "pan" || pCat === "supari";
  }

  // If filtering by event-management / pet-food-care
  if (
    sCat === "pet-food-care" ||
    sCat === "event-management" ||
    sCat === "event" ||
    sCat === "events" ||
    sCat === "ইভেন্ট ম্যানেজমেন্ট" ||
    sCat === "ইভেন্ট" ||
    sCat.includes("ইভেন্ট")
  ) {
    return (
      pCat === "pet-food-care" ||
      pCat === "event-management" ||
      pCat === "event" ||
      pCat === "events" ||
      pCat === "ইভেন্ট ম্যানেজমেন্ট" ||
      pCat === "ইভেন্ট" ||
      pCat.includes("ইভেন্ট")
    );
  }

  return pCat === sCat;
}

/**
 * Validates whether a product is allowed in a specific category,
 * enforcing strict inventory policies (e.g. only 13 verified items for 'pan-supari').
 */
export function isAllowedForCategory(
  product: { id?: string; nameBn?: string; nameEn?: string; category?: string } | undefined | null,
  selectedCategoryId: string | undefined | null
): boolean {
  if (!product) return false;
  const sCat = (selectedCategoryId || "").toLowerCase().trim();
  const pCat = (product.category || "").toLowerCase().trim();
  
  if (sCat === "pan-supari" || sCat === "pan" || sCat === "supari" || pCat === "pan-supari" || pCat === "pan" || pCat === "supari") {
    return isAllowedPanSupariProduct(product);
  }
  return true;
}

/**
 * Normalizes category IDs so that legacy "staples" or "spices-oils" map to "groceries",
 * "beverages" maps to "snacks-biscuits" (কনফেকশনারি),
 * "restaurant" maps to "bakery-sweets",
 * "dry-food" maps to "frozen",
 * "baby-care" maps to "pharmacy",
 * "organic-herbal" maps to "buy-sell",
 * "transport" / "car-rental" maps to "vehicles",
 * and "mobile" / "mobiles" / "home-appliances" maps to "mobile-zone".
 */
export function normalizeCategoryId(catId: string | undefined | null): string {
  if (!catId) return "all";
  const lower = catId.toLowerCase().trim();
  if (
    lower === "groceries" ||
    lower === "grocery" ||
    lower === "মুদি পণ্য" ||
    lower === "মুদি" ||
    lower === "মুদিপণ্য" ||
    lower === "staples" || 
    lower === "spices-oils" || 
    lower === "spices" || 
    lower === "oil-spices" || 
    lower === "spices-cooking-oil" || 
    lower === "মসলা ও রান্নার তেল" ||
    lower.includes("মসলা") ||
    lower.includes("রান্নার তেল") ||
    lower.includes("মুদি")
  ) {
    return "groceries";
  }
  if (
    lower === "beverages" || 
    lower === "confectionery" || 
    lower === "confectionery-snacks" || 
    lower === "snacks-biscuits" || 
    lower === "snacks" || 
    lower === "drinks" || 
    lower === "কনফেকশনারি" || 
    lower === "কনফেকশনারি ও স্ন্যাকস" ||
    lower.includes("কনফেকশনারি") ||
    lower.includes("স্ন্যাকস")
  ) {
    return "snacks-biscuits";
  }
  if (lower === "restaurant" || lower === "bakery" || lower === "রেস্টুরেন্ট" || lower === "রেস্তোরাঁ" || lower.includes("রেস্টুরেন্ট")) {
    return "bakery-sweets";
  }
  if (
    lower === "dry-food" || 
    lower === "dryfood" || 
    lower === "dry-foods" || 
    lower === "dry food" || 
    lower === "dry_food" || 
    lower === "ড্রাই ফুড" || 
    lower === "ড্রাইফুড" ||
    lower.includes("ড্রাই ফুড")
  ) {
    return "frozen";
  }
  if (lower === "baby-care" || lower === "medicine") {
    return "pharmacy";
  }
  if (lower === "organic-herbal" || lower === "buysell" || lower === "buy-sell-zone") {
    return "buy-sell";
  }
  if (lower === "transport" || lower === "car-rental" || lower === "vehicle") {
    return "vehicles";
  }
  if (lower === "mobile" || lower === "mobiles" || lower === "mobilezone" || lower === "mobile-zone" || lower === "home-appliances") {
    return "mobile-zone";
  }
  if (lower === "cosmetics" || lower === "personal-care" || lower === "beauty" || lower === "beauty-cosmetics" || lower.includes("কসমেটিকস")) {
    return "cosmetics";
  }
  if (
    lower === "event-management" || 
    lower === "event" || 
    lower === "events" || 
    lower === "ইভেন্ট ম্যানেজমেন্ট" || 
    lower === "ইভেন্ট" ||
    lower.includes("ইভেন্ট")
  ) {
    return "pet-food-care";
  }
  return catId;
}

/**
 * Merges the category cards list to ensure:
 * 1. "রেস্টুরেন্ট" (restaurant / bakery-sweets) is positioned at serial #3.
 * 2. "কনফেকশনারি" and "কোমল পানীয় ও জুস" (beverages) are consolidated into ONE card: "কনফেকশনারি" at serial #5.
 * 3. "চাল ও ডাল" (staples) and "মসলা ও রান্নার তেল" (spices-oils) are consolidated into ONE card: "মুদি পণ্য" at serial #2.
 * 4. Exactly ONE "মোবাইল জোন" (Mobile Zone) card exists at serial #18 with all official smartphones.
 *    Any empty/duplicate or obsolete "মোবাইল জোন" cards (such as home-appliances) are completely removed.
 * 5. Real product data remains untouched and accessible under the merged categories.
 */
export function mergeCategoryCards(categories: any[]): any[] {
  if (!Array.isArray(categories)) return [];

  const result: any[] = [];
  let groceryAdded = false;
  let confectioneryAdded = false;
  let restaurantAdded = false;
  let pharmacyAdded = false;
  let vehiclesAdded = false;
  let mobileZoneAdded = false;
  let cosmeticsAdded = false;
  let eventManagementAdded = false;

  for (const cat of categories) {
    if (!cat || !cat.id) continue;

    // Permanently remove empty/obsolete home-appliances and any duplicate "মোবাইল জোন" cards that do not have the primary mobile-zone ID
    if (
      cat.id === "home-appliances" ||
      ((cat.nameBn === "মোবাইল জোন" || cat.nameEn === "Mobile Zone") &&
        cat.id !== "mobile-zone" &&
        cat.id !== "mobile" &&
        cat.id !== "mobiles")
    ) {
      continue;
    }

    if (cat.id === "vehicles" || cat.id === "transport" || cat.id === "car-rental") {
      vehiclesAdded = true;
    }

    // 0. Mobile Zone -> Ensure only one card exists, with ID "mobile-zone"
    if (cat.id === "mobile-zone" || cat.id === "mobile" || cat.id === "mobiles") {
      if (!mobileZoneAdded) {
        const catImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim();
        result.push({
          ...MOBILE_ZONE_CATEGORY,
          ...cat,
          image: catImg || MOBILE_ZONE_CATEGORY.image,
          imageUrl: catImg || MOBILE_ZONE_CATEGORY.imageUrl,
          id: "mobile-zone",
          nameBn: "মোবাইল জোন",
          nameEn: "Mobile Zone",
          iconName: "Smartphone",
          displayOrder: 18,
          order: 18,
          isAvailable: true
        });
        mobileZoneAdded = true;
      }
      continue;
    }

    // 0.1 Vehicles -> Ensure vehicles preserves custom saved image
    if (cat.id === "vehicles" || cat.id === "transport" || cat.id === "car-rental") {
      if (!vehiclesAdded) {
        const catImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim();
        result.push({
          ...VEHICLES_CATEGORY,
          ...cat,
          image: catImg || VEHICLES_CATEGORY.image,
          imageUrl: catImg || VEHICLES_CATEGORY.imageUrl,
          id: "vehicles",
          nameBn: "যানবাহন",
          nameEn: "Vehicles & Transport",
          iconName: "Truck",
          colorClass: cat.colorClass || "bg-blue-50 text-blue-700 hover:bg-blue-100",
          borderColor: cat.borderColor || "border-blue-100",
          displayOrder: 17,
          order: 17,
          isAvailable: true
        });
        vehiclesAdded = true;
      }
      continue;
    }

    // 0.2 Event Management -> Ensure single card with ID "pet-food-care" and preserved Event image
    if (
      cat.id === "pet-food-care" || 
      cat.id === "event-management" || 
      cat.id === "event" || 
      cat.id === "events" ||
      cat.nameBn === "ইভেন্ট ম্যানেজমেন্ট" ||
      (cat.nameEn && cat.nameEn.toLowerCase() === "event management")
    ) {
      if (!eventManagementAdded) {
        const existingEventCatWithImg = categories.find(
          c => (c.id === "pet-food-care" || c.id === "event-management" || c.nameBn === "ইভেন্ট ম্যানেজমেন্ট") &&
               Boolean((c.image || c.imageUrl || c.banner || c.bannerUrl || "").trim())
        );
        const resolvedEventImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim() ||
          (existingEventCatWithImg?.image || existingEventCatWithImg?.imageUrl || existingEventCatWithImg?.banner || existingEventCatWithImg?.bannerUrl || "").trim() ||
          EVENT_MANAGEMENT_CATEGORY.image;

        result.push({
          ...EVENT_MANAGEMENT_CATEGORY,
          ...cat,
          id: "pet-food-care",
          nameBn: "ইভেন্ট ম্যানেজমেন্ট",
          nameEn: "Event Management",
          iconName: "Sparkles",
          image: resolvedEventImg,
          imageUrl: resolvedEventImg,
          banner: resolvedEventImg,
          bannerUrl: resolvedEventImg,
          colorClass: cat.colorClass || "bg-orange-50 text-orange-700 hover:bg-orange-100",
          borderColor: cat.borderColor || "border-orange-100",
          displayOrder: 16,
          order: 16,
          isAvailable: true
        });
        eventManagementAdded = true;
      }
      continue;
    }

    // 1. Restaurant category -> Force serial #3
    if (cat.id === "bakery-sweets" || cat.id === "restaurant" || cat.id === "bakery") {
      if (!restaurantAdded) {
        const catImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim();
        result.push({
          ...RESTAURANT_CATEGORY,
          ...cat,
          id: "bakery-sweets",
          nameBn: "রেস্টুরেন্ট",
          nameEn: cat.nameEn && cat.nameEn !== "Bakery & Sweets" ? cat.nameEn : "Restaurant",
          iconName: cat.iconName || "Utensils",
          colorClass: cat.colorClass || "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100",
          borderColor: cat.borderColor || "border-fuchsia-100",
          image: catImg || RESTAURANT_CATEGORY.image || "",
          imageUrl: catImg || RESTAURANT_CATEGORY.imageUrl || "",
          displayOrder: 3,
          order: 3
        });
        restaurantAdded = true;
      }
      continue;
    }

    // 2. Confectionery + Beverages -> Merge into ONE card "কনফেকশনারি" at serial #5
    if (cat.id === "snacks-biscuits" || cat.id === "beverages" || cat.id === "confectionery" || cat.id === "confectionery-snacks" || cat.id === "drinks") {
      if (!confectioneryAdded) {
        const catImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim();
        result.push({
          ...MERGED_CONFECTIONERY_CATEGORY,
          ...cat,
          id: "snacks-biscuits",
          nameBn: "কনফেকশনারি",
          nameEn: "Confectionery",
          iconName: "Cookie",
          colorClass: "bg-pink-50 text-pink-700 hover:bg-pink-100",
          borderColor: "border-pink-100",
          image: catImg || MERGED_CONFECTIONERY_CATEGORY.image || "",
          imageUrl: catImg || MERGED_CONFECTIONERY_CATEGORY.imageUrl || "",
          displayOrder: 5,
          order: 5,
          isAvailable: true
        });
        confectioneryAdded = true;
      }
      // Skip the second card (whether it was beverages or snacks-biscuits) so they merge into ONE
      continue;
    }

    // 3. Groceries -> Staples + Spices-Oils merged into "মুদি পণ্য" at serial #2
    const isSpicesOrStaplesCat = 
      cat.id === "staples" || 
      cat.id === "spices-oils" || 
      cat.id === "spices" || 
      cat.id === "oil-spices" || 
      cat.id === "spices-cooking-oil" ||
      (cat.nameBn && (cat.nameBn.includes("মসলা ও রান্নার তেল") || (cat.nameBn.includes("মসলা") && cat.nameBn.includes("তেল")))) ||
      (cat.nameEn && cat.nameEn.toLowerCase().includes("spices & cooking"));

    if (isSpicesOrStaplesCat) {
      if (!groceryAdded) {
        const catImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim();
        result.push({
          ...MERGED_GROCERY_CATEGORY,
          ...cat,
          id: "groceries",
          nameBn: "মুদি পণ্য",
          nameEn: "Groceries",
          iconName: "Wheat",
          image: catImg || MERGED_GROCERY_CATEGORY.image,
          imageUrl: catImg || MERGED_GROCERY_CATEGORY.imageUrl,
          displayOrder: 2,
          order: 2,
          isAvailable: true
        });
        groceryAdded = true;
      }
      continue;
    } else if (cat.id === "groceries") {
      const catImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim();
      result.push({
        ...cat,
        nameBn: "মুদি পণ্য",
        nameEn: cat.nameEn || "Groceries",
        iconName: cat.iconName || "Wheat",
        image: catImg || MERGED_GROCERY_CATEGORY.image,
        imageUrl: catImg || MERGED_GROCERY_CATEGORY.imageUrl,
        displayOrder: 2,
        order: 2
      });
      groceryAdded = true;
    } else if (
      cat.id === "frozen" || 
      cat.id === "dry-food" || 
      cat.id === "dryfood" || 
      cat.id === "dry-foods" || 
      cat.id === "dry food" || 
      cat.id === "ড্রাই ফুড" || 
      cat.id === "ড্রাইফুড" ||
      cat.nameBn === "ড্রাই ফুড" ||
      cat.nameBn === "হিমায়িত খাদ্য"
    ) {
      const catImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim();
      result.push({
        ...cat,
        id: "frozen",
        nameBn: "ড্রাই ফুড",
        nameEn: "Dry Food",
        iconName: cat.iconName || "Package",
        image: catImg || cat.image || cat.imageUrl || "",
        imageUrl: catImg || cat.imageUrl || cat.image || "",
        displayOrder: 9,
        order: 9
      });
    } else if (cat.id === "baby-care" || cat.id === "pharmacy" || cat.id === "medicine") {
      if (!pharmacyAdded) {
        const catImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim();
        result.push({
          ...PHARMACY_CATEGORY,
          ...cat,
          id: "pharmacy",
          nameBn: "ফার্মেসি",
          nameEn: "Pharmacy",
          iconName: "Pill",
          colorClass: "bg-teal-50 text-teal-700 hover:bg-teal-100",
          borderColor: "border-teal-100",
          image: catImg || PHARMACY_CATEGORY.image || "",
          imageUrl: catImg || PHARMACY_CATEGORY.imageUrl || "",
          displayOrder: 12,
          order: 12,
          isAvailable: true
        });
        pharmacyAdded = true;
      }
    } else if (cat.id === "buy-sell" || cat.id === "organic-herbal" || cat.id === "buysell") {
      const catImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim();
      result.push({
        ...cat,
        id: "buy-sell",
        nameBn: "বাই-সেল জোন",
        nameEn: "Buy & Sell Zone",
        iconName: "Repeat",
        colorClass: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        borderColor: "border-emerald-100",
        image: catImg || cat.image || cat.imageUrl || "",
        imageUrl: catImg || cat.imageUrl || cat.image || "",
        displayOrder: 14,
        order: 14
      });
    } else if (cat.id === "cosmetics" || cat.id === "personal-care" || cat.id === "beauty" || cat.id === "beauty-cosmetics") {
      if (!cosmeticsAdded) {
        const catImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim();
        result.push({
          ...COSMETICS_CATEGORY,
          ...cat,
          id: "cosmetics",
          nameBn: "কসমেটিকস ও বিউটি কর্নার",
          nameEn: cat.nameEn && cat.nameEn !== "Personal Care" ? cat.nameEn : "Cosmetics & Beauty Corner",
          iconName: "Sparkles",
          colorClass: "bg-pink-50 text-pink-700 hover:bg-pink-100",
          borderColor: "border-pink-100",
          image: catImg || COSMETICS_CATEGORY.image || "",
          imageUrl: catImg || COSMETICS_CATEGORY.imageUrl || "",
          displayOrder: 10,
          order: 10,
          isAvailable: true
        });
        cosmeticsAdded = true;
      }
      continue;
    } else {
      // Assign mapped default serial order if not explicitly set
      const defaultSerial = CATEGORY_SERIAL_MAP[cat.id];
      const catImg = (cat.image || cat.imageUrl || cat.banner || cat.bannerUrl || "").trim();
      result.push({
        ...cat,
        image: catImg || cat.image || cat.imageUrl || "",
        imageUrl: catImg || cat.imageUrl || cat.image || "",
        displayOrder: typeof cat.displayOrder === "number" ? cat.displayOrder : (typeof cat.order === "number" ? cat.order : defaultSerial),
        order: typeof cat.order === "number" ? cat.order : (typeof cat.displayOrder === "number" ? cat.displayOrder : defaultSerial)
      });
    }
  }

  // If groceries wasn't added yet, insert it
  if (!groceryAdded) {
    result.push({ ...MERGED_GROCERY_CATEGORY });
  }

  // If restaurant wasn't added yet, insert it
  if (!restaurantAdded) {
    result.push({ ...RESTAURANT_CATEGORY });
  }

  // If confectionery wasn't added yet, insert it
  if (!confectioneryAdded) {
    result.push({ ...MERGED_CONFECTIONERY_CATEGORY });
  }

  // If cosmetics wasn't added yet, insert it
  if (!cosmeticsAdded) {
    result.push({ ...COSMETICS_CATEGORY });
  }

  // If pharmacy wasn't added yet, insert it
  if (!pharmacyAdded) {
    result.push({ ...PHARMACY_CATEGORY });
  }

  // If vehicles wasn't added yet, insert it
  if (!vehiclesAdded) {
    result.push({ ...VEHICLES_CATEGORY });
  }

  // If mobile-zone wasn't added yet, insert it
  if (!mobileZoneAdded) {
    result.push({ ...MOBILE_ZONE_CATEGORY });
  }

  // If event-management wasn't added yet, insert it
  if (!eventManagementAdded) {
    result.push({ ...EVENT_MANAGEMENT_CATEGORY });
  }

  // Deduplicate by ID and name to strictly ensure no duplicate cards (e.g. duplicate "মোবাইল জোন") exist
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const unique = result.filter((c) => {
    if (!c || !c.id) return false;
    // Explicitly reject any standalone spices-oils or "মসলা ও রান্নার তেল" card
    if (
      c.id === "spices-oils" || 
      c.id === "spices" || 
      c.id === "oil-spices" || 
      c.id === "staples" ||
      (c.nameBn && (c.nameBn.includes("মসলা ও রান্নার তেল") || (c.nameBn.includes("মসলা") && c.nameBn.includes("তেল")))) ||
      (c.nameEn && c.nameEn.toLowerCase().includes("spices & cooking"))
    ) {
      return false;
    }
    const normName = (c.nameBn || "").trim().toLowerCase();
    if (seenIds.has(c.id)) return false;
    if (normName && seenNames.has(normName)) return false;
    seenIds.add(c.id);
    if (normName) seenNames.add(normName);
    return true;
  });

  // Ensure items have exact serial ordering
  unique.sort((a, b) => {
    if (a.id === "all") return -1;
    if (b.id === "all") return 1;
    const orderA = typeof a.displayOrder === "number" ? a.displayOrder : (typeof a.order === "number" ? a.order : (CATEGORY_SERIAL_MAP[a.id] ?? 9999));
    const orderB = typeof b.displayOrder === "number" ? b.displayOrder : (typeof b.order === "number" ? b.order : (CATEGORY_SERIAL_MAP[b.id] ?? 9999));
    return orderA - orderB;
  });

  return unique;
}

/**
 * Checks if a category identifier or product belongs to the "মুদি পণ্য" (Groceries) category.
 */
export function isGroceryCategory(catOrProduct: any): boolean {
  if (!catOrProduct) return false;
  if (typeof catOrProduct === "string") {
    return isCategoryMatch(catOrProduct, "groceries");
  }
  const cat = catOrProduct.category || catOrProduct.categoryId || "";
  return isCategoryMatch(cat, "groceries");
}

/**
 * Filter for eliminating legacy duplicate seed items in "মুদি পণ্য" (Groceries) category ONLY.
 * - Non-grocery categories: Always returns TRUE (keeps all products completely untouched).
 * - "মুদি পণ্য" (Groceries) category:
 *   - Newly created products (e.g. prod_*, custom ID, or with createdAt/updatedAt): ALWAYS KEPT.
 *   - Any product with a valid uploaded image (Cloudinary, Firebase Storage, Local upload, Base64 Data URL, Blob, etc.): ALWAYS KEPT.
 *   - Products with any valid image URL or custom SKU: KEPT.
 *   - Only legacy hardcoded mock items (gr1..gr60, st1..st60, sp1..sp60) using stock Unsplash images are filtered out.
 */
export function shouldKeepProductGroceryFiltered(product: any): boolean {
  if (!product) return false;

  const isGrocery = isGroceryCategory(product);
  // Keep all other categories completely untouched
  if (!isGrocery) {
    return true;
  }

  const id = (product.id || "").toString().trim();

  // If it's a newly created or updated product from Admin (prod_*, or has createdAt/updatedAt), ALWAYS keep it!
  if (id.startsWith("prod_") || product.createdAt || product.updatedAt) {
    return true;
  }

  // Extract all possible image URL properties that might exist on product or raw doc
  const imgUrl = (product.imageUrl || "").toString().trim();
  const img = (product.image || "").toString().trim();
  const rawCandidate = (
    product.image_url ||
    product.photoUrl ||
    product.img ||
    (Array.isArray(product.images) && product.images[0]) ||
    ""
  ).toString().trim();

  const combined = `${imgUrl} ${img} ${rawCandidate}`.toLowerCase();

  // If it has any valid uploaded or CDN image (Cloudinary, Firebase Storage, Local /uploads/, Base64 Data URL, Blob), keep it!
  const hasUploadedOrCdnImage = 
    combined.includes("cloudinary.com") ||
    combined.includes("data:image/") ||
    combined.includes("firebasestorage.googleapis.com") ||
    combined.includes("storage.googleapis.com") ||
    combined.includes("/uploads/") ||
    combined.includes("blob:");

  if (hasUploadedOrCdnImage) {
    return true;
  }

  // Only filter out legacy hardcoded mock seed duplicates (e.g., gr1..gr60, st1..st60, sp1..sp60) that use old stock photos
  const isLegacySeedId = /^gr\d+$/i.test(id) || /^st\d+$/i.test(id) || /^sp\d+$/i.test(id);
  if (isLegacySeedId && combined.includes("unsplash.com")) {
    return false;
  }

  // Any other product with any image URL is kept safely
  if (imgUrl || img || rawCandidate) {
    return true;
  }

  // Default: Keep products safely rather than silently discarding them
  return true;
}

