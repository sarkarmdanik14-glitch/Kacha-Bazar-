import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import config from "../firebase-applet-config.json" with { type: "json" };
import { ALL_PRODUCTS } from "./data/all_products.js";
import { CATEGORIES } from "./data/categories.js";

// Initialize Firebase client SDK
const app = initializeApp(config);
const db = config.firestoreDatabaseId 
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);
const storage = getStorage(app);

async function syncAndSeed() {
  console.log("==================================================");
  console.log("KACHA BAZAR: FIREBASE STORAGE & FIRESTORE SYNC RUNNER");
  console.log("==================================================");
  console.log(`Loaded ${ALL_PRODUCTS.length} products to synchronize...`);

  // We will process products in batches of 10 to keep it incredibly fast and safe
  const batchSize = 10;
  const totalProducts = ALL_PRODUCTS.length;

  for (let i = 0; i < totalProducts; i += batchSize) {
    const chunk = ALL_PRODUCTS.slice(i, i + batchSize);
    console.log(`\nProcessing chunk ${i / batchSize + 1} of ${Math.ceil(totalProducts / batchSize)} (Products ${i + 1} to ${Math.min(i + batchSize, totalProducts)})`);

    await Promise.all(
      chunk.map(async (prod) => {
        const storagePath = `products/${prod.id}.jpg`;
        const storageRef = ref(storage, storagePath);

        let finalImageUrl = prod.image;

        try {
          // 1. Fetch image from Unsplash
          const response = await fetch(prod.image, { signal: AbortSignal.timeout(15000) });
          if (!response.ok) {
            throw new Error(`Failed to fetch image from Unsplash: ${response.statusText}`);
          }

          const buffer = await response.arrayBuffer();

          // 2. Upload binary payload to Firebase Storage
          console.log(`[${prod.id}] Uploading image to Firebase Storage: ${storagePath}...`);
          const snapshot = await uploadBytes(storageRef, buffer, { contentType: "image/jpeg" });
          
          // 3. Obtain download URL
          finalImageUrl = await getDownloadURL(snapshot.ref);
          console.log(`[${prod.id}] Success! Storage URL: ${finalImageUrl.substring(0, 75)}...`);
        } catch (error: any) {
          console.warn(`[${prod.id}] Storage upload failed or timed out: ${error.message}. Falling back to high-resolution Unsplash URL.`);
        }

        // 4. Update/Set Product Document in Firestore
        const productRef = doc(db, "products", prod.id.toString());
        await setDoc(productRef, {
          id: prod.id.toString(),
          nameBn: prod.nameBn,
          nameEn: prod.nameEn,
          price: Number(prod.price),
          originalPrice: prod.originalPrice ? Number(prod.originalPrice) : null,
          unitBn: prod.unitBn,
          unitEn: prod.unitEn,
          category: prod.category,
          image: finalImageUrl, // Matches exactly the Firebase Storage URL or resolved Unsplash fallback URL
          isFlashSale: !!prod.isFlashSale,
          discount: Number(prod.discount || 0),
          rating: Number(prod.rating || 4.5),
          stock: Number(prod.stock !== undefined ? prod.stock : 50),
          descriptionBn: prod.descriptionBn || "",
          descriptionEn: prod.descriptionEn || "",
          isBestSelling: !!prod.isBestSelling,
          isNewArrival: !!prod.isNewArrival,
          isPopular: !!prod.isPopular,
          isSeasonal: !!prod.isSeasonal,
          isCombo: !!prod.isCombo,
          isBuyMoreSaveMore: !!prod.isBuyMoreSaveMore,
          brand: prod.brand || "Kacha Bazar",
          reviewCount: Number(prod.reviewCount || 1),
          sellerId: "admin",
          sku: prod.sku || `KB-${prod.category?.substring(0, 3).toUpperCase()}-${prod.id}`,
          subcategory: prod.subcategory || "General"
        });
      })
    );
  }

  // Also seed categories for absolute consistency
  console.log("\nSeeding categories into Firestore...");
  for (const cat of CATEGORIES) {
    if (cat.id === "all") continue;
    await setDoc(doc(db, "categories", cat.id), {
      id: cat.id,
      nameBn: cat.nameBn,
      nameEn: cat.nameEn,
      iconName: cat.iconName,
      colorClass: cat.colorClass,
      borderColor: cat.borderColor
    });
  }

  // Seed global settings
  console.log("Seeding global settings into Firestore...");
  await setDoc(doc(db, "settings", "global"), {
    id: "global",
    deliveryCharge: 45,
    freeDeliveryThreshold: 500,
    referralBonusAmount: 50,
    bKashNumber: "01722638985", // Matching updated order contact phone
    nagadNumber: "01722638985",
    rocketNumber: "01722638985"
  });

  console.log("\n==================================================");
  console.log("KACHA BAZAR CATALOG SYNCHRONIZATION COMPLETED!");
  console.log("==================================================");
}

syncAndSeed().catch(console.error);
