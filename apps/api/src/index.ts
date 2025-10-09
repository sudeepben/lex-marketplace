// apps/api/src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import path from "node:path";
import { z } from "zod";

// --- Firebase Admin (ensure it runs once)
if (!admin.apps.length) {
  // Prefer explicit path from env; else look for a local file
  const provided = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccountPath = provided
    ? path.resolve(process.cwd(), provided)
    : path.resolve(process.cwd(), "serviceAccount.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const db = admin.firestore();

// --- App
const app = express();
app.use(express.json());

// --- CORS (allow your web origin + auth header)
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:3000";

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// handle preflight explicitly (helps some browsers/proxies)
app.options("*", cors(corsOptions));


// --- Health
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// --- Auth middleware (verifies Firebase ID token from Authorization: Bearer <token>)
async function verifyFirebaseToken(req: any, res: any, next: any) {
  try {
    const authHeader = req.header("authorization") || req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Bearer token" });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).user = decoded; // contains uid, email, etc.
    next();
  } catch (err: any) {
    return res.status(401).json({ error: "Invalid or expired token", details: err?.message });
  }
}

// --- Zod schema for incoming product
const ProductInput = z.object({
  title: z.string().min(2),
  price: z.number().min(0),
  inventory: z.number().int().min(0).default(1),
  condition: z.enum(["new", "used", "refurbished"]).default("used"),
  category: z.string().min(2),
  visibility: z.enum(["public", "private"]).default("public"),
  pickup: z.boolean().default(true),
  shipOptions: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
  // ownerId comes from auth; we’ll ignore any client-provided ownerId for safety
});

// --- Create product (auth required)
app.post("/products", verifyFirebaseToken, async (req, res) => {
  try {
    const parsed = ProductInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    }

    const uid = (req as any).user?.uid as string;
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    const payload = {
      ...parsed.data,
      ownerId: uid, // server-trusts-auth, not the client
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      visibility: parsed.data.visibility,
    };

    // path: /orgs/{orgId}/apps/{appId}/products/{autoId}
    const colRef = db
      .collection("orgs")
      .doc(orgId)
      .collection("apps")
      .doc(appId)
      .collection("products");

    const docRef = await colRef.add(payload);
    return res.status(201).json({ id: docRef.id });
  } catch (err: any) {
    console.error("POST /products error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});

// --- (List) products to help the homepage
app.get("/products", async (_req, res) => {
  try {
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";
    const snap = await db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("products")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ items });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});


// --- Get one product by id
app.get("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    const docRef = db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("products").doc(id);

    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    return res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});


const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
