export interface BuySellListing {
  id: string;
  title: string;
  titleBn?: string;
  category: string; // "mobiles", "electronics", "vehicles", "furniture", "fashion", "books", "home-agro", "others"
  condition: "brand_new" | "like_new" | "used";
  price: number;
  isNegotiable: boolean;
  location: string;
  description: string;
  images: string[];
  sellerUid: string;
  sellerName: string;
  sellerPhone: string;
  sellerEmail?: string;
  sellerWhatsApp?: string;
  allowCall: boolean;
  allowWhatsApp: boolean;
  status: "active" | "sold" | "archived" | "flagged";
  views?: number;
  reportCount?: number;
  createdAt: any;
  updatedAt?: any;
}

export interface BuySellReport {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerUid: string;
  reportedByUid?: string;
  reportedByName?: string;
  reason: string;
  details?: string;
  status: "pending" | "reviewed" | "dismissed" | "removed";
  createdAt: any;
}

export interface BuySellChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  createdAt: any;
}

export interface BuySellChat {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingImage?: string;
  sellerUid: string;
  sellerName: string;
  buyerUid: string;
  buyerName: string;
  lastMessage: string;
  lastMessageAt: any;
  messages: BuySellChatMessage[];
}

export const BUY_SELL_CATEGORIES = [
  { id: "all", nameBn: "সব পণ্য", nameEn: "All Items", icon: "Grid" },
  { id: "mobiles", nameBn: "মোবাইল ও গ্যাজেট", nameEn: "Mobiles & Gadgets", icon: "Smartphone" },
  { id: "electronics", nameBn: "ইলেকট্রনিক্স ও অ্যাপ্লায়েন্স", nameEn: "Electronics & Appliances", icon: "Tv" },
  { id: "vehicles", nameBn: "যানবাহন ও সাইকেল", nameEn: "Vehicles & Bicycles", icon: "Bike" },
  { id: "furniture", nameBn: "আসবাবপত্র ও ডেকোরেশন", nameEn: "Furniture & Decor", icon: "Armchair" },
  { id: "fashion", nameBn: "পোশাক ও ফ্যাশন", nameEn: "Fashion & Lifestyle", icon: "Shirt" },
  { id: "books", nameBn: "বই ও শিক্ষাসামগ্রী", nameEn: "Books & Education", icon: "BookOpen" },
  { id: "home-agro", nameBn: "কৃষি ও গৃহস্থালি", nameEn: "Agro & Tools", icon: "Tractor" },
  { id: "others", nameBn: "অন্যান্য সামগ্রী", nameEn: "Others", icon: "Package" },
] as const;

export const POPULAR_LOCATIONS = [
  "চাঁচকৈড় বাজার, গুরুদাসপুর",
  "গুরুদাসপুর সদর, নাটোর",
  "সিংড়া, নাটোর",
  "বড়াইগ্রাম, নাটোর",
  "নাটোর সদর, নাটোর",
  "লালপুর, নাটোর",
  "চলনবিল এলাকা",
  "রাজশাহী সদর",
  "ঢাকা"
];
