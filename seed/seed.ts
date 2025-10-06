import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), "..", "serviceAccount.json");
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(saPath, "utf8"))) });
}
const db = admin.firestore();

const ORG = "demo-org";
const APP = "market";

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "seed.json"), "utf8"));

(async () => {
  for (const item of data) {
    const now = Date.now();
    const doc = {
      ...item,
      createdAt: now,
      updatedAt: now,
      ownerId: "seed",
    };
    await db.collection("orgs").doc(ORG)
      .collection("apps").doc(APP)
      .collection("products").add(doc);
  }
  console.log(`Seeded ${data.length} products to /orgs/${ORG}/apps/${APP}/products`);
  process.exit(0);
})();