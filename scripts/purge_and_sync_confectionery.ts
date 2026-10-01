import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  setDoc, 
  writeBatch 
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import { CONFECTIONERY_PRODUCTS_RAW } from "../src/lib/confectioneryData";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = initializeApp(config);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, config.firestoreDatabaseId || "(default)");

async function main() {
  console.log("================================================================");
  console.log("SAFE DATABASE CLEAN-UP: PURGING OLD CONFECTIONERY & SYNCING 96 ITEMS");
  console.log("================================================================");

  // 1. Authenticate with Firebase Auth as verified admin
  console.log("Authenticating as admin user (grphics949@gmail.com)...");
  await signInWithEmailAndPassword(auth, "grphics949@gmail.com", "KachaAdmin@2026!");
  console.log("Authenticated as:", auth.currentUser?.email);

  // 2. Fetch all products from Firestore
  console.log("Fetching all products from Firestore...");
  const snap = await getDocs(collection(db, "products"));
  console.log(`Total documents in products collection: ${snap.size}`);

  const curatedIds = new Set(CONFECTIONERY_PRODUCTS_RAW.map(p => p.id));
  const legacyToPurge: { id: string; name: string; category: string }[] = [];
  const otherCategoriesCounts: Record<string, number> = {};

  for (const d of snap.docs) {
    const data = d.data();
    const docId = d.id;

    // Preserve our newly added 96 curated items
    if (curatedIds.has(docId)) {
      continue;
    }

    const cat = (data.category || data.categoryId || "").toString().toLowerCase().trim();
    const catBn = (data.categoryBn || "").toString().trim();
    const isLegacySn = /^sn\d+$/i.test(docId);
    const isConfCategory = 
      cat === "snacks-biscuits" ||
      cat === "confectionery" ||
      cat === "কনফেকশনারি" ||
      cat === "কনফেকশনারী" ||
      catBn === "কনফেকশনারি" ||
      catBn === "কনফেকশনারী" ||
      data.categoryId === "snacks-biscuits" ||
      data.categoryId === "confectionery";

    if (isLegacySn || isConfCategory) {
      legacyToPurge.push({
        id: docId,
        name: data.name || data.nameBn || "Unknown",
        category: cat || catBn
      });
    } else {
      otherCategoriesCounts[cat || "unknown"] = (otherCategoriesCounts[cat || "unknown"] || 0) + 1;
    }
  }

  console.log(`\nIdentified ${legacyToPurge.length} old Confectionery documents to permanently purge:`);
  legacyToPurge.forEach(item => console.log(`  - ${item.id}: "${item.name}" (cat: ${item.category})`));

  console.log("\nPreserved categories count (SAFE - NOT TOUCHED):");
  Object.entries(otherCategoriesCounts).forEach(([cat, count]) => {
    console.log(`  * ${cat}: ${count} products`);
  });

  // 3. Permanently remove all legacy confectionery documents using deleteDoc
  if (legacyToPurge.length > 0) {
    console.log(`\nPermanently deleting ${legacyToPurge.length} old confectionery documents from Firestore...`);
    for (const item of legacyToPurge) {
      try {
        await deleteDoc(doc(db, "products", item.id));
        console.log(`  [DELETED] Document ${item.id} permanently removed.`);
      } catch (err: any) {
        console.error(`  [ERROR] Failed to delete ${item.id}:`, err.message);
      }
    }
  } else {
    console.log("\nNo old confectionery documents to delete.");
  }

  // 4. Upsert the 96 curated products
  console.log(`\nUpserting ${CONFECTIONERY_PRODUCTS_RAW.length} curated Confectionery products...`);
  for (let i = 0; i < CONFECTIONERY_PRODUCTS_RAW.length; i += 100) {
    const chunk = CONFECTIONERY_PRODUCTS_RAW.slice(i, i + 100);
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
    console.log(`  Upserted batch ${i + 1} to ${Math.min(i + 100, CONFECTIONERY_PRODUCTS_RAW.length)}`);
  }

  // 5. Ensure Confectionery subcategories exist in Firestore
  console.log("\nSyncing Confectionery subcategories in Firestore...");
  const confSubcategories = [
    { id: "sub_conf_chocolate", categoryId: "snacks-biscuits", nameBn: "চকলেট", nameEn: "Chocolates", order: 1, isActive: true, isDeleted: false },
    { id: "sub_conf_biscuits", categoryId: "snacks-biscuits", nameBn: "বিস্কুট ও কুকিজ", nameEn: "Biscuits & Cookies", order: 2, isActive: true, isDeleted: false },
    { id: "sub_conf_cakes", categoryId: "snacks-biscuits", nameBn: "কেক ও পেস্ট্রি", nameEn: "Cakes & Pastry", order: 3, isActive: true, isDeleted: false },
    { id: "sub_conf_spaghetti", categoryId: "snacks-biscuits", nameBn: "স্প্যাগেটি", nameEn: "Spaghetti", order: 4, isActive: true, isDeleted: false }
  ];

  for (const sub of confSubcategories) {
    await setDoc(doc(db, "subcategories", sub.id), sub, { merge: true });
  }

  // 6. Post-migration Verification
  console.log("\n================================================================");
  console.log("RUNNING POST-MIGRATION VERIFICATION");
  console.log("================================================================");

  const verifySnap = await getDocs(collection(db, "products"));
  console.log(`New total product documents in Firestore: ${verifySnap.size}`);

  const activeConfItems: any[] = [];
  const residualOldConf: any[] = [];

  for (const d of verifySnap.docs) {
    const data = d.data();
    const docId = d.id;
    const cat = (data.category || data.categoryId || "").toString().toLowerCase().trim();
    const catBn = (data.categoryBn || "").toString().trim();
    const isConf = 
      cat === "snacks-biscuits" ||
      cat === "confectionery" ||
      cat === "কনফেকশনারি" ||
      cat === "কনফেকশনারী" ||
      catBn === "কনফেকশনারি" ||
      catBn === "কনফেকশনারী" ||
      data.categoryId === "snacks-biscuits" ||
      data.categoryId === "confectionery" ||
      docId.startsWith("conf_") ||
      /^sn\d+$/i.test(docId);

    if (isConf) {
      if (docId.startsWith("conf_")) {
        activeConfItems.push({
          id: docId,
          name: data.nameBn,
          subCategory: data.subCategory,
          price: data.price,
          unit: data.unit,
          status: data.status,
          isDeleted: data.isDeleted
        });
      } else {
        residualOldConf.push({ id: docId, name: data.name, isDeleted: data.isDeleted });
      }
    }
  }

  console.log(`Active Curated Confectionery items in DB: ${activeConfItems.length}`);
  console.log(`Residual Old Confectionery items in DB: ${residualOldConf.length}`);

  const subCatBreakdown: Record<string, number> = {};
  for (const item of activeConfItems) {
    const sc = item.subCategory || "None";
    subCatBreakdown[sc] = (subCatBreakdown[sc] || 0) + 1;
  }

  console.log("\nSubcategory Breakdown:");
  Object.entries(subCatBreakdown).forEach(([sc, count]) => {
    console.log(`  * ${sc}: ${count} items`);
  });

  const allActive = activeConfItems.every(x => x.isDeleted === false && x.status === "active");
  console.log(`\nAll 96 items have isDeleted=false and status="active": ${allActive}`);

  if (activeConfItems.length === 96 && residualOldConf.length === 0 && allActive) {
    console.log("\nSUCCESS: CLEAN-UP & REALTIME SYNC 100% COMPLETE!");
  } else {
    console.warn("\nWARNING: Review output counts above.");
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
