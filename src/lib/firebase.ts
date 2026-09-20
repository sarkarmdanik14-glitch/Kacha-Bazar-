import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel,
  collection, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  getDocs, 
  query, 
  where, 
  or,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  increment,
  Timestamp,
  serverTimestamp,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  runTransaction
} from "firebase/firestore";
import config from "../../firebase-applet-config.json";

// Configure Firestore log level to silent to prevent benign offline/handshake warning spam
setLogLevel("silent");

// Initialize Firebase App
// Initialize Firebase App with support for environment variables or config file
const firebaseConfig = {
  apiKey: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_API_KEY) || config.apiKey,
  authDomain: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || config.authDomain,
  projectId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || config.projectId,
  storageBucket: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || config.storageBucket,
  messagingSenderId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || config.messagingSenderId,
  appId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_APP_ID) || config.appId
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore using the standard database connection
const firestoreDbId = (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID) || config.firestoreDatabaseId || "(default)";
const db = getFirestore(app, firestoreDbId);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
const storage = getStorage(app);

export { 
  app, 
  auth, 
  db, 
  storage,
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  updateProfile,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  getDocs,
  query,
  where,
  or,
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  Timestamp,
  serverTimestamp,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  runTransaction,
  RecaptchaVerifier,
  signInWithPhoneNumber
};

// Seeding function to populate categories, products, settings, and coupons if they are empty
export async function seedDatabase(initialCategories: any[], initialProducts: any[]) {
  try {
    // 1. Seed categories only if empty or missing some categories (ensure all 19 categories are always in Firestore)
    const catsSnap = await getDocs(collection(db, "categories"));
    const dbCatIds = new Set(catsSnap.docs.map(doc => doc.id));
    const missingCats = initialCategories.filter(cat => cat.id !== "all" && !dbCatIds.has(cat.id));

    if (missingCats.length > 0) {
      console.log(`Seeding/updating ${missingCats.length} missing categories...`);
      for (const cat of missingCats) {
        await setDoc(doc(db, "categories", cat.id), {
          id: cat.id,
          nameBn: cat.nameBn,
          nameEn: cat.nameEn,
          iconName: cat.iconName,
          colorClass: cat.colorClass,
          borderColor: cat.borderColor
        }, { merge: true });
      }
    }

    // 2. Check if products already seeded
    const prodsSnap = await getDocs(collection(db, "products"));
    if (prodsSnap.empty) {
      console.log("Seeding products...");
      for (const prod of initialProducts) {
        await setDoc(doc(db, "products", prod.id.toString()), {
          id: prod.id.toString(),
          nameBn: prod.nameBn,
          nameEn: prod.nameEn,
          price: prod.price,
          originalPrice: prod.originalPrice || null,
          unitBn: prod.unitBn,
          unitEn: prod.unitEn,
          category: prod.category,
          image: prod.image,
          isFlashSale: prod.isFlashSale || false,
          discount: prod.discount || 0,
          rating: prod.rating || 4.5,
          stock: prod.stock || 50,
          descriptionBn: prod.descriptionBn || "",
          descriptionEn: prod.descriptionEn || "",
          isBestSelling: prod.isBestSelling || false,
          isNewArrival: prod.isNewArrival || false,
          isPopular: prod.isPopular || false,
          isSeasonal: prod.isSeasonal || false,
          isCombo: prod.isCombo || false,
          isBuyMoreSaveMore: prod.isBuyMoreSaveMore || false,
          brand: prod.brand || "Kacha Bazar",
          reviewCount: prod.reviewCount || 1,
          sellerId: "admin" // admin/system products by default
        });
      }
    }

    // 3. Seed dynamic settings if empty
    const settingsSnap = await getDoc(doc(db, "settings", "global"));
    if (!settingsSnap.exists()) {
      console.log("Seeding settings...");
      await setDoc(doc(db, "settings", "global"), {
        id: "global",
        deliveryCharge: 45,
        freeDeliveryThreshold: 500,
        referralBonusAmount: 50,
        bKashNumber: "01700000000",
        nagadNumber: "01800000000",
        rocketNumber: "01900000000"
      });
    }

    // 4. Seed coupons if empty
    const couponsSnap = await getDocs(collection(db, "coupons"));
    if (couponsSnap.empty) {
      console.log("Seeding coupons...");
      const defaultCoupons = [
        { code: "KACHA50", discountAmount: 50, minOrderAmount: 300, isActive: true },
        { code: "EID2026", discountAmount: 100, minOrderAmount: 600, isActive: true },
        { code: "FREESHIP", discountAmount: 45, minOrderAmount: 400, isActive: true }
      ];
      for (const cop of defaultCoupons) {
        await setDoc(doc(db, "coupons", cop.code), {
          ...cop,
          expiryDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
        });
      }
    }

    console.log("Database seed check completed successfully!");
  } catch (err: any) {
    if (err && (err.code === "permission-denied" || err.message?.includes("permissions"))) {
      console.log("Database seeding skipped: User lacks write permissions.");
    } else {
      console.error("Error seeding database: ", err);
    }
  }
}
