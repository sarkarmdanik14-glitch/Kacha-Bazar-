export interface ProductOption {
  id?: string;
  value: number;
  unit: string;
  price: number;
  stock?: number;
}

export interface Product {
  id: string;
  nameBn: string;
  nameEn: string;
  price: number;
  originalPrice?: number;
  unitBn: string;
  unitEn: string;
  category: string;
  image: string;
  isFlashSale?: boolean;
  discount?: number; // e.g. 15 for 15% off
  rating: number;
  stock: number;
  descriptionBn: string;
  descriptionEn: string;
  isBestSelling?: boolean;
  isNewArrival?: boolean;
  isPopular?: boolean;
  isSeasonal?: boolean;
  isCombo?: boolean;
  isBuyMoreSaveMore?: boolean;
  brand?: string;
  reviewCount?: number;
  // New production-ready catalog fields
  sku?: string;
  subcategory?: string;
  tags?: string[];
  ingredientsBn?: string;
  ingredientsEn?: string;
  weightSizeOptions?: string[];
  availabilityStatus?: string;
  options?: ProductOption[];
  isAvailable?: boolean;
  displayOrder?: number;
  order?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedOption?: ProductOption;
}

export interface Recipe {
  id: string;
  nameBn: string;
  nameEn: string;
  prepTimeBn: string;
  prepTimeEn: string;
  difficultyBn: string;
  difficultyEn: string;
  image: string;
  ingredients: {
    productId: string;
    nameBn: string;
    nameEn: string;
    amountBn: string;
    amountEn: string;
  }[];
  instructionsBn: string[];
  instructionsEn: string[];
}

export interface Category {
  id: string;
  nameBn: string;
  nameEn: string;
  iconName: string; // references lucide icon name
  colorClass: string; // for custom background styling
  borderColor: string;
  image?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  disabled?: boolean;
  displayOrder?: number;
  order?: number;
}

export interface PromoBanner {
  id: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  tagBn: string;
  tagEn: string;
  discountBn: string;
  discountEn: string;
  bgGradient: string;
  image: string;
}

export interface Review {
  id: string;
  productId?: string;
  userId?: string;
  userName: string;
  rating: number;
  commentBn: string;
  commentEn: string;
  date: string;
}
