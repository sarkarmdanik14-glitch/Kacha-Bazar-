import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  onSnapshot 
} from "./firebase";
import { Subcategory } from "../types";
import { syncSingleSubcategoryToSupabase } from "./supabaseSync";

/**
 * Standard default subcategories categorized by main category ID.
 * Used for automatic bootstrap if the Firestore subcategories collection is empty.
 */
export const DEFAULT_SUBCATEGORIES: Omit<Subcategory, "id">[] = [
  // 1. Groceries (মুদি পণ্য)
  { categoryId: "groceries", nameBn: "চাল ও খাদ্যশস্য", nameEn: "Rice & Grains", order: 1, isActive: true },
  { categoryId: "groceries", nameBn: "ডাল ও ছোলা", nameEn: "Lentils & Pulses", order: 2, isActive: true },
  { categoryId: "groceries", nameBn: "তেল, চিনি, লবণ ও গুড়", nameEn: "Oil, Sugar, Salt & Jaggery", order: 3, isActive: true },
  { categoryId: "groceries", nameBn: "আটা, ময়দা ও সুজি", nameEn: "Flour, Maida & Suji", order: 4, isActive: true },
  { categoryId: "groceries", nameBn: "মসলাপাতি — আস্ত ও গুঁড়ো", nameEn: "Spices & Herbs", order: 5, isActive: true },
  { categoryId: "groceries", nameBn: "রেডি মসলা ও বেকিং আইটেম", nameEn: "Ready Mix & Baking Items", order: 6, isActive: true },
  { categoryId: "groceries", nameBn: "মসলা ও রান্নার তেল", nameEn: "Spices & Cooking Oil", order: 7, isActive: true },

  // 2. Vegetables & Fruits (তাজা শাকসবজি ও ফল)
  { categoryId: "vegetables", nameBn: "তাজা শাক ও পাতা", nameEn: "Leafy Greens", order: 1, isActive: true },
  { categoryId: "vegetables", nameBn: "আলু, পেঁয়াজ ও রসুন", nameEn: "Potatoes, Onion & Garlic", order: 2, isActive: true },
  { categoryId: "vegetables", nameBn: "টমেটো, বেগুন ও মরিচ", nameEn: "Tomatoes, Eggplant & Chili", order: 3, isActive: true },
  { categoryId: "vegetables", nameBn: "লাউ, মিষ্টি কুমড়া ও চালকুমড়া", nameEn: "Gourds & Squash", order: 4, isActive: true },
  { categoryId: "vegetables", nameBn: "অন্যান্য দেশি সবজি", nameEn: "Other Vegetables", order: 5, isActive: true },

  // 3. Fruits (ফলমূল)
  { categoryId: "fruits", nameBn: "মৌসুমি দেশি ফল", nameEn: "Seasonal Local Fruits", order: 1, isActive: true },
  { categoryId: "fruits", nameBn: "আম ও তরমুজ", nameEn: "Mangoes & Watermelon", order: 2, isActive: true },
  { categoryId: "fruits", nameBn: "কলা ও পেঁপে", nameEn: "Bananas & Papaya", order: 3, isActive: true },
  { categoryId: "fruits", nameBn: "আমদানিকৃত আপেল, মাল্টা ও বেদানা", nameEn: "Imported Fruits", order: 4, isActive: true },

  // 4. Fish (তাজা মাছ)
  { categoryId: "fish", nameBn: "নদী ও দেশি মিষ্টি পানির মাছ", nameEn: "Freshwater River Fish", order: 1, isActive: true },
  { categoryId: "fish", nameBn: "ইলিশ ও রূপচাঁদা", nameEn: "Hilsha & Pomfret", order: 2, isActive: true },
  { categoryId: "fish", nameBn: "চিংড়ি ও গলদা চিংড়ি", nameEn: "Prawns & Shrimps", order: 3, isActive: true },
  { categoryId: "fish", nameBn: "সামুদ্রিক মাছ", nameEn: "Marine Sea Fish", order: 4, isActive: true },

  // 5. Meat (মাংস ও ডিম)
  { categoryId: "meat", nameBn: "দেশি মুরগি ও ব্রয়লার", nameEn: "Chicken & Poultry", order: 1, isActive: true },
  { categoryId: "meat", nameBn: "গরু ও খাসির ফ্রেশ মাংস", nameEn: "Beef & Mutton", order: 2, isActive: true },
  { categoryId: "meat", nameBn: "মহিষের মাংস", nameEn: "Buffalo Meat", order: 3, isActive: true },
  { categoryId: "meat", nameBn: "ফার্ম ও দেশি ডিম", nameEn: "Eggs", order: 4, isActive: true },

  // 6. Dairy & Eggs (ডেইরি ও ডিম)
  { categoryId: "dairy-eggs", nameBn: "তরল দুধ ও গুঁড়া দুধ", nameEn: "Milk & Powder Milk", order: 1, isActive: true },
  { categoryId: "dairy-eggs", nameBn: "ঘি, বাটার ও চিজ", nameEn: "Ghee, Butter & Cheese", order: 2, isActive: true },
  { categoryId: "dairy-eggs", nameBn: "মিষ্টি দই ও টক দই", nameEn: "Curd & Yogurt", order: 3, isActive: true },
  { categoryId: "dairy-eggs", nameBn: "আইসক্রিম", nameEn: "Ice Cream", order: 4, isActive: true },

  // 7. Bakery & Restaurant (রেস্টুরেন্ট)
  { categoryId: "bakery-sweets", nameBn: "বিরিয়ানি, পোলাও ও রাইস", nameEn: "Biryani, Polao & Rice", order: 1, isActive: true },
  { categoryId: "bakery-sweets", nameBn: "বার্গার, স্যান্ডউইচ ও শাওয়ার্মা", nameEn: "Burger, Sandwich & Shawarma", order: 2, isActive: true },
  { categoryId: "bakery-sweets", nameBn: "পিজ্জা, পাস্তা ও চাউমিন", nameEn: "Pizza, Pasta & Chowmein", order: 3, isActive: true },
  { categoryId: "bakery-sweets", nameBn: "চিকেন ফ্রাই, উইংস ও ললিপপ", nameEn: "Fried Chicken, Wings & Lollipops", order: 4, isActive: true },
  { categoryId: "bakery-sweets", nameBn: "গ্রিল, সিজলিং ও কাবাব", nameEn: "Grill, Sizzling & Kabab", order: 5, isActive: true },
  { categoryId: "bakery-sweets", nameBn: "অ্যাপেটাইজার, ফাস্ট ফুড ও স্যুপ", nameEn: "Snacks, Soup & Salad", order: 6, isActive: true },
  { categoryId: "bakery-sweets", nameBn: "দেশি তরকারি ও চাইনিজ ডিশ", nameEn: "Curry & Chinese Dishes", order: 7, isActive: true },
  { categoryId: "bakery-sweets", nameBn: "নান, রুটি, পরোটা ও হালিম", nameEn: "Naan, Roti & Halim", order: 8, isActive: true },
  { categoryId: "bakery-sweets", nameBn: "পানীয়, জুস ও মিষ্টি", nameEn: "Drinks, Juice & Sweets", order: 9, isActive: true },

  // 8. Pharmacy (ফার্মেসি)
  { categoryId: "pharmacy", nameBn: "জ্বর ও ব্যথানাশক", nameEn: "Fever & Pain Relief", order: 1, isActive: true },
  { categoryId: "pharmacy", nameBn: "গ্যাস্ট্রিক ও অ্যাসিডিটি", nameEn: "Gastric & Acidity", order: 2, isActive: true },
  { categoryId: "pharmacy", nameBn: "সর্দি, কাশি ও অ্যান্টিহিস্টামিন", nameEn: "Cold & Cough", order: 3, isActive: true },
  { categoryId: "pharmacy", nameBn: "স্যালাইন, ভিটামিন ও পুষ্টি", nameEn: "Saline & Vitamins", order: 4, isActive: true },
  { categoryId: "pharmacy", nameBn: "ফার্স্ট এইড ও ব্যান্ডেজ", nameEn: "First Aid & Antiseptics", order: 5, isActive: true },
  { categoryId: "pharmacy", nameBn: "ঔষধ ও প্রেসক্রিপশন আইটেম", nameEn: "Prescription Medicines", order: 6, isActive: true },

  // 9. Pet Care / Shutki (শুঁটকি মাছ)
  { categoryId: "pet-care", nameBn: "টাকি ও চিলা মাছের শুঁটকি", nameEn: "Taki & Chila Shutki", order: 1, isActive: true },
  { categoryId: "pet-care", nameBn: "চিংড়ি শুঁটকি", nameEn: "Shrimp Shutki", order: 2, isActive: true },
  { categoryId: "pet-care", nameBn: "লইট্যা ও কাচকি শুঁটকি", nameEn: "Loitta & Kachki Shutki", order: 3, isActive: true },

  // 10. Offers (পান সুপারি ও স্পেশাল অফার)
  { categoryId: "offers", nameBn: "দেশি পান পাতা", nameEn: "Betel Leaves", order: 1, isActive: true },
  { categoryId: "offers", nameBn: "কাটা ও গোটা সুপারি", nameEn: "Betel Nut", order: 2, isActive: true },
  { categoryId: "offers", nameBn: "চুন ও খয়ের", nameEn: "Lime & Catechu", order: 3, isActive: true },
  { categoryId: "offers", nameBn: "জর্দা ও মসলা", nameEn: "Zarda & Spices", order: 4, isActive: true },

  // 11. Dry Food (ড্রাই ফুড)
  { categoryId: "frozen", nameBn: "খাদ্যশস্য ও ডাল", nameEn: "Grains & Pulses", order: 1, isActive: true },
  { categoryId: "frozen", nameBn: "ড্রাই ফ্রুটস ও বাদাম", nameEn: "Dry Fruits & Nuts", order: 2, isActive: true },
  { categoryId: "frozen", nameBn: "বিস্কুট ও কুকিজ", nameEn: "Biscuits & Cookies", order: 3, isActive: true },
  { categoryId: "frozen", nameBn: "নুডলস, পাস্তা ও সুপ", nameEn: "Noodles, Pasta & Soup", order: 4, isActive: true },
  { categoryId: "frozen", nameBn: "চানাচুর, চিপস ও স্ন্যাক্স", nameEn: "Chanachur, Chips & Snacks", order: 5, isActive: true },
  { categoryId: "frozen", nameBn: "চা ও কফি", nameEn: "Tea & Coffee", order: 6, isActive: true },
  { categoryId: "frozen", nameBn: "অন্যান্য ড্রাই ফুড", nameEn: "Other Dry Food", order: 7, isActive: true },

  // 12. Confectionery (কনফেকশনারি)
  { categoryId: "snacks-biscuits", nameBn: "চিপস ও পপকর্ন", nameEn: "Chips & Popcorn", order: 1, isActive: true },
  { categoryId: "snacks-biscuits", nameBn: "বাদাম, ডাল ও চানাচুর", nameEn: "Nuts, Pulses & Chanachur", order: 2, isActive: true },
  { categoryId: "snacks-biscuits", nameBn: "আইসক্রিম ও ডেইরি ডিলাইট", nameEn: "Ice Cream & Dairy Delight", order: 3, isActive: true },
  { categoryId: "snacks-biscuits", nameBn: "পানীয়, জুস ও বেভারেজ", nameEn: "Beverages, Juice & Drinks", order: 4, isActive: true },
  { categoryId: "snacks-biscuits", nameBn: "চা, কফি ও হেলথ ড্রিংকস", nameEn: "Tea, Coffee & Health Drinks", order: 5, isActive: true },
  { categoryId: "snacks-biscuits", nameBn: "কেক, চকলেট ও মিষ্টি কনফেকশনারি", nameEn: "Cakes, Chocolates & Sweets", order: 6, isActive: true },
  { categoryId: "snacks-biscuits", nameBn: "বিস্কুট ও কুকিজ", nameEn: "Biscuits & Cookies", order: 7, isActive: true },
  { categoryId: "snacks-biscuits", nameBn: "চকলেট ও ক্যান্ডি", nameEn: "Chocolates & Candies", order: 8, isActive: true },
  { categoryId: "snacks-biscuits", nameBn: "কেক, বান ও পাউরুটি", nameEn: "Cakes, Buns & Bread", order: 9, isActive: true },

  // 13. Mobile Zone (মোবাইল জোন)
  { categoryId: "mobile-zone", nameBn: "Vivo (ভিভো)", nameEn: "Vivo", order: 1, isActive: true },
  { categoryId: "mobile-zone", nameBn: "Redmi / Xiaomi (রেডমি)", nameEn: "Redmi / Xiaomi", order: 2, isActive: true },
  { categoryId: "mobile-zone", nameBn: "OPPO (অপ্পো)", nameEn: "OPPO", order: 3, isActive: true },
  { categoryId: "mobile-zone", nameBn: "TECNO (টেকনো)", nameEn: "TECNO", order: 4, isActive: true },
  { categoryId: "mobile-zone", nameBn: "itel (আইটেল)", nameEn: "itel", order: 5, isActive: true },
  { categoryId: "mobile-zone", nameBn: "GDL / Grameen (গ্রামীণ)", nameEn: "GDL / Grameen", order: 6, isActive: true },
  { categoryId: "mobile-zone", nameBn: "Infinix (ইনফিনিক্স)", nameEn: "Infinix", order: 7, isActive: true },

  // 14. Event Management (ইভেন্ট ম্যানেজমেন্ট)
  { 
    categoryId: "pet-food-care", 
    categorySlug: "event-management",
    nameBn: "মঞ্চ সাজানো", 
    nameEn: "Stage Decoration", 
    slug: "stage-decoration",
    descriptionBn: "বিয়ে, হলুদ ও জন্মদিনের প্রফেশনাল স্টেজ ডিজাইন।",
    descriptionEn: "Professional stage design for weddings, holud, and birthdays.",
    description: "বিয়ে, হলুদ ও জন্মদিনের প্রফেশনাল স্টেজ ডিজাইন।",
    order: 1, 
    isActive: true,
    iconName: "Sparkles"
  },
  { 
    categoryId: "pet-food-care", 
    categorySlug: "event-management",
    nameBn: "প্রবেশদ্বার ও আলোকসজ্জা", 
    nameEn: "Gate & Lighting", 
    slug: "gate-lighting",
    descriptionBn: "ওয়েলকাম গেট এবং আধুনিক লাইটিং সেটআপ।",
    descriptionEn: "Welcome gate and modern lighting setup.",
    description: "ওয়েলকাম গেট এবং আধুনিক লাইটিং সেটআপ।",
    order: 2, 
    isActive: true,
    iconName: "Lamp"
  },
  { 
    categoryId: "pet-food-care", 
    categorySlug: "event-management",
    nameBn: "বাসর ঘর ডেকোরেশন", 
    nameEn: "Bridal Room Decor", 
    slug: "bridal-room-decor",
    descriptionBn: "ফুল ও রোমান্টিক লাইটিং দিয়ে বাসর ঘর সাজানো।",
    descriptionEn: "Decorating bridal room with flowers and romantic lighting.",
    description: "ফুল ও রোমান্টিক লাইটিং দিয়ে বাসর ঘর সাজানো।",
    order: 3, 
    isActive: true,
    iconName: "Heart"
  },
  { 
    categoryId: "pet-food-care", 
    categorySlug: "event-management",
    nameBn: "বরের গাড়ি সাজানো", 
    nameEn: "Wedding Car Decor", 
    slug: "wedding-car-decor",
    descriptionBn: "তাজা ফুল দিয়ে প্রিমিয়াম কার ডেকোরেশন।",
    descriptionEn: "Premium wedding car decoration with fresh flowers.",
    description: "তাজা ফুল দিয়ে প্রিমিয়াম কার ডেকোরেশন।",
    order: 4, 
    isActive: true,
    iconName: "Car"
  },
  { 
    categoryId: "pet-food-care", 
    categorySlug: "event-management",
    nameBn: "ফটোগ্রাফি ও সিনেমাটোগ্রাফি", 
    nameEn: "Photo & Cinematography", 
    slug: "photo-cinematography",
    descriptionBn: "স্মরণীয় মুহূর্তের প্রফেশনাল ফটো ও ভিডিওগ্রাফি।",
    descriptionEn: "Professional photography and cinematography for memorable moments.",
    description: "স্মরণীয় মুহূর্তের প্রফেশনাল ফটো ও ভিডিওগ্রাফি।",
    order: 5, 
    isActive: true,
    iconName: "Camera"
  },
  { 
    categoryId: "pet-food-care", 
    categorySlug: "event-management",
    nameBn: "সাউন্ড ও ডিজে", 
    nameEn: "Sound & DJ System", 
    slug: "sound-dj-system",
    descriptionBn: "হাই-কোয়ালিটি সাউন্ড এবং হলুদের ডিজে নাইট।",
    descriptionEn: "High-quality sound system and DJ night for haldi/events.",
    description: "হাই-কোয়ালিটি সাউন্ড এবং হলুদের ডিজে নাইট।",
    order: 6, 
    isActive: true,
    iconName: "Volume2"
  },
  { 
    categoryId: "pet-food-care", 
    categorySlug: "event-management",
    nameBn: "ক্যাটারিং ও ফুড সার্ভিস", 
    nameEn: "Catering Service", 
    slug: "catering-service",
    descriptionBn: "সুস্বাদু খাবার রান্না ও মেহমানদারি ব্যবস্থাপনা।",
    descriptionEn: "Delicious cuisine cooking and complete guest catering management.",
    description: "সুস্বাদু খাবার রান্না ও মেহমানদারি ব্যবস্থাপনা।",
    order: 7, 
    isActive: true,
    iconName: "UtensilsCrossed"
  },
  { 
    categoryId: "pet-food-care", 
    categorySlug: "event-management",
    nameBn: "রেন্ট-এ-কার", 
    nameEn: "Car Rental", 
    slug: "car-rental",
    descriptionBn: "বর-কনে ও বরযাত্রীদের জন্য নিরাপদ গাড়ি সার্ভিস।",
    descriptionEn: "Safe and reliable car rental service for bride, groom, and guests.",
    description: "বর-কনে ও বরযাত্রীদের জন্য নিরাপদ গাড়ি সার্ভিস।",
    order: 8, 
    isActive: true,
    iconName: "Car"
  }
];

