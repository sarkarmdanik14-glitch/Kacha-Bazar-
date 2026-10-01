import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
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

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = initializeApp(config);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, config.firestoreDatabaseId || "(default)");

async function main() {
  console.log("================================================================");
  console.log("ALIGN CONFECTIONERY SUBCATEGORIES FOR 96 PRODUCTS IN FIRESTORE");
  console.log("================================================================");

  // 1. Authenticate with Firebase Auth as admin
  console.log("Authenticating as admin user (grphics949@gmail.com)...");
  await signInWithEmailAndPassword(auth, "grphics949@gmail.com", "KachaAdmin@2026!");
  console.log("Authenticated as:", auth.currentUser?.email);

  // 2. Sync Subcategories in Firestore
  console.log("\nUpdating subcategories collection in Firestore...");
  const alignedSubcategories = [
    {
      id: "sub_conf_chocolate",
      categoryId: "snacks-biscuits",
      nameBn: "চকলেট ও ক্যান্ডি",
      nameEn: "Chocolates & Candies",
      order: 1,
      isActive: true,
      isDeleted: false
    },
    {
      id: "sub_conf_biscuits",
      categoryId: "snacks-biscuits",
      nameBn: "বিস্কুট ও কুকিজ",
      nameEn: "Biscuits & Cookies",
      order: 2,
      isActive: true,
      isDeleted: false
    },
    {
      id: "sub_conf_cakes",
      categoryId: "snacks-biscuits",
      nameBn: "কেক, বান ও পাউরুটি",
      nameEn: "Cakes, Buns & Bread",
      order: 3,
      isActive: true,
      isDeleted: false
    },
    {
      id: "sub_conf_spaghetti",
      categoryId: "snacks-biscuits",
      nameBn: "স্প্যাগেটি",
      nameEn: "Spaghetti",
      order: 4,
      isActive: false,
      isDeleted: true
    }
  ];

  for (const sub of alignedSubcategories) {
    await setDoc(doc(db, "subcategories", sub.id), sub, { merge: true });
    console.log(`  Updated subcategory ${sub.id} -> ${sub.nameBn} (active: ${sub.isActive})`);
  }

  // 3. Fetch products from Firestore
  console.log("\nFetching products from Firestore...");
  const snap = await getDocs(collection(db, "products"));
  console.log(`Total products fetched: ${snap.size}`);

  const confDocs: { id: string; name: string; price: number }[] = [];
  for (const d of snap.docs) {
    if (d.id.startsWith("conf_")) {
      const data = d.data();
      confDocs.push({
        id: d.id,
        name: data.nameBn || data.name || "",
        price: Number(data.price)
      });
    }
  }

  console.log(`Found ${confDocs.length} Confectionery documents (conf_*) in Firestore.`);
  if (confDocs.length !== 96) {
    console.warn(`WARNING: Expected 96 confectionery documents, found ${confDocs.length}!`);
  }

  // 4. Batch update subCategory fields
  console.log("\nExecuting batch update of subCategory fields...");
  const batch = writeBatch(db);

  let chocolateCount = 0;
  let biscuitsCount = 0;
  let cakesCount = 0;

  for (const p of confDocs) {
    const num = parseInt(p.id.replace("conf_", ""), 10);
    let subCategory = "";
    let subcategoryId = "";

    if (num >= 1 && num <= 43) {
      // 1-43: চকলেট ও ক্যান্ডি (43 items)
      subCategory = "চকলেট ও ক্যান্ডি";
      subcategoryId = "sub_conf_chocolate";
      chocolateCount++;
    } else if (num === 67 || (num >= 74 && num <= 96)) {
      // 67 (অলিম্পিক কেক) + 74-96 (কেক, মিল্ক বান, সাদা পাউরুটি) (24 items)
      subCategory = "কেক, বান ও পাউরুটি";
      subcategoryId = "sub_conf_cakes";
      cakesCount++;
    } else if ((num >= 44 && num <= 66) || (num >= 68 && num <= 73)) {
      // 44-66 + 68-73: বিস্কুট ও কুকিজ (29 items)
      subCategory = "বিস্কুট ও কুকিজ";
      subcategoryId = "sub_conf_biscuits";
      biscuitsCount++;
    } else {
      console.warn(`Unclassified item: ${p.id} (${p.name})`);
    }

    const docRef = doc(db, "products", p.id);
    batch.set(docRef, {
      subCategory,
      subcategory: subCategory,
      subcategoryId,
      subCategoryId: subcategoryId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  await batch.commit();
  console.log("Batch commit successful!");

  // 5. Verification
  console.log("\n================================================================");
  console.log("POST-UPDATE VERIFICATION");
  console.log("================================================================");

  const verifySnap = await getDocs(collection(db, "products"));
  const breakdown: Record<string, { count: number; items: string[] }> = {
    "চকলেট ও ক্যান্ডি": { count: 0, items: [] },
    "বিস্কুট ও কুকিজ": { count: 0, items: [] },
    "কেক, বান ও পাউরুটি": { count: 0, items: [] }
  };

  let totalConf = 0;
  for (const d of verifySnap.docs) {
    if (d.id.startsWith("conf_")) {
      totalConf++;
      const data = d.data();
      const sc = data.subCategory || "None";
      if (!breakdown[sc]) {
        breakdown[sc] = { count: 0, items: [] };
      }
      breakdown[sc].count++;
      if (breakdown[sc].items.length < 5) {
        breakdown[sc].items.push(`${d.id}: ${data.nameBn} (৳${data.price})`);
      }
    }
  }

  console.log(`Total Confectionery Products in DB: ${totalConf}`);
  for (const [sc, info] of Object.entries(breakdown)) {
    console.log(`\nSubcategory: "${sc}" -> Count: ${info.count}`);
    console.log(`  Sample items:`);
    info.items.forEach(it => console.log(`    - ${it}`));
  }

  console.log("\nSummary Verification:");
  console.log(`  * চকলেট ও ক্যান্ডি: ${breakdown["চকলেট ও ক্যান্ডি"]?.count || 0} / 43 items (Target: 43)`);
  console.log(`  * বিস্কুট ও কুকিজ: ${breakdown["বিস্কুট ও কুকিজ"]?.count || 0} / 29 items (Target: 29)`);
  console.log(`  * কেক, বান ও পাউরুটি: ${breakdown["কেক, বান ও পাউরুটি"]?.count || 0} / 24 items (Target: 24)`);

  const isValid = 
    breakdown["চকলেট ও ক্যান্ডি"]?.count === 43 &&
    breakdown["বিস্কুট ও কুকিজ"]?.count === 29 &&
    breakdown["কেক, বান ও পাউরুটি"]?.count === 24;

  if (isValid) {
    console.log("\n>>> ALL 96 PRODUCTS PERFECTLY ALIGNED! <<<");
  } else {
    console.error("\n>>> COUNTS MISMATCH - CHECK LOGS! <<<");
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
