import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import fs from "fs";
import path from "path";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = initializeApp(config);
const db = config.firestoreDatabaseId 
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

interface RestaurantCandidate {
  nameBn: string;
  nameEn: string;
  unitBn: string;
  unitEn: string;
  price: number;
  subcategoryId: string;
  subcategory: string;
  image: string;
  descriptionBn: string;
  descriptionEn: string;
}

const CANDIDATES: RestaurantCandidate[] = [
  {
    nameBn: "শাহী মোরগ পোলাও (ডিমসহ)",
    nameEn: "Shahi Morog Polao (with Egg)",
    unitBn: "০১ প্লেট",
    unitEn: "1 Plate",
    price: 160,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "ঘিয়ে ভাজা সুগন্ধি চিনিগুঁড়া চালের পোলাও, সুস্বাদু রোস্ট করা দেশি মুরগির টুকরো এবং সিদ্ধ ডিম।",
    descriptionEn: "Aromatic ghee-cooked Chinigura polao served with spiced tender chicken roast and boiled egg."
  },
  {
    nameBn: "বাসমতি খাসির কাচ্চি (ডিমসহ)",
    nameEn: "Basmati Mutton Kacchi (with Egg)",
    unitBn: "০১ প্লেট",
    unitEn: "1 Plate",
    price: 220,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "দীর্ঘ দানার খাঁটি বাসমতি চালে দম দেয়া নরম তুলতুলে খাসির মাংস, শাহী আলু ও ডিমের ঐতিহ্যবাহী কাচ্চি বিরিয়ানি।",
    descriptionEn: "Authentic dum cooked long-grain Basmati rice with succulent mutton chunks, spiced potato, and egg."
  },
  {
    nameBn: "মুরগির বিরিয়ানী (হাফ)",
    nameEn: "Chicken Biryani (Half)",
    unitBn: "হাফ প্লেট",
    unitEn: "Half Plate",
    price: 100,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "সুস্বাদু ও ঝরঝরে মোরগ বিরিয়ানি (হাফ প্লেট সাইজ), এক জনের তৃপ্তিদায়ক খাবারের জন্য পারফেক্ট।",
    descriptionEn: "Flavorful and aromatic chicken biryani (half portion), perfect single serving."
  },
  {
    nameBn: "মুরগির বিরিয়ানী (ফুল)",
    nameEn: "Chicken Biryani (Full)",
    unitBn: "ফুল প্লেট",
    unitEn: "Full Plate",
    price: 200,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "পরিপূর্ণ মসলাযুক্ত সুস্বাদু মুরগির বিরিয়ানি (ফুল প্লেট), বড় টুকরো মুরগি ও ডিমসহ পরিবেশন।",
    descriptionEn: "Rich spiced traditional chicken biryani (full portion) served with large succulent chicken piece."
  },
  {
    nameBn: "চিকেন দম বিরিয়ানী (বাসমতি)",
    nameEn: "Basmati Chicken Dum Biryani",
    unitBn: "ফুল প্লেট",
    unitEn: "Full Plate",
    price: 180,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "হালকা আঁচে দমে রান্না করা প্রিমিয়াম বাসমতি চালের স্পেশাল হায়দ্রাবাদি স্টাইল চিকেন দম বিরিয়ানি।",
    descriptionEn: "Slow dum-cooked premium Basmati long-grain rice layered with marinated tender chicken and fresh herbs."
  },
  {
    nameBn: "খাসির তেহেরী (ফুল)",
    nameEn: "Mutton Tehari (Full)",
    unitBn: "ফুল প্লেট",
    unitEn: "Full Plate",
    price: 240,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1642821373181-696a54913e93?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "পুরান ঢাকার খাঁটি রেসিপিতে খাঁটি সরিষার তেলে রান্না করা ঝাল সুগন্ধি খাসির মাংসের তেহেরী (ফুল প্লেট)।",
    descriptionEn: "Authentic Old Dhaka style mustard oil infused aromatic Mutton Tehari with whole green chilies (full plate)."
  },
  {
    nameBn: "খাসির তেহেরী (হাফ)",
    nameEn: "Mutton Tehari (Half)",
    unitBn: "হাফ প্লেট",
    unitEn: "Half Plate",
    price: 130,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1642821373181-696a54913e93?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "খাঁটি সরিষার তেলে রান্না করা নরম খাসির মাংসের সুস্বাদু তেহেরী (হাফ প্লেট)।",
    descriptionEn: "Authentic Old Dhaka style mustard oil cooked flavorful Mutton Tehari (half plate)."
  },
  {
    nameBn: "ডিম পোলাও (হাফ)",
    nameEn: "Egg Polao (Half)",
    unitBn: "হাফ প্লেট",
    unitEn: "Half Plate",
    price: 60,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "ঘিয়ে ভাজা সুগন্ধি পোলাও চালের সাথে সোনালী ভাজা সিদ্ধ ডিম (হাফ প্লেট)।",
    descriptionEn: "Aromatic ghee-fried fragrant polao served with golden fried egg (half plate portion)."
  },
  {
    nameBn: "ডিম পোলাও (ফুল)",
    nameEn: "Egg Polao (Full)",
    unitBn: "ফুল প্লেট",
    unitEn: "Full Plate",
    price: 120,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "ঘিয়ে ভাজা সুগন্ধি পোলাও চালের সাথে জোড়া সোনালী ভাজা সিদ্ধ ডিম ও সালাদ (ফুল প্লেট)।",
    descriptionEn: "Rich fragrant ghee-cooked polao rice served with golden fried eggs and fresh salad (full plate)."
  },
  {
    nameBn: "ভুনা খিচুড়ি (ডিম হাফ)",
    nameEn: "Bhuna Khichuri (with Half Egg)",
    unitBn: "০১ প্লেট",
    unitEn: "1 Plate",
    price: 60,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "ভাজা মুগ ডাল ও সুগন্ধি চালের ঝরঝরে সোনালী ভুনা খিচুড়ি সাথে সিদ্ধ ডিমের অর্ধাংশ।",
    descriptionEn: "Traditional golden roasted moong dal and aromatic rice bhuna khichuri served with half egg."
  },
  {
    nameBn: "বোরহানী (১ লিটার)",
    nameEn: "Borhani (1 Liter)",
    unitBn: "১ লিটার",
    unitEn: "1 Liter",
    price: 160,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "খাঁটি টক দই, পুদিনা পাতা, ধনেপাতা, বিট লবণ ও শাহী মসলার ঐতিহ্যবাহী ঢাকাই বোরহানী (১ লিটার ফ্যামিলি বোতল)।",
    descriptionEn: "Traditional spiced Dhaka-style chilled yogurt beverage Borhani with mint, coriander, and black salt (1 Liter Bottle)."
  },
  {
    nameBn: "বোরহানী (হাফ লিটার)",
    nameEn: "Borhani (500ml)",
    unitBn: "৫০০ মিলি",
    unitEn: "500ml",
    price: 80,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "ঐতিহ্যবাহী স্বাদের ঠান্ডা ও স্বাস্থ্যকর পুদিনা-টকদের ঢাকাই বোরহানী (৫০০ মিলি বোতল)।",
    descriptionEn: "Chilled traditional spiced yogurt drink Borhani with mint and digestives (500ml bottle)."
  },
  {
    nameBn: "বোরহানী (গ্লাস)",
    nameEn: "Borhani (Per Glass)",
    unitBn: "প্রতি গ্লাস",
    unitEn: "Per Glass",
    price: 40,
    subcategoryId: "sub_bakery-sweets_2_biryani___set_m",
    subcategory: "বিরিয়ানি ও সেট মেনু",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    descriptionBn: "এক গ্লাস তাজা ও ঠান্ডা হজমিকারক সুস্বাদু শাহী বোরহানী।",
    descriptionEn: "Single chilled glass of authentic zesty digestif Shahi Borhani."
  }
];

