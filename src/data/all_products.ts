import { Product } from "../types";
import { VEGETABLES_FRUITS_RAW } from "./vegetables_fruits";
import { FISH_MEAT_DAIRY_RAW } from "./fish_meat_dairy";
import { STAPLES_SPICES_RAW } from "./staples_spices";
import { SNACKS_BEVERAGES_FROZEN_RAW } from "./snacks_beverages_frozen";
import { DRY_FOOD_RAW } from "./dry_food";
import { HOME_BABY_BAKERY_RAW } from "./home_baby_bakery";
import { OFFERS_RAW } from "./offers";
import { SHUTKI_PRODUCTS_RAW } from "./shutki_products";
import { VEHICLES_RAW } from "./vehicles_rental";
import { MOBILE_ZONE_RAW } from "./mobile_zone";
import { UNIQUE_UNSPLASH_MAP } from "./unique_unsplash_images";
import { GROCERY_SUBCATEGORY_MAP, GROCERY_ORDER_MAP, getResolvedGrocerySubcategory, getResolvedGroceryDisplayOrder } from "./grocery_subcategories";
import { resolveProductUnit } from "../lib/productWeightUtils";

const allRaw = [
  ...VEGETABLES_FRUITS_RAW,
  ...FISH_MEAT_DAIRY_RAW,
  ...STAPLES_SPICES_RAW,
  ...SNACKS_BEVERAGES_FROZEN_RAW,
  ...DRY_FOOD_RAW,
  ...HOME_BABY_BAKERY_RAW,
  ...OFFERS_RAW,
  ...SHUTKI_PRODUCTS_RAW,
  ...VEHICLES_RAW,
  ...MOBILE_ZONE_RAW
];

const seenImages = new Set<string>();

export const ALL_PRODUCTS: Product[] = allRaw.map((raw: any) => {
  // Use direct image if provided, unique high-resolution image ID map, or raw.img
  const rawImgId = raw.image || UNIQUE_UNSPLASH_MAP[raw.id] || raw.img || "photo-1542838132-92c53300491e";
  
  let imageUrl = "";
  if (rawImgId.startsWith("http")) {
    imageUrl = rawImgId;
  } else {
    // Deduplicate images to guarantee unique images for all products
    if (seenImages.has(rawImgId)) {
      const queryKeywords = raw.nameEn
        ? raw.nameEn.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).slice(0, 3).join(",")
        : raw.category;
      imageUrl = `https://images.unsplash.com/featured/?${encodeURIComponent(queryKeywords)}&sig=${raw.id}`;
    } else {
      seenImages.add(rawImgId);
      imageUrl = `https://images.unsplash.com/${rawImgId}?auto=format&fit=crop&w=600&q=80`;
    }
  }

  // Normalize category names
  let category = raw.category;
  if (category === "bakery") {
    category = "bakery-sweets";
  }
  if (category === "staples" || category === "spices-oils") {
    category = "groceries";
  }
  if (category === "baby-care") {
    category = "pharmacy";
  }

  // Calculate default original price if a discount exists but originalPrice is missing
  let originalPrice = raw.originalPrice;
  if (!originalPrice && raw.discount && raw.discount > 0 && typeof raw.price === "number") {
    originalPrice = Math.round(raw.price / (1 - raw.discount / 100));
  }

  // Create a realistic SKU
  const sku = `KB-${category.substring(0, 3).toUpperCase()}-${raw.id.toUpperCase()}`;

  const resolvedUnits = resolveProductUnit({
    id: raw.id,
    nameBn: raw.nameBn,
    nameEn: raw.nameEn,
    unitBn: raw.unitBn,
    unitEn: raw.unitEn,
    category: category,
    subcategory: getResolvedGrocerySubcategory(raw.id, raw.nameBn, raw.nameEn, raw.subcategory, category)
  });

  return {
    id: raw.id,
    nameBn: raw.nameBn,
    nameEn: raw.nameEn,
    price: raw.price,
    originalPrice: originalPrice,
    unitBn: raw.unitBn || resolvedUnits.unitBn,
    unitEn: raw.unitEn || resolvedUnits.unitEn,
    category: category,
    image: imageUrl,
    isFlashSale: raw.isFlashSale || false,
    discount: raw.discount || 0,
    rating: raw.rating || parseFloat((4.2 + Math.random() * 0.7).toFixed(1)),
    stock: raw.stock !== undefined ? raw.stock : Math.floor(Math.random() * 60) + 10,
    descriptionBn: raw.descriptionBn || raw.descBn || "",
    descriptionEn: raw.descriptionEn || raw.descEn || "",
    isBestSelling: raw.isBestSelling || false,
    isNewArrival: raw.isNewArrival || false,
    isPopular: raw.isPopular || false,
    isSeasonal: raw.isSeasonal || false,
    isCombo: raw.isCombo || false,
    isBuyMoreSaveMore: raw.isBuyMoreSaveMore || false,
    brand: raw.brand || "কাচা বাজার",
    reviewCount: raw.reviewCount || Math.floor(Math.random() * 120) + 15,
    sku: sku,
    subcategory: getResolvedGrocerySubcategory(raw.id, raw.nameBn, raw.nameEn, raw.subcategory, category),
    tags: raw.tags || [raw.category],
    displayOrder: getResolvedGroceryDisplayOrder(raw.id, raw.nameBn, raw.nameEn, getResolvedGrocerySubcategory(raw.id, raw.nameBn, raw.nameEn, raw.subcategory, category), raw.displayOrder ?? raw.order),
    order: getResolvedGroceryDisplayOrder(raw.id, raw.nameBn, raw.nameEn, getResolvedGrocerySubcategory(raw.id, raw.nameBn, raw.nameEn, raw.subcategory, category), raw.displayOrder ?? raw.order),
    options: raw.options || [],
    ingredientsBn: "",
    ingredientsEn: "",
    weightSizeOptions: [raw.unitEn],
    availabilityStatus: "In Stock"
  };
});
