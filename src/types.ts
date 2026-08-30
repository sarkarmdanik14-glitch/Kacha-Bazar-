export interface ProductOption {
  id?: string;
  value: number;
  unit: string;
  price: number;
  stock?: number;
  isCustom?: boolean;
  customLabel?: string;
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

export type StaffRole = 
  | "super_admin" 
  | "admin" 
  | "order_manager" 
  | "product_manager" 
  | "call_center_agent" 
  | "customer_support" 
  | "delivery_manager" 
  | "accounts_manager"
  | "custom";

export type StaffStatus = "active" | "inactive";
export type StaffOnlineStatus = "online" | "away" | "offline";

export type PermissionModule = 
  | "dashboard"
  | "orders"
  | "products"
  | "categories"
  | "memo_management"
  | "home_management"
  | "users"
  | "staff_management"
  | "leadership"
  | "support_chat"
  | "voice_calls"
  | "coupons"
  | "notifications"
  | "settings"
  | "accounts";

export type PermissionAction = "view" | "add" | "edit" | "delete";

export type PermissionsMap = Record<string, boolean>;

export interface StaffMember {
  id: string;
  staffId: string; // e.g. "KB-STF-001"
  fullName: string;
  mobile: string;
  email: string;
  photoURL?: string;
  role: StaffRole;
  status: StaffStatus;
  onlineStatus?: StaffOnlineStatus;
  lastActiveAt?: any;
  passwordHash?: string;
  passwordSalt?: string;
  permissions?: PermissionsMap;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
  sessionId?: string;
  lastLoginAt?: any;
  assignedAgentDesk?: number;
  isSuperAdmin?: boolean;
}

export interface StaffActivityLog {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  action: string;
  module: string;
  details: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: any;
}

export interface RoleDefinition {
  id: StaffRole;
  nameBn: string;
  nameEn: string;
  icon: string;
  badgeColor: string;
  descriptionBn: string;
  descriptionEn: string;
  defaultPermissions: PermissionsMap;
}
