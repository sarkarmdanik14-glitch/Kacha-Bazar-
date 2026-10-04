import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDocs,
  setDoc, 
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  where
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
  console.log("MERGING TO ORIGINAL 'কনফেকশনারি' & DELETING DUPLICATE CATEGORY");
  console.log("================================================================");

  // 1. Authenticate with Firebase Auth as verified admin
  console.log("Authenticating as admin user (grphics949@gmail.com)...");
  await signInWithEmailAndPassword(auth, "grphics949@gmail.com", "KachaAdmin@2026!");
  console.log("Authenticated as:", auth.currentUser?.email);

  // 2. Completely delete the duplicate category doc 'confectionery-snacks'
  console.log("Deleting duplicate category doc 'categories/confectionery-snacks'...");
  try {
    await deleteDoc(doc(db, "categories", "confectionery-snacks"));
    console.log("  Successfully deleted 'categories/confectionery-snacks'");
  } catch (e) {
    console.warn("  Notice deleting 'categories/confectionery-snacks':", e);
  }

  // 3. Ensure the original category 'categories/snacks-biscuits' is pristine
  console.log("Ensuring original category 'categories/snacks-biscuits' is pristine...");
  await setDoc(doc(db, "categories", "snacks-biscuits"), {
    id: "snacks-biscuits",
    nameBn: "কনফেকশনারি",
    nameEn: "Confectionery",
    iconName: "Cookie",
    colorClass: "bg-yellow-50 text-yellow-800",
    borderColor: "border-yellow-100",
    displayOrder: 5,
    order: 5,
    isAvailable: true,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // 4. Remove any duplicate/orphan subcategories under categoryId 'confectionery-snacks'
  console.log("Cleaning up subcategories with categoryId 'confectionery-snacks'...");
  const oldSubsQuery = query(collection(db, "subcategories"), where("categoryId", "==", "confectionery-snacks"));
  const oldSubsSnap = await getDocs(oldSubsQuery);
  for (const d of oldSubsSnap.docs) {
    await deleteDoc(d.ref);
    console.log(`  Deleted duplicate subcategory doc: ${d.id}`);
  }

  // 5. Upsert the 6 subcategories under categoryId 'snacks-biscuits'
  console.log("Upserting subcategories under original 'snacks-biscuits'...");
  for (const sub of CONFECTIONERY_SNACKS_SUBCATEGORIES) {
    const subDocId = `sub_conf_${sub.id.replace(/-/g, "_")}`;
    await setDoc(doc(db, "subcategories", subDocId), {
      id: subDocId,
      categoryId: "snacks-biscuits",
      slug: sub.id,
      nameBn: sub.nameBn,
      nameEn: sub.nameEn,
      order: sub.order,
      isActive: true,
      isDeleted: false,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  // 6. Re-map all 126 products in Firestore to category: "কনফেকশনারি", categoryId: "snacks-biscuits"
  console.log(`\nRe-mapping ${CONFECTIONERY_SNACKS_RAW.length} products to 'snacks-biscuits' / 'কনফেকশনারি'...`);
  const chunkSize = 50;
  for (let i = 0; i < CONFECTIONERY_SNACKS_RAW.length; i += chunkSize) {
    const chunk = CONFECTIONERY_SNACKS_RAW.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const prodRef = doc(db, "products", item.id);
      batch.set(prodRef, {
        category: "কনফেকশনারি",
        categoryId: "snacks-biscuits",
        categoryBn: "কনফেকশনারি",
        categoryEn: "Confectionery",
        subCategory: item.subCategory,
        subcategory: item.subcategory,
        subCategoryId: item.subCategoryId,
        subcategoryId: item.subcategoryId,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    await batch.commit();
    console.log(`  Updated batch ${i + 1} - ${Math.min(i + chunkSize, CONFECTIONERY_SNACKS_RAW.length)}`);
  }

  console.log("\n✅ CLEANUP COMPLETE: Duplicate removed and all products merged into original 'কনফেকশনারি'!");
  process.exit(0);
}

main().catch(err => {
  console.error("FATAL ERROR running merge script:", err);
  process.exit(1);
});