/**
 * Fetches subcategories for a given category sorted by `order asc`.
 * If firestore has no subcategories for this category, bootstraps defaults cleanly.
 */
export async function getSubcategoriesForCategory(categoryId: string): Promise<Subcategory[]> {
  if (!categoryId) return [];
  const normalizedCatId = (
    categoryId === "dry-food" || 
    categoryId === "dryfood" || 
    categoryId === "dry-foods" || 
    categoryId === "dry food" || 
    categoryId === "ড্রাই ফুড" || 
    categoryId === "ড্রাইফুড"
  ) ? "frozen" : (
    (
      categoryId === "confectionery" ||
      categoryId === "confectionary" ||
      categoryId === "confectionery-snacks" ||
      categoryId === "snacks-biscuits" ||
      categoryId === "snacks" ||
      categoryId === "bakery" ||
      categoryId === "কনফেকশনারি" ||
      categoryId === "কনফেকশনারি ও স্ন্যাকস" ||
      categoryId === "কনফেকশনারী"
    ) ? "snacks-biscuits" : (
      (
        categoryId === "event-management" ||
        categoryId === "event" ||
        categoryId === "events" ||
        categoryId === "ইভেন্ট ম্যানেজমেন্ট" ||
        categoryId === "ইভেন্ট" ||
        categoryId === "pet-food-care"
      ) ? "pet-food-care" : categoryId
    )
  );
  try {
    const q = query(
      collection(db, "subcategories"),
      where("categoryId", "==", normalizedCatId),
      where("isDeleted", "==", false),
      orderBy("order", "asc")
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list: Subcategory[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Subcategory));
      return list;
    }
  } catch (err) {
    console.warn("Notice fetching subcategories query with index:", err);
    // Fallback query without index if index is building
    try {
      const qFallback = query(
        collection(db, "subcategories"),
        where("categoryId", "==", categoryId)
      );
      const snap = await getDocs(qFallback);
      const list: Subcategory[] = [];
      snap.forEach(d => {
        const data = d.data() as any;
        if (!data.isDeleted) {
          list.push({ id: d.id, ...data });
        }
      });
      return list.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (e) {
      console.warn("Fallback query notice:", e);
    }
  }
  return [];
}

