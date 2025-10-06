import "dotenv/config";
import express from "express";
import cors from "cors";
import admin from "firebase-admin";

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 4000;

// --- Firebase Admin init ---
if (!admin.apps.length) {
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (svc) {
    const raw = svc.trim().startsWith("{")
      ? svc
      : Buffer.from(svc, "base64").toString("utf8");
    const creds = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(creds) });
  } else {
    admin.initializeApp();
  }
}
const db = admin.firestore();

// Health
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Firestore test: write one doc under /orgs/demo-org/apps/market/products
app.get("/firestore-test", async (_req, res) => {
  try {
    const now = Date.now();
    const doc = {
      title: "Hello from API",
      photos: [],
      price: 0,
      inventory: 0,
      condition: "new",
      category: "other",
      shipOptions: [],
      pickup: false,
      createdAt: now,
      updatedAt: now,
      ownerId: "api-test",
      visibility: "public"
    };
    const ref = await db
      .collection("orgs").doc("demo-org")
      .collection("apps").doc("market")
      .collection("products").add(doc);

    res.json({ ok: true, id: ref.id });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});app.get("/products", async (_req, res) => {
  try {
    const snap = await admin.firestore()
      .collectionGroup("products")
      .where("visibility", "==", "public")
      .limit(20)
      .get();

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ ok: true, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String((e as Error).message) });
  }
});
