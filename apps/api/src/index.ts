// apps/api/src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { z } from "zod";

// --- Firebase Admin (ensure it runs once)
if (!admin.apps.length) {
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
app.options("*", cors(corsOptions)); // preflight

// --- Static files: serve uploads directory
const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir, { maxAge: "7d" }));

// --- Multer disk storage (5MB/file, max 5 files)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path
      .basename(file.originalname || "file", ext)
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "")
      .slice(0, 40);
    cb(
      null,
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`
    );
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

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
    return res
      .status(401)
      .json({ error: "Invalid or expired token", details: err?.message });
  }
}

// --- Zod schema for incoming product
const ProductInput = z.object({
  title: z.string().min(2).max(80),
  price: z.number().min(0),
  inventory: z.number().int().min(0).default(1),
  condition: z.enum(["new", "used", "refurbished"]).default("used"),
  // store category as trimmed string
  category: z.string().min(2).transform((s) => s.trim()),
  visibility: z.enum(["public", "private"]).default("public"),
  pickup: z.boolean().default(true),
  shipOptions: z.array(z.string()).default([]),
  photos: z.array(z.string()).max(12).default([]),
});

// --- Zod schema for partial updates
const ProductUpdate = z
  .object({
    title: z.string().min(2).optional(),
    price: z.number().min(0).optional(),
    inventory: z.number().int().min(0).optional(),
    condition: z.enum(["new", "used", "refurbished"]).optional(),
    category: z.string().min(2).optional(),
    visibility: z.enum(["public", "private"]).optional(),
    pickup: z.boolean().optional(),
    shipOptions: z.array(z.string()).optional(),
    photos: z.array(z.string()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field required.",
  });

  // --- Zod schema for Reviews
  const ReviewInput = z.object({
    productId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    text: z.string().max(500).optional().default(""),
  });

  // --- Zod schema for Bookmarks
  const BookmarkInput = z.object({
    productId: z.string().min(1),
  });

// ---------- Offers ----------

// Validation
const OfferCreateInput = z.object({
  productId: z.string().min(1),
  amount: z.number().min(0),
  message: z.string().max(1000).optional(),
});

// Create an offer (buyer only)
app.post("/offers", verifyFirebaseToken, async (req, res) => {
  try {
    const parsed = OfferCreateInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const { productId, amount, message } = parsed.data;
    const buyerId = (req as any).user.uid as string;

    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    // Load product to find sellerId / ensure existence
    const productRef = db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("products").doc(productId);

    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: "Product not found" });
    }
    const product = productDoc.data() as any;
    const sellerId = product.ownerId as string;
    if (!sellerId) {
      return res.status(400).json({ error: "Product missing ownerId" });
    }
    if (sellerId === buyerId) {
      return res.status(400).json({ error: "You cannot offer on your own product" });
    }

    // write offer
    const offer = {
      productId,
      buyerId,
      sellerId,
      amount,
      message: message ?? "",
      status: "pending", // pending | accepted | declined
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("offers").add(offer);
    return res.status(201).json({ id: docRef.id });
  } catch (err: any) {
    console.error("POST /offers error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});

// List offers for current user
// GET /offers?role=buyer|seller[&productId=...][&page=1&pageSize=12]
app.get("/offers", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = (req as any).user.uid as string;

    const role = (req.query.role as "buyer" | "seller") || "buyer";
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 12));
    const offset = (page - 1) * pageSize;
    const productId = (req.query.productId as string) || undefined;

    let q: FirebaseFirestore.Query = db.collection("offers");
    q = q.where(role === "buyer" ? "buyerId" : "sellerId", "==", uid);
    if (productId) q = q.where("productId", "==", productId);
    q = q.orderBy("createdAt", "desc");

    const snapAll = await q.get();
    const total = snapAll.size;
    const docs = snapAll.docs.slice(offset, offset + pageSize);
    const items = docs.map((d) => ({ id: d.id, ...d.data() }));

    return res.json({ items, page, pageSize, total });
  } catch (err: any) {
    console.error("GET /offers error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});

// Update offer status (seller only)
const OfferUpdateInput = z.object({
  status: z.enum(["accepted", "declined"]),
});

app.patch("/offers/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const id = req.params.id;
    const parsed = OfferUpdateInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const { status } = parsed.data;
    const uid = (req as any).user.uid as string;

    const offerRef = db.collection("offers").doc(id);
    const doc = await offerRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Offer not found" });

    const offer = doc.data() as any;
    if (offer.sellerId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (offer.status !== "pending") {
      return res.status(400).json({ error: "Offer already processed" });
    }

    await offerRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("PATCH /offers/:id error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});


// --- Handy refs & ownership guard
function productDocRef(orgId: string, appId: string, id: string) {
  return db
    .collection("orgs").doc(orgId)
    .collection("apps").doc(appId)
    .collection("products").doc(id);
}

async function assertOwnerOrThrow(
  docRef: FirebaseFirestore.DocumentReference,
  uid: string
) {
  const snap = await docRef.get();
  if (!snap.exists) {
    const err: any = new Error("Not found");
    err.status = 404;
    throw err;
  }
  const data = snap.data() as any;
  if (data?.ownerId !== uid) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return snap;
}

// --- Create product (auth required)
app.post("/products", verifyFirebaseToken, async (req, res) => {
  try {
    const parsed = ProductInput.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation failed", issues: parsed.error.issues });
    }

    const uid = (req as any).user?.uid as string;
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    const payload = {
      ...parsed.data,
      ownerId: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      visibility: parsed.data.visibility,
    };

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
    return res
      .status(500)
      .json({ error: "Internal error", details: err?.message });
  }
});

// --- Create review (auth required)
app.post("/reviews", verifyFirebaseToken, async (req, res) => {
  try {
    const parsed = ReviewInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    }

    const { productId, rating, text } = parsed.data;
    const uid = (req as any).user?.uid as string;
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    // path: /orgs/{orgId}/apps/{appId}/reviews/{autoId}
    const colRef = db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("reviews");

    const payload = {
      productId,
      rating,
      text,
      authorId: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await colRef.add(payload);
    return res.status(201).json({ id: docRef.id });
  } catch (err: any) {
    console.error("POST /reviews error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});

// --- Create bookmark (auth)
app.post("/bookmarks", verifyFirebaseToken, async (req, res) => {
  try {
    const parsed = BookmarkInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const { productId } = parsed.data;

    const uid = (req as any).user?.uid as string;
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    const colRef = db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("bookmarks");

    // prevent dup for same (userId, productId)
    const dup = await colRef.where("userId","==",uid).where("productId","==",productId).limit(1).get();
    if (!dup.empty) return res.status(200).json({ id: dup.docs[0].id });

    const payload = {
      userId: uid,
      productId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await colRef.add(payload);
    return res.status(201).json({ id: docRef.id });
  } catch (err: any) {
    console.error("POST /bookmarks error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});

// --- Bookmark status for a given product (auth)
app.get("/bookmarks/status", verifyFirebaseToken, async (req, res) => {
  try {
    const productId = String(req.query.productId || "");
    if (!productId) return res.status(400).json({ error: "Missing productId" });

    const uid = (req as any).user?.uid as string;
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    const colRef = db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("bookmarks");

    const snap = await colRef.where("userId","==",uid).where("productId","==",productId).limit(1).get();
    if (snap.empty) return res.json({ bookmarked: false });

    return res.json({ bookmarked: true, id: snap.docs[0].id });
  } catch (err: any) {
    console.error("GET /bookmarks/status error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});

// --- Delete bookmark by id (auth)
app.delete("/bookmarks/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const id = req.params.id;
    const uid = (req as any).user?.uid as string;
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    const docRef = db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("bookmarks").doc(id);

    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    if (doc.data()?.userId !== uid) return res.status(403).json({ error: "Forbidden" });

    await docRef.delete();
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /bookmarks/:id error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});

// --- (Optional) list current user's bookmarks with joined product fields
app.get("/bookmarks", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = (req as any).user?.uid as string;
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    const colRef = db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("bookmarks");

    const snap = await colRef.where("userId","==",uid).orderBy("createdAt","desc").limit(50).get();
    const bookmarks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    // Join product docs
    const prodCol = db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("products");

    const proms = bookmarks.map(b => prodCol.doc(b.productId).get());
    const prodDocs = await Promise.all(proms);

    const items = bookmarks.map((b, i) => {
      const pd = prodDocs[i];
      const product = pd.exists ? { id: pd.id, ...pd.data() } : null;
      return { ...b, product };
    });

    return res.json({ items });
  } catch (err: any) {
    console.error("GET /bookmarks error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});



// --- List products (homepage) with filters + pagination
app.get("/products", async (req, res) => {
  try {
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    // pagination
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 12));
    const offset = (page - 1) * pageSize;

    // filters (existing)
    const category = (req.query.category as string) || undefined;
    const condition = (req.query.condition as "new" | "used" | "refurbished") || undefined;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const visibility = (req.query.visibility as "public" | "private") || undefined;

    // NEW: owner filter
    let ownerId = (req.query.ownerId as string) || undefined;

    // Support ownerId=me (requires auth)
    if (ownerId === "me") {
      try {
        const authHeader = req.header("authorization") || req.header("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return res.status(401).json({ error: "Missing Bearer token" });
        }
        const token = authHeader.slice("Bearer ".length).trim();
        const decoded = await admin.auth().verifyIdToken(token);
        ownerId = decoded.uid;
      } catch (e: any) {
        return res.status(401).json({ error: "Unauthorized", details: e?.message });
      }
    }

    // base collection
    let q: FirebaseFirestore.Query = db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("products");

    // apply filters
    if (category) q = q.where("category", "==", category);
    if (condition) q = q.where("condition", "==", condition);
    if (visibility) q = q.where("visibility", "==", visibility);
    if (ownerId) q = q.where("ownerId", "==", ownerId);
    if (minPrice !== undefined) q = q.where("price", ">=", minPrice);
    if (maxPrice !== undefined) q = q.where("price", "<=", maxPrice);

    // order & paginate (offset is fine for small lists)
    q = q.orderBy("createdAt", "desc");

    const snapAll = await q.get(); // to compute total
    const total = snapAll.size;

    // paginate
    const docs = snapAll.docs.slice(offset, offset + pageSize);
    const items = docs.map((d) => ({ id: d.id, ...d.data() }));

    return res.json({ items, page, pageSize, total });
  } catch (err: any) {
    console.error("GET /products error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});


// --- List reviews for a product + summary
app.get("/reviews", async (req, res) => {
  try {
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";
    const productId = String(req.query.productId || "");

    if (!productId) return res.status(400).json({ error: "Missing productId" });

    const page = Math.max(parseInt(String(req.query.page || "1")), 1);
    const pageSize = Math.min(Math.max(parseInt(String(req.query.pageSize || "20")), 1), 50);

    const colRef = db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("reviews");

    // Order newest first
    const snap = await colRef
      .where("productId", "==", productId)
      .orderBy("createdAt", "desc")
      .limit(pageSize)
      .get();

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Compute summary (avg, count)
    let count = 0, sum = 0;
    items.forEach((r: any) => {
      const n = Number(r.rating || 0);
      if (!Number.isNaN(n)) { sum += n; count += 1; }
    });
    const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

    return res.json({ items, summary: { avg, count }, page, pageSize });
  } catch (err: any) {
    console.error("GET /reviews error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});


app.get("/me/products", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = (req as any).user?.uid as string;
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    const snap = await db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("products")
      .where("ownerId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ items });
  } catch (err: any) {
    console.error("GET /me/products error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});

// --- Get one product by id
app.get("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    const docRef = productDocRef(orgId, appId, id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    return res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: "Internal error", details: err?.message });
  }
});

// --- Update product (auth + owner)
app.put("/products/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const id = req.params.id;
    const uid = (req as any).user?.uid as string;

    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    const docRef = db
      .collection("orgs").doc(orgId)
      .collection("apps").doc(appId)
      .collection("products").doc(id);

    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });

    const current = doc.data() || {};
    if (current.ownerId !== uid) return res.status(403).json({ error: "Forbidden" });

    // Validate incoming fields (reuse your schema but make everything optional)
    const PartialProductInput = z.object({
      title: z.string().min(2).optional(),
      price: z.number().min(0).optional(),
      inventory: z.number().int().min(0).optional(),
      condition: z.enum(["new","used","refurbished"]).optional(),
      category: z.string().min(2).optional(),
      visibility: z.enum(["public","private"]).optional(),
      pickup: z.boolean().optional(),
      shipOptions: z.array(z.string()).optional(),
      photos: z.array(z.string()).optional(),
    });

    const parsed = PartialProductInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    }

    const updates = {
      ...parsed.data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.update(updates);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("PUT /products/:id error", err);
    return res.status(500).json({ error: "Internal error", details: err?.message });
  }
});


// --- Delete product (auth + owner only)
app.delete("/products/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = (req as any).user?.uid as string;
    const id = req.params.id;
    const orgId = process.env.ORG_ID || "default";
    const appId = process.env.APP_ID || "web";

    const ref = productDocRef(orgId, appId, id);
    await assertOwnerOrThrow(ref, uid);

    await ref.delete();
    return res.json({ ok: true });
  } catch (err: any) {
    const status = err?.status ?? 500;
    const msg = err?.message ?? "Internal error";
    if (status >= 500) console.error("DELETE /products/:id error", err);
    return res.status(status).json({ error: msg });
  }
});

// --- Upload images (auth required). Returns public URLs under /uploads/...
app.post(
  "/upload",
  verifyFirebaseToken,
  upload.array("files", 5),
  (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files?.length)
        return res.status(400).json({ error: "No files uploaded" });

      const port = Number(process.env.PORT || 4000);
      const baseUrl =
        process.env.BASE_URL || `http://localhost:${port}`;

      const urls = files.map((f) => `${baseUrl}/uploads/${path.basename(f.path)}`);
      return res.status(201).json({ urls });
    } catch (err: any) {
      console.error("POST /upload error", err);
      return res
        .status(500)
        .json({ error: "Upload failed", details: err?.message });
    }
  }
);

// --- Start
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
