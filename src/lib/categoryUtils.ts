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
 * Checks whether a product matches a selected category filter.
 * Treats "staples" and "spices-oils" as belonging to the merged "groceries" (মুদি পণ্য) category.
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

  // If filtering by restaurant category (supports bakery-sweets, restaurant, bakery)
  if (sCat === "bakery-sweets" || sCat === "restaurant" || sCat === "bakery") {
    return pCat === "bakery-sweets" || pCat === "restaurant" || pCat === "bakery";
  }

  // If filtering by dry-food or frozen
  if (sCat === "frozen" || sCat === "dry-food" || sCat === "dryfood") {
    return pCat === "frozen" || pCat === "dry-food" || pCat === "dryfood";
  }

  return pCat === sCat;
}

/**
 * Normalizes category IDs so that legacy "staples" or "spices-oils" map to "groceries",
 * and "dry-food" maps to "frozen".
 */
export function normalizeCategoryId(catId: string | undefined | null): string {
  if (!catId) return "all";
  const lower = catId.toLowerCase().trim();
  if (lower === "staples" || lower === "spices-oils") {
    return "groceries";
  }
  if (lower === "dry-food" || lower === "dryfood") {
    return "frozen";
  }
  return catId;
}

/**
 * Merges the category cards list to ensure:
 * - "চাল ও ডাল" (staples) and "মসলা ও রান্নার তেল" (spices-oils) are consolidated into ONE card: "মুদি পণ্য" (groceries).
 * - Real product data remains untouched and accessible under "মুদি পণ্য".
 */
export function mergeCategoryCards(categories: any[]): any[] {
  if (!Array.isArray(categories)) return [];

  const result: any[] = [];
  let groceryAdded = false;

  for (const cat of categories) {
    if (!cat || !cat.id) continue;

    // If it's one of the legacy categories to merge
    if (cat.id === "staples" || cat.id === "spices-oils") {
      if (!groceryAdded) {
        result.push({
          ...cat,
          ...MERGED_GROCERY_CATEGORY
        });
        groceryAdded = true;
      }
      // Skip the second legacy card so they merge into ONE
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
        iconName: cat.iconName || "Package"
      });
    } else {
      result.push(cat);
    }
  }

  // If groceries wasn't added yet, insert it right after vegetables
  if (!groceryAdded) {
    const vegIndex = result.findIndex(c => c.id === "vegetables");
    if (vegIndex !== -1) {
      result.splice(vegIndex + 1, 0, { ...MERGED_GROCERY_CATEGORY });
    } else {
      result.push({ ...MERGED_GROCERY_CATEGORY });
    }
  }

  // Deduplicate by ID
  return result.filter((c, idx, arr) => arr.findIndex(t => t.id === c.id) === idx);
}
