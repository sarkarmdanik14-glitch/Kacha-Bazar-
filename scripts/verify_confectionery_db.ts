import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, config.firestoreDatabaseId || "(default)");

async function verify() {
  console.log("Fetching all products from Firestore...");
  const snap = await getDocs(collection(db, "products"));
  console.log(`Total products in Firestore: ${snap.size}`);

  const activeConfItems: any[] = [];
  const deletedConfItems: any[] = [];

  for (const d of snap.docs) {
    const data = d.data();
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
      d.id.startsWith("conf_") ||
      d.id.startsWith("sn");

    if (isConf) {
      if (data.isDeleted || data.deleted || data.status === "deleted") {
        deletedConfItems.push({ id: d.id, name: data.name || data.nameBn, status: data.status });
      } else {
        activeConfItems.push({ 
          id: d.id, 
          name: data.name || data.nameBn, 
          subCategory: data.subCategory || data.subcategory,
          price: data.price,
          unit: data.unit || data.unitBn
        });
      }
    }
  }

  console.log(`Active Confectionery items in DB: ${activeConfItems.length}`);
  console.log(`Deleted/Purged Confectionery items in DB: ${deletedConfItems.length}`);
  
  const subCatCounts: Record<string, number> = {};
  for (const item of activeConfItems) {
    const sc = item.subCategory || "None";
    subCatCounts[sc] = (subCatCounts[sc] || 0) + 1;
  }
  console.log("Active subcategory breakdown:", subCatCounts);
  process.exit(0);
}

verify().catch(console.error);
