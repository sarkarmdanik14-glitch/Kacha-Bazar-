import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  writeBatch 
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import { CONFECTIONERY_PRODUCTS_RAW } from "../src/lib/confectioneryData";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, config.firestoreDatabaseId || "(default)");

async function migrateConfectionery() {
  console.log("==================================================");
  console.log("STARTING CONFECTIONERY PURGE & 96 CURATED ITEMS SYNC");
  console.log("==================================================");

  // 1. Fetch all products from Firestore
  console.log("Fetching all products from Firestore via HTTP REST...");
  const snap = await getDocs(collection(db, "products"));
  console.log(`Total Firestore documents fetched: ${snap.size}`);

  const newIds = new Set(CONFECTIONERY_PRODUCTS_RAW.map(p => p.id));
  const oldConfectioneryIds: string[] = [];
  const otherCategoriesCount: Record<string, number> = {};

  for (const d of snap.docs) {
    const data = d.data();
    const docId = d.id;
    if (newIds.has(docId)) {
      continue;
    }

    const cat = (data.category || data.categoryId || "").toString().toLowerCase().trim();
    const catBn = (data.categoryBn || "").toString().trim();

    const isOldConfectionery = 
      cat === "snacks-biscuits" ||
      cat === "confectionery" ||
      cat === "কনফেকশনারি" ||
      cat === "কনফেকশনারী" ||
      catBn === "কনফেকশনারি" ||
      catBn === "কনফেকশনারী" ||
      data.categoryId === "snacks-biscuits" ||
      data.categoryId === "confectionery" ||
      (/^sn\d+$/i.test(docId)); // Legacy seed items sn1..sn30

    if (isOldConfectionery) {
      oldConfectioneryIds.push(docId);
    } else {
      otherCategoriesCount[cat] = (otherCategoriesCount[cat] || 0) + 1;
    }
  }

  console.log(`Identified ${oldConfectioneryIds.length} old Confectionery documents to purge.`);
  console.log("Other categories preserved untouched:", otherCategoriesCount);

  // 2. Mark old Confectionery items as permanently deleted & inactive
  if (oldConfectioneryIds.length > 0) {
    console.log("Purging old Confectionery items...");
    for (let i = 0; i < oldConfectioneryIds.length; i += 250) {
      const chunk = oldConfectioneryIds.slice(i, i + 250);
      const batch = writeBatch(db);
      for (const docId of chunk) {
        batch.set(doc(db, "products", docId), {
          isDeleted: true,
          deleted: true,
          status: "deleted",
          isAvailable: false,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      await batch.commit();
      console.log(`Purged batch of ${chunk.length} items (${i + chunk.length}/${oldConfectioneryIds.length}).`);
    }
  }

  // 3. Upsert the new 96 curated products
  console.log(`Inserting ${CONFECTIONERY_PRODUCTS_RAW.length} curated Confectionery products...`);
  for (let i = 0; i < CONFECTIONERY_PRODUCTS_RAW.length; i += 250) {
    const chunk = CONFECTIONERY_PRODUCTS_RAW.slice(i, i + 250);
    const batch = writeBatch(db);
    for (const prod of chunk) {
      const docRef = doc(db, "products", prod.id);
      batch.set(docRef, {
        id: prod.id,
        name: prod.nameBn,
        nameBn: prod.nameBn,
        nameEn: prod.nameEn,
        category: "snacks-biscuits",
        categoryId: "snacks-biscuits",
        categoryBn: "কনফেকশনারি",
        categoryEn: "Confectionery",
        subCategory: prod.subCategory,
        subcategory: prod.subCategory,
        subcategoryId: prod.subcategoryId,
        subCategoryId: prod.subCategoryId,
        unit: (prod as any).unit || prod.unitBn,
        unitBn: prod.unitBn,
        unitEn: prod.unitEn,
        price: Number(prod.price),
        originalPrice: Number(prod.originalPrice),
        isDeleted: false,
        deleted: false,
        status: "active",
        isAvailable: true,
        inStock: true,
        stock: 100,
        rating: 4.8,
        reviewCount: 15,
        brand: prod.brand,
        image: prod.image,
        imageUrl: prod.imageUrl,
        description: prod.descriptionBn,
        descriptionBn: prod.descriptionBn,
        descriptionEn: prod.descriptionEn,
        sku: prod.sku,
        displayOrder: prod.displayOrder,
        order: prod.order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    await batch.commit();
    console.log(`Saved batch of ${chunk.length} new items (${i + chunk.length}/${CONFECTIONERY_PRODUCTS_RAW.length}).`);
  }

  // 4. Ensure Confectionery subcategories exist in Firestore
  const confSubcategories = [
    { id: "sub_conf_chocolate", categoryId: "snacks-biscuits", nameBn: "চকলেট", nameEn: "Chocolates", order: 1, isActive: true, isDeleted: false },
    { id: "sub_conf_biscuits", categoryId: "snacks-biscuits", nameBn: "বিস্কুট ও কুকিজ", nameEn: "Biscuits & Cookies", order: 2, isActive: true, isDeleted: false },
    { id: "sub_conf_cakes", categoryId: "snacks-biscuits", nameBn: "কেক ও পেস্ট্রি", nameEn: "Cakes & Pastry", order: 3, isActive: true, isDeleted: false },
    { id: "sub_conf_spaghetti", categoryId: "snacks-biscuits", nameBn: "স্প্যাগেটি", nameEn: "Spaghetti", order: 4, isActive: true, isDeleted: false }
  ];

  for (const sub of confSubcategories) {
    await setDoc(doc(db, "subcategories", sub.id), sub, { merge: true });
  }
  console.log("Configured 4 Confectionery subcategories in Firestore.");

  console.log("==================================================");
  console.log("CONFECTIONERY MIGRATION COMPLETED SUCCESSFULLY!");
  console.log(`Total 96 curated items inserted. ${oldConfectioneryIds.length} legacy items purged.`);
  console.log("==================================================");
  process.exit(0);
}

migrateConfectionery().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
