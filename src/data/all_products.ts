import { Product } from "../types";
import { VEGETABLES_FRUITS_RAW } from "./vegetables_fruits";
import { FISH_MEAT_DAIRY_RAW } from "./fish_meat_dairy";
import { STAPLES_SPICES_RAW } from "./staples_spices";
import { SNACKS_BEVERAGES_FROZEN_RAW } from "./snacks_beverages_frozen";
import { HOME_BABY_BAKERY_RAW } from "./home_baby_bakery";
import { OFFERS_RAW } from "./offers";
import { UNIQUE_UNSPLASH_MAP } from "./unique_unsplash_images";

const allRaw = [
  ...VEGETABLES_FRUITS_RAW,
  ...FISH_MEAT_DAIRY_RAW,
  ...STAPLES_SPICES_RAW,
  ...SNACKS_BEVERAGES_FROZEN_RAW,
  ...HOME_BABY_BAKERY_RAW,
  ...OFFERS_RAW
];

const seenImages = new Set<string>();

export const ALL_PRODUCTS: Product[] = allRaw.map((raw: any) => {
  // Use unique high-resolution image ID map if available, otherwise fallback to raw.img
  const rawImgId = UNIQUE_UNSPLASH_MAP[raw.id] || raw.img || "photo-1542838132-92c53300491e";
  
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

  // Calculate default original price if a discount exists but originalPrice is missing
  let originalPrice = raw.originalPrice;
  if (!originalPrice && raw.discount && raw.discount > 0) {
    originalPrice = Math.round(raw.price / (1 - raw.discount / 100));
  }

  // Create a realistic SKU
  const sku = `KB-${category.substring(0, 3).toUpperCase()}-${raw.id.toUpperCase()}`;

  return {
    id: raw.id,
    nameBn: raw.nameBn,
    nameEn: raw.nameEn,
    price: raw.price,
    originalPrice: originalPrice,
    unitBn: raw.unitBn,
    unitEn: raw.unitEn,
    category: category,
    image: imageUrl,
    isFlashSale: raw.isFlashSale || false,
    discount: raw.discount || 0,
    rating: raw.rating || parseFloat((4.2 + Math.random() * 0.7).toFixed(1)),
    stock: raw.stock !== undefined ? raw.stock : Math.floor(Math.random() * 60) + 10,
    descriptionBn: raw.descBn || "",
    descriptionEn: raw.descEn || "",
    isBestSelling: raw.isBestSelling || false,
    isNewArrival: raw.isNewArrival || false,
    isPopular: raw.isPopular || false,
    isSeasonal: raw.isSeasonal || false,
    isCombo: raw.isCombo || false,
    isBuyMoreSaveMore: raw.isBuyMoreSaveMore || false,
    brand: raw.brand || "কাচা বাজার",
    reviewCount: raw.reviewCount || Math.floor(Math.random() * 120) + 15,
    sku: sku,
    subcategory: raw.subcategory || "General",
    tags: raw.tags || [raw.category],
    ingredientsBn: "",
    ingredientsEn: "",
    weightSizeOptions: [raw.unitEn],
    availabilityStatus: "In Stock"
  };
});