/**
 * Subscribes in real-time to all subcategories ordered by `order asc`.
 */
export function subscribeToAllSubcategories(
  callback: (subcategories: Subcategory[]) => void
) {
  try {
    const q = query(
      collection(db, "subcategories"),
      where("isDeleted", "==", false),
      orderBy("order", "asc")
    );
    return onSnapshot(
      q,
      (snap) => {
        const list: Subcategory[] = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Subcategory;
          if (item.categoryId === "spices-oils" || item.categoryId === "spices" || item.categoryId === "staples" || item.categoryId === "oil-spices") {
            item.categoryId = "groceries";
          }
          list.push(item);
        });
        callback(list);
      },
      (err) => {
        console.warn("Subcategories onSnapshot notice, falling back to basic query:", err.message);
        // Fallback without composite index requirement
        const qFallback = query(collection(db, "subcategories"));
        return onSnapshot(qFallback, (snap) => {
          const list: Subcategory[] = [];
          snap.forEach(d => {
            const data = d.data() as any;
            if (!data.isDeleted) {
              const item = { id: d.id, ...data } as Subcategory;
              if (item.categoryId === "spices-oils" || item.categoryId === "spices" || item.categoryId === "staples" || item.categoryId === "oil-spices") {
                item.categoryId = "groceries";
              }
              list.push(item);
            }
          });
          list.sort((a, b) => (a.order || 0) - (b.order || 0));
          callback(list);
        });
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe to subcategories:", err);
    return () => {};
  }
}

