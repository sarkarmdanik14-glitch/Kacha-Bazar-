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

async function checkAdmins() {
  const adminSnap = await getDocs(collection(db, "admins"));
  console.log("Admins docs count:", adminSnap.size);
  adminSnap.forEach(d => console.log("admin doc:", d.id, d.data()));

  const staffSnap = await getDocs(collection(db, "staff"));
  console.log("Staff docs count:", staffSnap.size);
  staffSnap.forEach(d => console.log("staff doc:", d.id, d.data()));

  process.exit(0);
}

checkAdmins().catch(console.error);
