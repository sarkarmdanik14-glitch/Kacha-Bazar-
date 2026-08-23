import { db } from "./lib/firebase";
import { collection, doc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { CATEGORIES as initialCategories } from "./data/categories";
import { ALL_PRODUCTS as initialProducts } from "./data/all_products";

async function forceSeed() {
  console.log("Starting forced database seeding with cleanup...");

  // 1. Clean up existing products
  console.log("Cleaning up existing products...");
  const prodSnapshot = await getDocs(collection(db, "products"));
  console.log(`Found ${prodSnapshot.size} products to delete.`);
  const deleteProdPromises = prodSnapshot.docs.map(d => deleteDoc(doc(db, "products", d.id)));
  await Promise.all(deleteProdPromises);
  console.log("Existing products cleaned up!");

  // 2. Clean up existing categories
  console.log("Cleaning up existing categories...");
  const catSnapshot = await getDocs(collection(db, "categories"));
  console.log(`Found ${catSnapshot.size} categories to delete.`);
  const deleteCatPromises = catSnapshot.docs.map(d => deleteDoc(doc(db, "categories", d.id)));
  await Promise.all(deleteCatPromises);
  console.log("Existing categories cleaned up!");

  // 3. Seed categories
  console.log("Seeding categories...");
  for (const cat of initialCategories) {
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
  console.log("Categories seeded successfully!");

  // 4. Seed products in parallel chunks to keep it fast
  console.log(`Seeding ${initialProducts.length} products...`);
  const chunkSize = 20;
  for (let i = 0; i < initialProducts.length; i += chunkSize) {
    const chunk = initialProducts.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (prod) => {
        await setDoc(doc(db, "products", prod.id.toString()), {
          id: prod.id.toString(),
          nameBn: prod.nameBn,
          nameEn: prod.nameEn,
          price: Number(prod.price),
          originalPrice: prod.originalPrice ? Number(prod.originalPrice) : null,
          unitBn: prod.unitBn,
          unitEn: prod.unitEn,
          category: prod.category,
          image: prod.image,
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
    console.log(`Uploaded products: ${Math.min(i + chunkSize, initialProducts.length)} / ${initialProducts.length}`);
  }

  // 5. Seed global settings
  await setDoc(doc(db, "settings", "global"), {
    id: "global",
    deliveryCharge: 45,
    freeDeliveryThreshold: 500,
    referralBonusAmount: 50,
    bKashNumber: "01700000000",
    nagadNumber: "01800000000",
    rocketNumber: "01900000000"
  });

  console.log("Forced database seeding completed successfully!");
}

forceSeed().catch(console.error);