/**
 * Updates a subcategory's order in Firestore.
 */
export async function updateSubcategoryOrder(
  subcategoryId: string, 
  newOrder: number
): Promise<void> {
  if (!subcategoryId) return;
  const ref = doc(db, "subcategories", subcategoryId);
  await updateDoc(ref, {
    order: Number(newOrder) || 0,
    updatedAt: serverTimestamp()
  });
}

/**
 * Creates or updates a subcategory in Firestore.
 */
export async function saveSubcategory(
  subcategory: Partial<Subcategory> & { categoryId: string; nameBn: string; nameEn?: string }
): Promise<string> {
  const id = subcategory.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ref = doc(db, "subcategories", id);

  const payload: Subcategory = {
    id,
    categoryId: subcategory.categoryId,
    categorySlug: subcategory.categorySlug || (subcategory.categoryId === "pet-food-care" ? "event-management" : subcategory.categoryId),
    nameBn: subcategory.nameBn.trim(),
    nameEn: (subcategory.nameEn || subcategory.nameBn).trim(),
    slug: subcategory.slug || "",
    descriptionBn: subcategory.descriptionBn || subcategory.description || "",
    descriptionEn: subcategory.descriptionEn || "",
    description: subcategory.description || subcategory.descriptionBn || "",
    order: typeof subcategory.order === "number" ? subcategory.order : 1,
    iconName: subcategory.iconName || "Layers",
    image: subcategory.image || "",
    imageUrl: subcategory.imageUrl || subcategory.image || "",
    isActive: subcategory.isActive !== false,
    isDeleted: false,
    updatedAt: serverTimestamp()
  };

  await setDoc(ref, payload, { merge: true });

  // Real-time automatic sync to Supabase
  syncSingleSubcategoryToSupabase(payload).catch((err) => {
    console.warn("[Supabase] Notice auto-syncing subcategory:", err);
  });

  return id;
}

