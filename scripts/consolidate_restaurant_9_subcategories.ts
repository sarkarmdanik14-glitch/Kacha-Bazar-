import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { RESTAURANT_SUBCATEGORIES, getResolvedRestaurantSubcategory } from "../src/lib/restaurantSubcategories";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = initializeApp(config);
const db = config.firestoreDatabaseId 
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

// Map definition for the 9 standardized subcategories
const SUBCATEGORY_DOCS = [
  { id: "sub_rest_1_biryani_rice", stdId: "biryani-rice", nameBn: "বিরিয়ানি, পোলাও ও রাইস", nameEn: "Biryani, Polao & Rice", iconEmoji: "🍲", order: 1 },
  { id: "sub_rest_2_burger_sandwich", stdId: "burger-sandwich-shawarma", nameBn: "বার্গার, স্যান্ডউইচ ও শাওয়ার্মা", nameEn: "Burger, Sandwich & Shawarma", iconEmoji: "🍔", order: 2 },
  { id: "sub_rest_3_pizza_pasta", stdId: "pizza-pasta-chowmein", nameBn: "পিজ্জা, পাস্তা ও চাউমিন", nameEn: "Pizza, Pasta & Chowmein", iconEmoji: "🍕", order: 3 },
  { id: "sub_rest_4_chicken_wings", stdId: "fried-chicken-wings", nameBn: "চিকেন ফ্রাই, উইংস ও ললিপপ", nameEn: "Fried Chicken, Wings & Lollipops", iconEmoji: "🍗", order: 4 },
  { id: "sub_rest_5_grill_sizzling", stdId: "grill-sizzling-kabab", nameBn: "গ্রিল, সিজলিং ও কাবাব", nameEn: "Grill, Sizzling & Kabab", iconEmoji: "🍢", order: 5 },
  { id: "sub_rest_6_appetizers_soup", stdId: "appetizers-fastfood-soup", nameBn: "অ্যাপেটাইজার, ফাস্ট ফুড ও স্যুপ", nameEn: "Snacks, Soup & Salad", iconEmoji: "🍟", order: 6 },
  { id: "sub_rest_7_curry_chinese", stdId: "curry-chinese", nameBn: "দেশি তরকারি ও চাইনিজ ডিশ", nameEn: "Curry & Chinese Dishes", iconEmoji: "🍛", order: 7 },
  { id: "sub_rest_8_naan_roti", stdId: "naan-roti-halim", nameBn: "নান, রুটি, পরোটা ও হালিম", nameEn: "Naan, Roti & Halim", iconEmoji: "🫓", order: 8 },
  { id: "sub_rest_9_drinks_sweets", stdId: "drinks-juice-sweets", nameBn: "পানীয়, জুস ও মিষ্টি", nameEn: "Drinks, Juice & Sweets", iconEmoji: "🥤", order: 9 }
];

async function main() {
  console.log("=== Updating Firestore products with 2-pass resolver ===");
  const prodSnap = await getDocs(collection(db, "products"));
  let updatedCount = 0;
  const breakdown: Record<string, string[]> = {};
  SUBCATEGORY_DOCS.forEach(s => breakdown[s.nameBn] = []);

  for (const docSnap of prodSnap.docs) {
    const p = docSnap.data();
    const cat = (p.category || "").toLowerCase();
    const catId = (p.categoryId || "").toLowerCase();

    const isRest = cat.includes("restaurant") || cat.includes("রেস্টুরেন্ট") || 
                   catId.includes("restaurant") || catId === "bakery-sweets" || cat === "bakery-sweets";

    if (!isRest) continue;

    // Use nameBn to resolve canonical subcategory
    const resolvedBn = getResolvedRestaurantSubcategory({ nameBn: p.nameBn, nameEn: p.nameEn });
    const subDef = SUBCATEGORY_DOCS.find(s => s.nameBn === resolvedBn) || SUBCATEGORY_DOCS[0];

    breakdown[subDef.nameBn].push(p.nameBn);
    updatedCount++;

    await updateDoc(doc(db, "products", docSnap.id), {
      category: "রেস্টুরেন্ট",
      categoryId: "bakery-sweets",
      subcategory: subDef.nameBn,
      subCategory: subDef.nameBn,
      subcategoryId: subDef.id,
      subCategoryId: subDef.id,
      updatedAt: new Date().toISOString()
    });
  }

  console.log(`\nSuccessfully updated ${updatedCount} restaurant products in Firestore!\n`);
  SUBCATEGORY_DOCS.forEach(s => {
    const items = breakdown[s.nameBn];
    console.log(`=== ${s.order}. ${s.nameBn} (${items.length} items) ===`);
    console.log(items.join(", ") + "\n");
  });

  process.exit(0);
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
