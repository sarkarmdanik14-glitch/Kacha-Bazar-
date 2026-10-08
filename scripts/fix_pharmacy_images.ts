import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, getDoc, getDocs, collection, serverTimestamp } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { RAW_MEDICINE_ITEMS, getAppropriateMedicineImage, OFFICIAL_MEDICINE_PRICES, getMedicineUnit } from "../src/lib/pharmacyData";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || "(default)");

async function fixPharmacyImages() {
  console.log("==================================================");
  console.log("FIXING 132 PHARMACY PRODUCT IMAGES IN FIRESTORE");
  console.log("==================================================");

  let updatedCount = 0;
  let customPreservedCount = 0;

  for (let idx = 0; idx < RAW_MEDICINE_ITEMS.length; idx++) {
    const item = RAW_MEDICINE_ITEMS[idx];
    const docRef = doc(db, "products", item.id);
    const existingSnap = await getDoc(docRef);

    let existingImage = "";
    if (existingSnap.exists()) {
      existingImage = (existingSnap.data().image || existingSnap.data().imageUrl || "").trim();
    }

    const isBroken =
      !existingImage ||
      existingImage.includes("photo-1576073719676-aa955fc1bda9") ||
      existingImage.includes("photo-1550572017-edd951aa8f72") ||
      existingImage.includes("default_placeholder") ||
      existingImage.includes("placeholder");

    let finalImage = existingImage;
    if (isBroken) {
      finalImage = getAppropriateMedicineImage(item.name, idx);
      updatedCount++;
    } else {
      customPreservedCount++;
    }

    const price = OFFICIAL_MEDICINE_PRICES[item.id] ?? (existingSnap.exists() ? existingSnap.data().price : 10);
    const unitInfo = getMedicineUnit(item.name, item.unitBn, item.unitEn);

    await setDoc(docRef, {
      id: item.id,
      nameBn: item.name,
      nameEn: item.name,
      image: finalImage,
      imageUrl: finalImage,
      price: price,
      originalPrice: price,
      unitBn: unitInfo.unitBn,
      unitEn: unitInfo.unitEn,
      unit: unitInfo.unitBn,
      category: "pharmacy",
      categoryId: "pharmacy",
      subcategory: "ঔষধ ও প্রেসক্রিপশন আইটেম",
      inStock: true,
      stock: 100,
      isAvailable: true,
      brand: item.brand,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  console.log(`Successfully restored/fixed images for ${updatedCount} products.`);
  console.log(`Preserved ${customPreservedCount} custom uploaded images.`);

  // Verification step
  console.log("\nVerifying 132 pharmacy products in Firestore...");
  const snap = await getDocs(collection(db, "products"));
  let verifiedWithImage = 0;
  let brokenCount = 0;

  snap.forEach(d => {
    if (d.id.startsWith("ph")) {
      const data = d.data();
      const img = data.image || data.imageUrl;
      if (img && !img.includes("photo-1576073719676-aa955fc1bda9") && !img.includes("photo-1550572017-edd951aa8f72")) {
        verifiedWithImage++;
      } else {
        brokenCount++;
        console.warn(`Item ${d.id} (${data.nameBn}) has broken/missing image: ${img}`);
      }
    }
  });

  console.log(`\nVERIFICATION RESULT:`);
  console.log(`Total valid, verified pharmacy items: ${verifiedWithImage} / 132`);
  console.log(`Broken items remaining: ${brokenCount}`);

  process.exit(0);
}

fixPharmacyImages().catch(err => {
  console.error("Error fixing pharmacy images:", err);
  process.exit(1);
});