/**
 * Soft deletes a subcategory from Firestore.
 */
export async function softDeleteSubcategory(subcategoryId: string): Promise<void> {
  if (!subcategoryId) return;
  const ref = doc(db, "subcategories", subcategoryId);
  await updateDoc(ref, {
    isDeleted: true,
    isActive: false,
    updatedAt: serverTimestamp()
  });

  // Real-time automatic update in Supabase
  syncSingleSubcategoryToSupabase({ id: subcategoryId, isDeleted: true, isActive: false }).catch(() => {});
}

/**
 * Seeds initial subcategories into Firestore if the collection is empty.
 */
export async function bootstrapInitialSubcategoriesIfNeeded(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, "subcategories"));
    if (snap.size > 0) {
      return snap.size;
    }

    console.log("[Subcategories] Collection is empty. Bootstrapping default subcategories...");
    let count = 0;
    for (const sub of DEFAULT_SUBCATEGORIES) {
      const id = `sub_${sub.categoryId}_${sub.order}_${sub.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 15)}`;
      await setDoc(doc(db, "subcategories", id), {
        id,
        ...sub,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      count++;
    }
    console.log(`[Subcategories] Successfully seeded ${count} default subcategories into Firestore.`);
    return count;
  } catch (err) {
    console.warn("Notice bootstrapping subcategories:", err);
    return 0;
  }
}