function normalizeStr(s: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function addMissingRestaurantItems() {
  console.log("=== STARTING STRICT DUPLICATE-CHECK RESTAURANT PRODUCT INSERTION ===");

  // 1. Fetch all existing products from Firestore
  const snap = await getDocs(collection(db, "products"));
  console.log(`Total products currently in Firestore: ${snap.size}`);

  const existingRestaurantItems: Array<{ id: string; nameBn: string; nameEn: string; category: string }> = [];

  snap.forEach(d => {
    const data = d.data();
    const cat = normalizeStr(data.category || data.categoryId || "");
    const isRestaurantCat = 
      cat === "bakery-sweets" || 
      cat === "restaurant" || 
      cat === "bakery" || 
      cat === "রেস্টুরেন্ট" || 
      cat === "রেস্তোরাঁ" ||
      cat.includes("restaurant") ||
      cat.includes("রেস্টুরেন্ট");

    if (isRestaurantCat) {
      existingRestaurantItems.push({
        id: d.id,
        nameBn: data.nameBn || "",
        nameEn: data.nameEn || "",
        category: data.category || data.categoryId
      });
    }
  });

  console.log(`Found ${existingRestaurantItems.length} existing products under Restaurant/Bakery category.`);

  let insertedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < CANDIDATES.length; i++) {
    const item = CANDIDATES[i];
    const normBn = normalizeStr(item.nameBn);
    const normEn = normalizeStr(item.nameEn);

    // Check duplicate
    const duplicate = existingRestaurantItems.find(ex => {
      const exBn = normalizeStr(ex.nameBn);
      const exEn = normalizeStr(ex.nameEn);
      return exBn === normBn || exEn === normEn;
    });

    if (duplicate) {
      console.log(`[SKIP - DUPLICATE EXISTS]: "${item.nameBn}" / "${item.nameEn}" matches existing product [${duplicate.id}] "${duplicate.nameBn}" / "${duplicate.nameEn}"`);
      skippedCount++;
      continue;
    }

    // Generate unique ID
    const slug = normEn.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 20);
    const uniqueId = `rest_item_${Date.now().toString(36)}_${i + 1}_${slug}`;

    const newProductPayload = {
      id: uniqueId,
      nameBn: item.nameBn.trim(),
      nameEn: item.nameEn.trim(),
      price: item.price,
      originalPrice: item.price,
      unitBn: item.unitBn.trim(),
      unitEn: item.unitEn.trim(),
      category: "bakery-sweets",
      categoryId: "bakery-sweets",
      subcategoryId: item.subcategoryId,
      subcategory: item.subcategory,
      inStock: true,
      stock: 100,
      isAvailable: true,
      isDeleted: false,
      deleted: false,
      status: "active",
      image: item.image,
      imageUrl: item.image,
      rating: 4.9,
      reviewCount: 20 + Math.floor(Math.random() * 25),
      brand: "কাচা বাজার রেস্টুরেন্ট",
      descriptionBn: item.descriptionBn,
      descriptionEn: item.descriptionEn,
      displayOrder: 100 + i,
      order: 100 + i,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log(`[INSERTING]: [${uniqueId}] "${item.nameBn}" - ৳${item.price}`);
    await setDoc(doc(db, "products", uniqueId), newProductPayload, { merge: true });

    // Track as existing so subsequent items in candidates don't collide
    existingRestaurantItems.push({
      id: uniqueId,
      nameBn: item.nameBn,
      nameEn: item.nameEn,
      category: "bakery-sweets"
    });

    insertedCount++;
  }

  console.log("==========================================");
  console.log(`COMPLETED: ${insertedCount} items safely inserted, ${skippedCount} duplicate items skipped.`);
  console.log("==========================================");
  process.exit(0);
}

addMissingRestaurantItems().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
