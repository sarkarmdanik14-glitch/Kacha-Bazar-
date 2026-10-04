import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import { MOBILE_ZONE_PRODUCTS_RAW } from "../src/lib/mobileProductsData";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = initializeApp(config);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, config.firestoreDatabaseId || "(default)");

const MOBILE_SUBCATS = [
  { id: "vivo", nameBn: "Vivo (ভিভো)", nameEn: "Vivo", order: 1 },
  { id: "redmi", nameBn: "Redmi / Xiaomi (রেডমি)", nameEn: "Redmi / Xiaomi", order: 2 },
  { id: "oppo", nameBn: "OPPO (অপ্পো)", nameEn: "OPPO", order: 3 },
  { id: "tecno", nameBn: "TECNO (টেকনো)", nameEn: "TECNO", order: 4 },
  { id: "itel", nameBn: "itel (আইটেল)", nameEn: "itel", order: 5 },
  { id: "gdl", nameBn: "GDL / Grameen (গ্রামীণ)", nameEn: "GDL / Grameen", order: 6 },
  { id: "infinix", nameBn: "Infinix (ইনফিনিক্স)", nameEn: "Infinix", order: 7 }
];

async function main() {
  console.log("================================================================");
  console.log("SYNCING 109 MOBILE ZONE PRODUCTS INTO FIRESTORE");
  console.log("================================================================");

  // 1. Authenticate with Firebase Auth as verified admin
  console.log("Authenticating as admin user (grphics949@gmail.com)...");
  await signInWithEmailAndPassword(auth, "grphics949@gmail.com", "KachaAdmin@2026!");
  console.log("Authenticated as:", auth.currentUser?.email);

  // 2. Ensure mobile-zone category in Firestore
  console.log("Ensuring mobile-zone category doc in Firestore...");
  await setDoc(doc(db, "categories", "mobile-zone"), {
    id: "mobile-zone",
    nameBn: "মোবাইল জোন",
    nameEn: "Mobile Zone",
    iconName: "Smartphone",
    colorClass: "bg-blue-50 text-blue-800",
    borderColor: "border-blue-100",
    displayOrder: 18,
    order: 18,
    isAvailable: true,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // 3. Upsert mobile subcategories
  console.log("Upserting mobile subcategories...");
  for (const sub of MOBILE_SUBCATS) {
    const subDocId = `sub_mob_${sub.id}`;
    await setDoc(doc(db, "subcategories", subDocId), {
      id: subDocId,
      categoryId: "mobile-zone",
      slug: sub.id,
      nameBn: sub.nameBn,
      nameEn: sub.nameEn,
      order: sub.order,
      isActive: true,
      isDeleted: false,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  // 4. Batch upsert the 109 products
  console.log(`\nUpserting ${MOBILE_ZONE_PRODUCTS_RAW.length} mobile products to Firestore...`);
  const chunkSize = 40;
  for (let i = 0; i < MOBILE_ZONE_PRODUCTS_RAW.length; i += chunkSize) {
    const chunk = MOBILE_ZONE_PRODUCTS_RAW.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const prodRef = doc(db, "products", item.id);
      batch.set(prodRef, {
        id: item.id,
        name: item.nameBn,
        nameBn: item.nameBn,
        nameEn: item.nameEn,
        price: item.price,
        originalPrice: item.originalPrice,
        unit: item.unit,
        unitBn: item.unitBn,
        unitEn: item.unitEn,
        category: "mobile-zone",
        categoryId: "mobile-zone",
        categoryBn: "মোবাইল জোন",
        categoryEn: "Mobile Zone",
        subCategory: item.subCategory,
        subcategory: item.subcategory,
        subCategoryId: item.subCategoryId,
        subcategoryId: item.subcategoryId,
        image: item.image,
        imageUrl: item.imageUrl,
        inStock: true,
        stock: 50,
        isAvailable: true,
        isDeleted: false,
        deleted: false,
        status: "active",
        rating: item.rating,
        reviewCount: item.reviewCount,
        brand: item.brand,
        descriptionBn: item.descriptionBn,
        descriptionEn: item.descriptionEn,
        sku: item.sku,
        displayOrder: item.displayOrder,
        order: item.order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    await batch.commit();
    console.log(`  Committed batch ${i + 1} - ${Math.min(i + chunkSize, MOBILE_ZONE_PRODUCTS_RAW.length)} of ${MOBILE_ZONE_PRODUCTS_RAW.length}`);
  }

  console.log("\n✅ ALL 109 MOBILE PRODUCTS & SUBCATEGORIES SUCCESSFULLY SAVED TO FIRESTORE!");
  process.exit(0);
}

main().catch(err => {
  console.error("FATAL ERROR running mobile sync script:", err);
  process.exit(1);
});
