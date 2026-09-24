import { Category } from "../types";

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
 * 10: personal-care (ব্যক্তিগত যত্ন / কসমেটিকস)
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
  "personal-care": 10,
  "household": 11,
  "pharmacy": 12,
  "baby-care": 12,
  "offers": 13,
  "buy-sell": 14,
  "organic-herbal": 14,
  "buysell": 14,
  "pet-care": 15,
  "pet-food-care": 16,
  "vehicles": 17,
  "transport": 17,
  "car-rental": 17,
  "vehicle": 17,
  "mobile-zone": 18,
  "mobile": 18,
  "mobiles": 18,
  "mobilezone": 18
};

/**
 * Checks whether a product matches a selected category filter.
 * - Treats "staples" and "spices-oils" as belonging to the merged "groceries" (মুদি পণ্য) category.
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

  // If filtering by the merged groceries category (or legacy staples / spices-oils)
  if (sCat === "groceries" || sCat === "staples" || sCat === "spices-oils") {
    return pCat === "groceries" || pCat === "staples" || pCat === "spices-oils";
  }

  // If filtering by the merged confectionery category (combining snacks-biscuits and beverages)
  if (sCat === "snacks-biscuits" || sCat === "confectionery" || sCat === "beverages" || sCat === "drinks") {
    return pCat === "snacks-biscuits" || pCat === "confectionery" || pCat === "beverages" || pCat === "drinks";
  }

  // If filtering by restaurant category (supports bakery-sweets, restaurant, bakery)
  if (sCat === "bakery-sweets" || sCat === "restaurant" || sCat === "bakery") {
    return pCat === "bakery-sweets" || pCat === "restaurant" || pCat === "bakery";
  }

  // If filtering by dry-food or frozen
  if (sCat === "frozen" || sCat === "dry-food" || sCat === "dryfood") {
    return pCat === "frozen" || pCat === "dry-food" || pCat === "dryfood";
  }

  // If filtering by pharmacy or legacy baby-care
  if (sCat === "pharmacy" || sCat === "baby-care" || sCat === "medicine") {
    return pCat === "pharmacy" || pCat === "baby-care" || pCat === "medicine";
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

  return pCat === sCat;
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
  if (lower === "staples" || lower === "spices-oils") {
    return "groceries";
  }
  if (lower === "beverages" || lower === "confectionery" || lower === "drinks") {
    return "snacks-biscuits";
  }
  if (lower === "restaurant" || lower === "bakery") {
    return "bakery-sweets";
  }
  if (lower === "dry-food" || lower === "dryfood") {
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
        result.push({
          ...cat,
          ...MOBILE_ZONE_CATEGORY,
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

    // 1. Restaurant category -> Force serial #3
    if (cat.id === "bakery-sweets" || cat.id === "restaurant" || cat.id === "bakery") {
      if (!restaurantAdded) {
        result.push({
          ...cat,
          id: "bakery-sweets",
          nameBn: "রেস্টুরেন্ট",
          nameEn: cat.nameEn && cat.nameEn !== "Bakery & Sweets" ? cat.nameEn : "Restaurant",
          iconName: cat.iconName || "Utensils",
          colorClass: cat.colorClass || "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100",
          borderColor: cat.borderColor || "border-fuchsia-100",
          displayOrder: 3,
          order: 3
        });
        restaurantAdded = true;
      }
      continue;
    }

    // 2. Confectionery + Beverages -> Merge into ONE card "কনফেকশনারি" at serial #5
    if (cat.id === "snacks-biscuits" || cat.id === "beverages" || cat.id === "confectionery" || cat.id === "drinks") {
      if (!confectioneryAdded) {
        result.push({
          ...cat,
          id: "snacks-biscuits",
          nameBn: "কনফেকশনারি",
          nameEn: "Confectionery",
          iconName: "Cookie",
          colorClass: "bg-pink-50 text-pink-700 hover:bg-pink-100",
          borderColor: "border-pink-100",
          image: cat.id === "snacks-biscuits" ? (cat.image || cat.imageUrl) : undefined,
          imageUrl: cat.id === "snacks-biscuits" ? (cat.imageUrl || cat.image) : undefined,
          displayOrder: 5,
          order: 5,
          isAvailable: true
        });
        confectioneryAdded = true;
      }
      // Skip the second card (whether it was beverages or snacks-biscuits) so they merge into ONE
      continue;
    }

    // 3. Groceries -> Staples + Spices-Oils into "মুদি পণ্য" at serial #2
    if (cat.id === "staples" || cat.id === "spices-oils") {
      if (!groceryAdded) {
        result.push({
          ...cat,
          ...MERGED_GROCERY_CATEGORY
        });
        groceryAdded = true;
      }
    } else if (cat.id === "groceries") {
      result.push({
        ...cat,
        nameBn: "মুদি পণ্য",
        nameEn: cat.nameEn || "Groceries",
        iconName: cat.iconName || "Wheat",
        image: cat.image || MERGED_GROCERY_CATEGORY.image,
        displayOrder: 2,
        order: 2
      });
      groceryAdded = true;
    } else if (cat.id === "frozen" || cat.id === "dry-food" || cat.id === "dryfood") {
      result.push({
        ...cat,
        id: "frozen",
        nameBn: "ড্রাই ফুড",
        nameEn: "Dry Food",
        iconName: cat.iconName || "Package",
        displayOrder: 9,
        order: 9
      });
    } else if (cat.id === "baby-care" || cat.id === "pharmacy" || cat.id === "medicine") {
      if (!pharmacyAdded) {
        result.push({
          ...cat,
          id: "pharmacy",
          nameBn: "ফার্মেসি",
          nameEn: "Pharmacy",
          iconName: "Pill",
          colorClass: "bg-teal-50 text-teal-700 hover:bg-teal-100",
          borderColor: "border-teal-100",
          displayOrder: 12,
          order: 12,
          isAvailable: true
        });
        pharmacyAdded = true;
      }
    } else if (cat.id === "buy-sell" || cat.id === "organic-herbal" || cat.id === "buysell") {
      result.push({
        ...cat,
        id: "buy-sell",
        nameBn: "বাই-সেল জোন",
        nameEn: "Buy & Sell Zone",
        iconName: "Repeat",
        colorClass: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        borderColor: "border-emerald-100",
        displayOrder: 14,
        order: 14
      });
    } else {
      // Assign mapped default serial order if not explicitly set
      const defaultSerial = CATEGORY_SERIAL_MAP[cat.id];
      result.push({
        ...cat,
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

  // Deduplicate by ID and name to strictly ensure no duplicate cards (e.g. duplicate "মোবাইল জোন") exist
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const unique = result.filter((c) => {
    if (!c || !c.id) return false;
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

