import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { MASTER_PRODUCT_IMAGE_MAP } from "../src/lib/masterImageRegistry";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = initializeApp(config);
const db = config.firestoreDatabaseId 
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

async function reconnectProductImages() {
  console.log("==================================================");
  console.log("STARTING SAFE PRODUCT IMAGE RESTORATION & RECONNECTION");
  console.log("==================================================");

  const snapshot = await getDocs(collection(db, "products"));
  console.log(`Total Firestore documents fetched: ${snapshot.size}`);

  let restoredCount = 0;
  let untouchedValidCount = 0;
  let missingEverywhere: Array<{ id: string; name: string }> = [];

  const updateBatch: Array<{ id: string; name: string; oldImg: string; restoredImg: string }> = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const docId = docSnap.id;
    const currentImg = (data.image || data.imageUrl || "").trim();

    // Preserve custom uploads (Cloudinary, local server uploads, data URLs, etc.)
    const isCustomUpload = 
      currentImg.includes("cloudinary.com") || 
      currentImg.includes("/uploads/") ||
      currentImg.startsWith("data:image/") ||
      currentImg.includes("teachers.gov.bd");

    const isValidDirectPhoto = 
      currentImg.includes("images.unsplash.com/photo-") && 
      !currentImg.includes("/featured/");

    if (isCustomUpload || isValidDirectPhoto) {
      untouchedValidCount++;
      continue;
    }

    // Corrupted with /featured/ or missing: look up in master registry
    const masterImage = MASTER_PRODUCT_IMAGE_MAP[docId];
    if (masterImage) {
      updateBatch.push({
        id: docId,
        name: data.nameBn || data.nameEn || docId,
        oldImg: currentImg,
        restoredImg: masterImage
      });
    } else {
      missingEverywhere.push({
        id: docId,
        name: data.nameBn || data.nameEn || docId
      });
    }
  }

  console.log(`Identified ${updateBatch.length} products to safely reconnect with authentic images.`);
  console.log(`Untouched products with valid existing images: ${untouchedValidCount}`);
  console.log(`Products without existing images anywhere: ${missingEverywhere.length}`);

  // Process updates safely in sequential chunks
  for (const item of updateBatch) {
    try {
      await setDoc(doc(db, "products", item.id), {
        image: item.restoredImg,
        imageUrl: item.restoredImg
      }, { merge: true });
      restoredCount++;
      if (restoredCount <= 10 || restoredCount % 50 === 0) {
        console.log(`[RESTORED ${restoredCount}/${updateBatch.length}] ${item.id} (${item.name}) -> ${item.restoredImg.substring(0, 60)}...`);
      }
    } catch (err: any) {
      console.error(`Failed to update ${item.id}:`, err.message);
    }
  }

  console.log("\n==================================================");
  console.log(`RESTORATION COMPLETED!`);
  console.log(`Successfully restored images for: ${restoredCount} products.`);
  console.log(`Preserved existing valid images: ${untouchedValidCount} products.`);
  console.log(`Unassigned/missing images (reported): ${missingEverywhere.length} products.`);
  if (missingEverywhere.length > 0) {
    console.log("Details of missing unassigned items:", JSON.stringify(missingEverywhere, null, 2));
  }
  console.log("==================================================");

  process.exit(0);
}

reconnectProductImages().catch(err => {
  console.error("Restoration script fatal error:", err);
  process.exit(1);
});
