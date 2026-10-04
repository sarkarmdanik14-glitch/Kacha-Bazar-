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
import { CONFECTIONERY_SNACKS_RAW, CONFECTIONERY_SNACKS_SUBCATEGORIES } from "../src/lib/confectionerySnacksData";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = initializeApp(config);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, config.firestoreDatabaseId || "(default)");

async function main() {
  console.log("================================================================");
  console.log("APPENDING 124 CONFECTIONERY & SNACKS ITEMS INTO FIRESTORE");
  console.log("================================================================");

  // 1. Authenticate with Firebase Auth as verified admin
  console.log("Authenticating as admin user (grphics949@gmail.com)...");
  await signInWithEmailAndPassword(auth, "grphics949@gmail.com", "KachaAdmin@2026!");
  console.log("Authenticated as:", auth.currentUser?.email);

  // 2. Ensure Main Category exists in Firestore
  console.log("Ensuring confectionery-snacks category in Firestore...");
  await setDoc(doc(db, "categories", "confectionery-snacks"), {
    id: "confectionery-snacks",
    nameBn: "কনফেকশনারি ও স্ন্যাকস",
    nameEn: "Confectionery & Snacks",
    iconName: "Cookie",
    colorClass: "bg-yellow-50 text-yellow-800",
    borderColor: "border-yellow-100",
    displayOrder: 5,
    order: 5,
    isAvailable: true,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // Also maintain alias category for backwards compatibility
  await setDoc(doc(db, "categories", "snacks-biscuits"), {
    id: "snacks-biscuits",
    nameBn: "কনফেকশনারি ও স্ন্যাকস",
    nameEn: "Confectionery & Snacks",
    iconName: "Cookie",
    colorClass: "bg-yellow-50 text-yellow-800",
    borderColor: "border-yellow-100",
    displayOrder: 5,
    order: 5,
    isAvailable: true,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // 3. Upsert the 6 Subcategories in Firestore
  console.log("Upserting the 6 subcategories for confectionery-snacks...");
  for (const sub of CONFECTIONERY_SNACKS_SUBCATEGORIES) {
    const subDocId = `sub_conf_${sub.id.replace(/-/g, "_")}`;
    await setDoc(doc(db, "subcategories", subDocId), {
      id: subDocId,
      categoryId: "confectionery-snacks",
      slug: sub.id,
      nameBn: sub.nameBn,
      nameEn: sub.nameEn,
      order: sub.order,
      isActive: true,
      isDeleted: false,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  // 4. Batch upsert the 126 products
  console.log(`\nUpserting ${CONFECTIONERY_SNACKS_RAW.length} products to Firestore in batches...`);
  const chunkSize = 50;
  for (let i = 0; i < CONFECTIONERY_SNACKS_RAW.length; i += chunkSize) {
    const chunk = CONFECTIONERY_SNACKS_RAW.slice(i, i + chunkSize);
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
        category: "কনফেকশনারি ও স্ন্যাকস",
        categoryId: "confectionery-snacks",
        categoryBn: "কনফেকশনারি ও স্ন্যাকস",
        categoryEn: "Confectionery & Snacks",
        subCategory: item.subCategory,
        subcategory: item.subcategory,
        subCategoryId: item.subCategoryId,
        subcategoryId: item.subcategoryId,
        image: item.image,
        imageUrl: item.imageUrl,
        inStock: true,
        stock: 100,
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
    console.log(`  Committed batch ${i + 1} - ${Math.min(i + chunkSize, CONFECTIONERY_SNACKS_RAW.length)} of ${CONFECTIONERY_SNACKS_RAW.length}`);
  }

  console.log("\n✅ ALL 124+ ITEMS AND 6 SUBCATEGORIES SUCCESSFULLY SAVED TO FIRESTORE!");
  process.exit(0);
}

main().catch(err => {
  console.error("FATAL ERROR running append script:", err);
  process.exit(1);
});
