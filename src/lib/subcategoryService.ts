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

  // 7. Bakery & Restaurant (রেস্টুরেন্ট ও বেকারি)
  { categoryId: "bakery-sweets", nameBn: "বার্গার, পিৎজা ও স্যান্ডউইচ", nameEn: "Fast Food & Snacks", order: 1, isActive: true },
  { categoryId: "bakery-sweets", nameBn: "বিরিয়ানি ও সেট মেনু", nameEn: "Biryani & Set Menu", order: 2, isActive: true },
  { categoryId: "bakery-sweets", nameBn: "কাবার ও গ্রিল", nameEn: "Kebab & Grill", order: 3, isActive: true },
  { categoryId: "bakery-sweets", nameBn: "মিষ্টি ও ডেজার্ট", nameEn: "Sweets & Desserts", order: 4, isActive: true },

  // 8. Pharmacy (ফার্মেসি)
  { categoryId: "pharmacy", nameBn: "জ্বর ও ব্যথানাশক", nameEn: "Fever & Pain Relief", order: 1, isActive: true },
  { categoryId: "pharmacy", nameBn: "গ্যাস্ট্রিক ও অ্যাসিডিটি", nameEn: "Gastric & Acidity", order: 2, isActive: true },
  { categoryId: "pharmacy", nameBn: "সর্দি, কাশি ও অ্যান্টিহিস্টামিন", nameEn: "Cold & Cough", order: 3, isActive: true },
  { categoryId: "pharmacy", nameBn: "স্যালাইন, ভিটামিন ও পুষ্টি", nameEn: "Saline & Vitamins", order: 4, isActive: true },
  { categoryId: "pharmacy", nameBn: "ফার্স্ট এইড ও ব্যান্ডেজ", nameEn: "First Aid & Antiseptics", order: 5, isActive: true },

  // 9. Pet Care / Shutki (শুঁটকি মাছ)
  { categoryId: "pet-care", nameBn: "টাকি ও চিলা মাছের শুঁটকি", nameEn: "Taki & Chila Shutki", order: 1, isActive: true },
  { categoryId: "pet-care", nameBn: "চিংড়ি শুঁটকি", nameEn: "Shrimp Shutki", order: 2, isActive: true },
  { categoryId: "pet-care", nameBn: "লইট্যা ও কাচকি শুঁটকি", nameEn: "Loitta & Kachki Shutki", order: 3, isActive: true },

  // 10. Offers (পান সুপারি ও স্পেশাল অফার)
  { categoryId: "offers", nameBn: "দেশি পান পাতা", nameEn: "Betel Leaves", order: 1, isActive: true },
  { categoryId: "offers", nameBn: "কাটা ও গোটা সুপারি", nameEn: "Betel Nut", order: 2, isActive: true },
  { categoryId: "offers", nameBn: "চুন ও খয়ের", nameEn: "Lime & Catechu", order: 3, isActive: true },
  { categoryId: "offers", nameBn: "জর্দা ও মসলা", nameEn: "Zarda & Spices", order: 4, isActive: true }
];

/**
 * Fetches subcategories for a given category sorted by `order asc`.
 * If firestore has no subcategories for this category, bootstraps defaults cleanly.
 */
export async function getSubcategoriesForCategory(categoryId: string): Promise<Subcategory[]> {
  if (!categoryId) return [];
  try {
    const q = query(
      collection(db, "subcategories"),
      where("categoryId", "==", categoryId),
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
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Subcategory));
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
              list.push({ id: d.id, ...data } as Subcategory);
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
    nameBn: subcategory.nameBn.trim(),
    nameEn: (subcategory.nameEn || subcategory.nameBn).trim(),
    order: typeof subcategory.order === "number" ? subcategory.order : 1,
    iconName: subcategory.iconName || "Layers",
    image: subcategory.image || "",
    imageUrl: subcategory.imageUrl || subcategory.image || "",
    isActive: subcategory.isActive !== false,
    isDeleted: false,
    updatedAt: serverTimestamp()
  };

  await setDoc(ref, payload, { merge: true });
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
