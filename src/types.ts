export interface ProductOption {
  id?: string;
  value: number;
  unit: string;
  price: number;
  stock?: number;
  isCustom?: boolean;
  customLabel?: string;
}

export interface PartnerShopAvailability {
  shopId: string;
  partnerId: string; // e.g. "KB-SHOP-001"
  shopName: string;
  logo?: string;
  price: number;
  stock: number;
  address?: string;
  location?: string;
  rating?: number;
  commissionRate?: number;
}

export interface Product {
  id: string;
  nameBn: string;
  nameEn: string;
  price?: number;
  originalPrice?: number;
  unitBn: string;
  unitEn: string;
  category: string;
  image: string;
  imageUrl?: string;
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
  // Partner shop association
  partnerShopId?: string;
  partnerShopName?: string;
  partnerId?: string; // e.g. "KB-SHOP-001"
  availableShops?: PartnerShopAvailability[];
  // New production-ready catalog fields
  sku?: string;
  subcategory?: string;
  tags?: string[];
  ingredientsBn?: string;
  ingredientsEn?: string;
  weightSizeOptions?: string[];
  availabilityStatus?: string;
  isDeleted?: boolean;
  deleted?: boolean;
  status?: string;
  deletedAt?: any;
  deletedBy?: string;
  categoryId?: string;
  subcategoryId?: string;
  options?: ProductOption[];
  isAvailable?: boolean;
  displayOrder?: number;
  order?: number;
}

export interface Subcategory {
  id: string;
  nameBn: string;
  nameEn: string;
  categoryId: string;
  order: number;
  iconName?: string;
  image?: string;
  imageUrl?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: any;
  updatedAt?: any;
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
  | "daily_sales"
  | "orders"
  | "products"
  | "categories"
  | "memo_management"
  | "home_management"
  | "users"
  | "staff_management"
  | "partner_shops"
  | "leadership"
  | "support_chat"
  | "voice_calls"
  | "coupons"
  | "notifications"
  | "settings"
  | "accounts";

export type PermissionAction = "view" | "add" | "edit" | "delete";

export type PermissionsMap = Record<string, boolean>;

export interface SalaryPaymentRecord {
  id: string;
  month: string; // e.g. "March 2026" / "মার্চ ২০২৬"
  amount: number;
  paymentDate: string;
  paidAt?: string;
  paymentMethod: "Cash" | "bKash" | "Nagad" | "Bank Transfer" | "Other" | string;
  status: "paid" | "partial";
  transactionRef?: string;
  note?: string;
  paidBy?: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  staffId: string; // e.g. "CFI-KB-001"
  username?: string; // e.g. "anik_admin", "rahim02"
  fullName: string;
  mobile: string;
  email: string;
  photoURL?: string;
  digitalSignature?: string;
  role: StaffRole;
  designation?: string;
  department?: string;
  joiningDate?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  monthlySalary?: number; // Base salary in BDT
  salaryStatus?: "paid" | "unpaid" | "due";
  lastPaymentDate?: string;
  salaryHistory?: SalaryPaymentRecord[];
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
  assignedAgentDesk?: number | null;
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

export type PartnerShopStatus = "active" | "suspended" | "pending";

export interface PartnerShop {
  id: string; // Document ID or internal ID
  partnerId: string; // Formatted unique ID e.g. "KB-SHOP-001"
  shopName: string;
  logo: string;
  ownerName: string;
  mobile: string;
  email: string;
  address: string;
  category: string;
  joiningDate: string;
  commissionRate: number; // Configurable percentage, e.g. 10 for 10%
  status: PartnerShopStatus;
  plainPassword?: string;
  passwordHash?: string;
  passwordSalt?: string;
  paymentMethod?: string;
  accountNumber?: string;
  balance?: number;
  totalSales?: number;
  totalOrders?: number;
  totalCommission?: number;
  netEarnings?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface PartnerOrderAssignment {
  partnerId: string;
  partnerShopId: string;
  partnerShopName: string;
  itemCount: number;
  subtotal: number;
  commissionRate: number;
  commissionAmount: number;
  partnerEarnings: number;
  status?: "pending" | "processing" | "ready" | "shipped" | "delivered" | "cancelled";
  items?: any[];
}

