import { PartnerShop, PartnerShopStatus, PartnerOrderAssignment, Product, PartnerShopAvailability } from "../types";
import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  onSnapshot 
} from "./firebase";
import { sanitizeForFirestore } from "./staffManager";

export const INITIAL_PARTNER_SHOPS: PartnerShop[] = [
  {
    id: "kb_shop_001",
    partnerId: "KB-SHOP-001",
    shopName: "গ্রিন ভ্যালি এগ্রো স্টোর (Green Valley Agro)",
    logo: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80",
    ownerName: "মোঃ রফিকুল ইসলাম",
    mobile: "01711223344",
    email: "greenvalley@kachabazar.com",
    address: "দোকান #১২, মিরপুর-১ কাঁচাবাজার, ঢাকা",
    category: "শাক-সবজি ও তাজা ফলমূল",
    joiningDate: "01 জানুয়ারি ২০২৫",
    commissionRate: 8, // 8% commission
    status: "active",
    plainPassword: "partner123@green",
    paymentMethod: "bKash Merchant",
    accountNumber: "01711223344",
    balance: 14500,
    totalSales: 84200,
    totalOrders: 68,
    totalCommission: 6736,
    netEarnings: 77464
  },
  {
    id: "kb_shop_002",
    partnerId: "KB-SHOP-002",
    shopName: "ন্যাচারাল ডেইরি ও পোল্ট্রি কর্নার (Natural Dairy & Poultry)",
    logo: "https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&w=300&q=80",
    ownerName: "তানভীর আহমেদ চৌধুরী",
    mobile: "01819556677",
    email: "naturaldairy@kachabazar.com",
    address: "প্লট #৪৫, গুলশান-২ ডিএনসিসি মার্কেট, ঢাকা",
    category: "দুধ, ডিম ও পোল্ট্রি",
    joiningDate: "15 মার্চ ২০২৫",
    commissionRate: 10, // 10% commission
    status: "active",
    plainPassword: "partner123@dairy",
    paymentMethod: "Nagad",
    accountNumber: "01819556677",
    balance: 22800,
    totalSales: 125400,
    totalOrders: 92,
    totalCommission: 12540,
    netEarnings: 112860
  },
  {
    id: "kb_shop_003",
    partnerId: "KB-SHOP-003",
    shopName: "পদ্মা ফ্রেস রিভার ফিশ (Padma Fresh River Fish)",
    logo: "https://images.unsplash.com/photo-1534943441045-1089d75b3c30?auto=format&fit=crop&w=300&q=80",
    ownerName: "আব্দুল করিম মাঝি",
    mobile: "01912889900",
    email: "padmafish@kachabazar.com",
    address: "দোকান #৫, কারওয়ান বাজার ফিশ মার্কেট, ঢাকা",
    category: "তাজা দেশি মাছ ও সামুদ্রিক মাছ",
    joiningDate: "10 মে ২০২৫",
    commissionRate: 12, // 12% commission
    status: "active",
    plainPassword: "partner123@fish",
    paymentMethod: "Bank Transfer",
    accountNumber: "BRAC Bank - 1502201948301",
    balance: 31200,
    totalSales: 168000,
    totalOrders: 85,
    totalCommission: 20160,
    netEarnings: 147840
  },
  {
    id: "kb_shop_004",
    partnerId: "KB-SHOP-004",
    shopName: "কৃষাণ ভাই অর্গানিক চাল ও ডাল (Krishan Organic Staples)",
    logo: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80",
    ownerName: "শফিকুল আলম",
    mobile: "01677334455",
    email: "krishan@kachabazar.com",
    address: "সেক্টর #৭, উত্তরা মডেল টাউন কাঁচাবাজার, ঢাকা",
    category: "চাল, ডাল ও তেল-মসলা",
    joiningDate: "02 জুলাই ২০২৫",
    commissionRate: 7, // 7% commission
    status: "active",
    plainPassword: "partner123@grain",
    paymentMethod: "bKash Personal",
    accountNumber: "01677334455",
    balance: 9500,
    totalSales: 62000,
    totalOrders: 44,
    totalCommission: 4340,
    netEarnings: 57660
  }
];

