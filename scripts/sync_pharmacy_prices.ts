import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, serverTimestamp, getDocs, collection } from "firebase/firestore";
import fs from "fs";
import path from "path";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || "(default)");

export const OFFICIAL_MEDICINE_PRICES: Record<string, number> = {
  ph1: 4.5,
  ph2: 22,
  ph3: 9,
  ph4: 45,
  ph5: 130,
  ph6: 8,
  ph7: 15,
  ph8: 130,
  ph9: 20,
  ph10: 9,
  ph11: 16,
  ph12: 270,
  ph13: 12,
  ph14: 200,
  ph15: 50,
  ph16: 330,
  ph17: 7,
  ph18: 11,
  ph19: 2,
  ph20: 13,
  ph21: 20,
  ph22: 35,
  ph23: 15,
  ph24: 5,
  ph25: 150,
  ph26: 45,
  ph27: 35,
  ph28: 10,
  ph29: 12,
  ph30: 45,
  ph31: 35,
  ph32: 280,
  ph33: 40,
  ph34: 5,
  ph35: 6,
  ph36: 8,
  ph37: 400,
  ph38: 20,
  ph39: 35,
  ph40: 8,
  ph41: 3,
  ph42: 95,
  ph43: 9,
  ph44: 8,
  ph45: 50,
  ph46: 55,
  ph47: 3,
  ph48: 15,
  ph49: 50,
  ph50: 19,
  ph51: 10,
  ph52: 300,
  ph53: 12,
  ph54: 251,
  ph55: 10.5,
  ph56: 7,
  ph57: 9,
  ph58: 17.5,
  ph59: 4,
  ph60: 45,
  ph61: 32,
  ph62: 12,
  ph63: 11,
  ph64: 10,
  ph65: 10,
  ph66: 50,
  ph67: 135,
  ph68: 70,
  ph69: 14,
  ph70: 10,
  ph71: 3,
  ph72: 8,
  ph73: 16,
  ph74: 450,
  ph75: 20,
  ph76: 6,
  ph77: 15,
  ph78: 80,
  ph79: 230,
  ph80: 130,
  ph81: 20,
  ph82: 797,
  ph83: 695,
  ph84: 360,
  ph85: 360,
  ph86: 12,
  ph87: 2.5,
  ph88: 110,
  ph89: 15,
  ph90: 40,
  ph91: 8,
  ph92: 230,
  ph93: 180,
  ph94: 2.2,
  ph95: 35,
  ph96: 1.2,
  ph97: 300,
  ph98: 2.5,
  ph99: 11,
  ph100: 2,
  ph101: 10,
  ph102: 10,
  ph103: 7,
  ph104: 80,
  ph105: 32,
  ph106: 175,
  ph107: 10,
  ph108: 1,
  ph109: 8.5,
  ph110: 12,
  ph111: 7,
  ph112: 25,
  ph113: 30,
  ph114: 6.5,
  ph115: 10,
  ph116: 3,
  ph117: 186,
  ph118: 1.1,
  ph119: 400,
  ph120: 55,
  ph121: 40,
  ph122: 16,
  ph123: 12,
  ph124: 9,
  ph125: 8,
  ph126: 17,
  ph127: 15,
  ph128: 17,
  ph129: 11,
  ph130: 21,
  ph131: 22,
  ph132: 45
};

async function syncAllPrices() {
  console.log("Starting batch update for 132 pharmacy product prices in Firestore...");
  let count = 0;

  for (const [id, price] of Object.entries(OFFICIAL_MEDICINE_PRICES)) {
    const prodRef = doc(db, "products", id);
    await setDoc(prodRef, {
      price: Number(price),
      originalPrice: Number(price),
      updatedAt: serverTimestamp()
    }, { merge: true });
    count++;
  }

  console.log(`Successfully updated ${count} products in Firestore.`);

  // Verify
  const snap = await getDocs(collection(db, "products"));
  let verifiedCount = 0;
  let zeroCount = 0;
  snap.forEach(d => {
    if (d.id.startsWith("ph")) {
      const data = d.data();
      if (data.price && Number(data.price) > 0) {
        verifiedCount++;
      } else {
        zeroCount++;
        console.warn(`Item ${d.id} still has price ${data.price}`);
      }
    }
  });

  console.log(`Verification: ${verifiedCount} of 132 pharmacy products have valid prices (>0). Zero count: ${zeroCount}`);
  process.exit(0);
}

syncAllPrices().catch(err => {
  console.error("Error during price sync:", err);
  process.exit(1);
});
