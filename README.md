
Capstone monorepo. Stack: Next.js 14 (web), Node/Express (API), Firebase, Stripe.

# Lex Marketplace Template (Next.js + Express + Firestore)

Configuration-driven **Marketplace** app for the Lex Social App Builder.  
Features include listings CRUD with photos, filters & pagination, reviews, bookmarks, and buyer/seller offers.

---

## Stack
- **Frontend:** Next.js 14 (App Router, TS, Tailwind)
- **Backend:** Express 5 + Firebase Admin (Firestore)
- **Auth:** Firebase Auth (ID tokens)
- **Utilities:** Zod (validation), Multer (uploads)

## Monorepo Layout


apps/
web/ # Next.js app (UI)
api/ # Express API
firestore/
firestore.rules
indexes.json
uploads/ # local image files (gitignored)


## Environment
Create these files (do **not** commit secrets):

**apps/web/.env.local**

NEXT_PUBLIC_API_URL=http://localhost:4000

**apps/api/.env.local**

PORT=4000
ALLOWED_ORIGIN=http://localhost:3000

ORG_ID=default
APP_ID=web
FIREBASE_SERVICE_ACCOUNT_PATH=../../serviceAccount.json
BASE_URL=http://localhost:4000



Place your Firebase service account at `serviceAccount.json` (repo root).  
Ensure `.gitignore` excludes: `serviceAccount.json`, `*.env*`, `uploads/`.

## Run Locally
```bash
# API
cd apps/api && npm i && npm run dev

# Web
cd apps/web && npm i && npm run dev

Open http://localhost:3000

Firestore Setup

firebase login
firebase use lex-marketplace
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes


If you see “query requires an index”, re-deploy indexes as above.

Implemented Features

Create/Edit/Delete listings (owner-only)

Image uploads to /uploads (local dev)

Reviews (add & list) + average rating summary

Bookmarks (toggle on detail page) + “My bookmarks”

Offers: buyer can create; seller can accept/decline; “Received/Sent” tabs

Filters & pagination on home: search, category, condition, min/max price

“My listings” page (owner’s inventory)



Key API Routes

GET /products (filters & pagination), GET /products/:id

POST /products, PUT /products/:id, DELETE /products/:id

POST /upload

POST /reviews, GET /reviews?productId=...

POST /bookmarks, GET /bookmarks, GET /bookmarks/status, DELETE /bookmarks/:id

POST /offers, GET /offers?role=buyer|seller, PATCH /offers/:id

GET /me/products