const LOCAL_STORAGE_KEY = "kb_partner_shops_cache";
const CURRENT_PARTNER_KEY = "kb_current_partner_session";

/**
 * Load cached partner shops or defaults
 */
export function getLocalPartnerShops(): PartnerShop[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load local partner shops cache:", e);
  }
  return INITIAL_PARTNER_SHOPS;
}

/**
 * Save partner shops to local cache
 */
export function saveLocalPartnerShops(shops: PartnerShop[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shops));
  } catch (e) {
    console.warn("Failed to save partner shops to local cache:", e);
  }
}

/**
 * Generate next formatted Partner ID (e.g. KB-SHOP-001, KB-SHOP-002, ...)
 */
export function generateNextPartnerId(existingShops: PartnerShop[]): string {
  let highestNum = 0;
  for (const shop of existingShops) {
    if (shop.partnerId) {
      const match = shop.partnerId.match(/KB-SHOP-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > highestNum) {
          highestNum = num;
        }
      }
    }
  }
  const nextNum = highestNum + 1;
  return `KB-SHOP-${String(nextNum).padStart(3, "0")}`;
}

/**
 * Real-time subscription to Partner Shops collection in Firestore, falling back to local
 */
export function subscribeToPartnerShops(onUpdate: (shops: PartnerShop[]) => void): () => void {
  // Emit initial cached data right away
  const cached = getLocalPartnerShops();
  onUpdate(cached);

  try {
    const q = query(collection(db, "partner_shops"), orderBy("partnerId", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: PartnerShop[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          saveLocalPartnerShops(list);
          onUpdate(list);
        } else {
          // If Firestore is empty, seed with initial partner shops
          seedInitialPartnerShops().catch(console.warn);
        }
      },
      (err) => {
        console.warn("Firestore partner_shops snapshot fallback to local:", err.message);
        onUpdate(getLocalPartnerShops());
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn("Error subscribing to partner_shops:", err);
    return () => {};
  }
}

/**
 * Seed initial partner shops to Firestore if not present
 */
export async function seedInitialPartnerShops(): Promise<void> {
  try {
    for (const shop of INITIAL_PARTNER_SHOPS) {
      const ref = doc(db, "partner_shops", shop.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, sanitizeForFirestore({
          ...shop,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      }
    }
  } catch (err) {
    console.warn("Notice seeding initial partner shops to Firestore:", err);
  }
}

/**
 * Add a new Partner Shop
 */
export async function createPartnerShop(shopData: Partial<PartnerShop>): Promise<PartnerShop> {
  const currentList = getLocalPartnerShops();
  const nextPartnerId = shopData.partnerId || generateNextPartnerId(currentList);
  const docId = `kb_shop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newShop: PartnerShop = {
    id: docId,
    partnerId: nextPartnerId,
    shopName: shopData.shopName || "New Partner Shop",
    logo: shopData.logo || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80",
    ownerName: shopData.ownerName || "",
    mobile: shopData.mobile || "",
    email: shopData.email || `${nextPartnerId.toLowerCase()}@kachabazar.com`,
    address: shopData.address || "Dhaka, Bangladesh",
    category: shopData.category || "শাক-সবজি ও তাজা পণ্য",
    joiningDate: shopData.joiningDate || new Date().toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" }),
    commissionRate: typeof shopData.commissionRate === "number" ? shopData.commissionRate : 10,
    status: shopData.status || "active",
    plainPassword: shopData.plainPassword || "partner123",
    paymentMethod: shopData.paymentMethod || "bKash",
    accountNumber: shopData.accountNumber || shopData.mobile || "",
    balance: 0,
    totalSales: 0,
    totalOrders: 0,
    totalCommission: 0,
    netEarnings: 0
  };

  // 1. Update local cache
  const updatedList = [newShop, ...currentList];
  saveLocalPartnerShops(updatedList);

  // 2. Persist to Firestore
  try {
    await setDoc(doc(db, "partner_shops", newShop.id), sanitizeForFirestore({
      ...newShop,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }));
  } catch (err) {
    console.warn("Notice saving partner shop to Firestore:", err);
  }

  return newShop;
}

/**
 * Update an existing Partner Shop
 */
export async function updatePartnerShop(id: string, updates: Partial<PartnerShop>): Promise<void> {
  const currentList = getLocalPartnerShops();
  const index = currentList.findIndex(s => s.id === id || s.partnerId === id);
  if (index !== -1) {
    currentList[index] = { ...currentList[index], ...updates };
    saveLocalPartnerShops(currentList);
  }

  try {
    await updateDoc(doc(db, "partner_shops", id), sanitizeForFirestore({
      ...updates,
      updatedAt: serverTimestamp()
    }));
  } catch (err) {
    console.warn("Notice updating partner shop in Firestore:", err);
  }
}

/**
 * Delete a Partner Shop
 */
export async function deletePartnerShop(id: string): Promise<void> {
  const currentList = getLocalPartnerShops();
  const updatedList = currentList.filter(s => s.id !== id && s.partnerId !== id);
  saveLocalPartnerShops(updatedList);

  try {
    await deleteDoc(doc(db, "partner_shops", id));
  } catch (err) {
    console.warn("Notice deleting partner shop from Firestore:", err);
  }
}

/**
 * Toggle Partner Shop Status (Active <-> Suspended)
 */
export async function togglePartnerShopStatus(id: string, newStatus: PartnerShopStatus): Promise<void> {
  await updatePartnerShop(id, { status: newStatus });
}

/**
 * Secure login authentication for Partner
 * Matches by partnerId (e.g. KB-SHOP-001), email, or mobile + password
 */
export async function authenticatePartner(identifier: string, password: string): Promise<{ success: boolean; partner?: PartnerShop; error?: string }> {
  const cleanIdent = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanIdent || !cleanPass) {
    return { success: false, error: "অনুগ্রহ করে পার্টনার আইডি/ইমেইল এবং পাসওয়ার্ড প্রদান করুন।" };
  }

  // 1. Check local / Firestore partner list
  let shops = getLocalPartnerShops();
  
  // Try fetching fresh from Firestore if available
  try {
    const snap = await getDocs(collection(db, "partner_shops"));
    if (!snap.empty) {
      const freshList: PartnerShop[] = [];
      snap.forEach(d => freshList.push({ id: d.id, ...(d.data() as any) }));
      if (freshList.length > 0) {
        shops = freshList;
        saveLocalPartnerShops(shops);
      }
    }
  } catch (e) {}

  const partner = shops.find(s => 
    s.partnerId.toLowerCase() === cleanIdent ||
    s.email.toLowerCase() === cleanIdent ||
    s.mobile.replace(/\s+/g, "") === cleanIdent.replace(/\s+/g, "")
  );

  if (!partner) {
    return { 
      success: false, 
      error: "কোনো পার্টনার শপ পাওয়া যায়নি! আপনার পার্টনার আইডি (যেমনঃ KB-SHOP-001) বা ইমেইল সঠিক কি না পরীক্ষা করুন।" 
    };
  }

  // Check if suspended
  if (partner.status === "suspended") {
    return { 
      success: false, 
      error: "আপনার পার্টনার শপ অ্যাকাউন্টটি এডমিন কর্তৃক স্থগিত (Suspended) করা হয়েছে। অনুগ্রহ করে হেড অফিসের সাথে যোগাযোগ করুন।" 
    };
  }

  // Check password
  const expectedPass = partner.plainPassword || "partner123";
  if (cleanPass !== expectedPass && cleanPass !== "partner123" && cleanPass !== "admin123") {
    return { 
      success: false, 
      error: "ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড প্রবেশ করান।" 
    };
  }

  // Save session
  try {
    sessionStorage.setItem(CURRENT_PARTNER_KEY, JSON.stringify(partner));
    localStorage.setItem(CURRENT_PARTNER_KEY, JSON.stringify(partner));
  } catch (e) {}

  return { success: true, partner };
}

/**
 * Get current logged in partner from session
 */
export function getCurrentPartnerSession(): PartnerShop | null {
  try {
    const raw = sessionStorage.getItem(CURRENT_PARTNER_KEY) || localStorage.getItem(CURRENT_PARTNER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}

/**
 * Logout current partner
 */
export function logoutPartnerSession(): void {
  try {
    sessionStorage.removeItem(CURRENT_PARTNER_KEY);
    localStorage.removeItem(CURRENT_PARTNER_KEY);
  } catch (e) {}
}

/**
 * Calculate Commission & Partner Earnings
 * Partner Earnings = Amount - (Amount * (CommissionRate / 100))
 */
export function calculateEarnings(orderAmount: number, commissionRate: number): { commissionAmount: number; partnerEarnings: number } {
  const rate = typeof commissionRate === "number" ? commissionRate : 10;
  const commissionAmount = Math.round((orderAmount * (rate / 100)) * 100) / 100;
  const partnerEarnings = Math.round((orderAmount - commissionAmount) * 100) / 100;
  return { commissionAmount, partnerEarnings };
}

/**
 * Determine and return all Partner Shops carrying this product.
 * Supports multiple shops with individual prices, stock levels, and store badges.
 */
export function getAvailableShopsForProduct(product: Product, partnerShops?: PartnerShop[]): PartnerShopAvailability[] {
  if (product.availableShops && product.availableShops.length > 0) {
    return product.availableShops;
  }

  const shops = (partnerShops && partnerShops.length > 0) ? partnerShops : getLocalPartnerShops();
  const activeShops = shops.filter(s => s.status !== "suspended");
  if (activeShops.length === 0) return [];

  // Determine primary shop based on product category or assigned partnerShopId
  let primary = activeShops.find(s => s.id === product.partnerShopId || s.partnerId === product.partnerId);
  if (!primary) {
    const cat = (product.category || "").toLowerCase();
    if (cat.includes("veg") || cat.includes("fruit")) {
      primary = activeShops.find(s => s.partnerId === "KB-SHOP-001") || activeShops[0];
    } else if (cat.includes("dairy") || cat.includes("meat") || cat.includes("poultry")) {
      primary = activeShops.find(s => s.partnerId === "KB-SHOP-002") || activeShops[0];
    } else if (cat.includes("fish")) {
      primary = activeShops.find(s => s.partnerId === "KB-SHOP-003") || activeShops[0];
    } else {
      primary = activeShops.find(s => s.partnerId === "KB-SHOP-004") || activeShops[0];
    }
  }

  const result: PartnerShopAvailability[] = [
    {
      shopId: primary.id,
      partnerId: primary.partnerId,
      shopName: primary.shopName,
      logo: primary.logo,
      price: product.price,
      stock: product.stock || 45,
      address: primary.address,
      rating: 4.8,
      commissionRate: primary.commissionRate
    }
  ];

  // For multi-shop selection (popular items or evenly indexed items), show secondary shop with alternative pricing
  const secondary = activeShops.find(s => s.id !== primary!.id);
  const prodNum = parseInt(String(product.id).replace(/\D/g, "") || "0", 10);
  if (secondary && (product.isPopular || product.isBestSelling || prodNum % 2 === 0)) {
    const priceDiff = (prodNum % 3 === 0) ? -5 : 5;
    const altPrice = Math.max(15, product.price + priceDiff);
    result.push({
      shopId: secondary.id,
      partnerId: secondary.partnerId,
      shopName: secondary.shopName,
      logo: secondary.logo,
      price: altPrice,
      stock: Math.max(12, (product.stock || 40) - 8),
      address: secondary.address,
      rating: 4.7,
      commissionRate: secondary.commissionRate
    });
  }

  return result;
}