/**
 * Seeds or updates the 8 official Event Management subcategories in Firestore.
 */
export async function bootstrapEventManagementSubcategories(): Promise<number> {
  try {
    const eventSubs = DEFAULT_SUBCATEGORIES.filter(s => s.categoryId === "pet-food-care");
    let count = 0;
    for (const sub of eventSubs) {
      const slug = (sub as any).slug || sub.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const id = `sub_event_${sub.order}_${slug.replace(/-/g, "_")}`;
      await setDoc(doc(db, "subcategories", id), {
        id,
        ...sub,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      count++;
    }

    const EVENT_IMAGE = "https://res.cloudinary.com/upvkzb3p/image/upload/v1790502262/Gemini_Generated_Image_56vcn756vcn756vc_gq1xfi.jpg";

    // Also update categories/pet-food-care with subcategories array & proper metadata
    await setDoc(doc(db, "categories", "pet-food-care"), {
      nameBn: "ইভেন্ট ম্যানেজমেন্ট",
      nameEn: "Event Management",
      slug: "event-management",
      categorySlug: "event-management",
      iconName: "Sparkles",
      image: EVENT_IMAGE,
      imageUrl: EVENT_IMAGE,
      banner: EVENT_IMAGE,
      bannerUrl: EVENT_IMAGE,
      order: 16,
      displayOrder: 16,
      subcategories: eventSubs.map(s => ({
        nameBn: s.nameBn,
        nameEn: s.nameEn,
        slug: (s as any).slug,
        description: (s as any).description,
        order: s.order
      })),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Also create/update categories/event-management alias document
    await setDoc(doc(db, "categories", "event-management"), {
      nameBn: "ইভেন্ট ম্যানেজমেন্ট",
      nameEn: "Event Management",
      slug: "event-management",
      targetCategoryId: "pet-food-care",
      iconName: "Sparkles",
      image: EVENT_IMAGE,
      imageUrl: EVENT_IMAGE,
      banner: EVENT_IMAGE,
      bannerUrl: EVENT_IMAGE,
      order: 16,
      displayOrder: 16,
      subcategories: eventSubs.map(s => ({
        nameBn: s.nameBn,
        nameEn: s.nameEn,
        slug: (s as any).slug,
        description: (s as any).description,
        order: s.order
      })),
      updatedAt: serverTimestamp()
    }, { merge: true });

    return count;
  } catch (err) {
    console.warn("Notice bootstrapping event management subcategories:", err);
    return 0;
  }
}

