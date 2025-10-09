// apps/web/app/products/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "../../../lib/api"; // <-- relative import, no alias needed

// Minimal product schema for the form
const ProductSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  price: z.coerce.number().min(0, "Price must be >= 0"),
  inventory: z.coerce.number().int().min(0, "Inventory must be >= 0").default(1),
  condition: z.enum(["new", "used", "refurbished"]).default("used"),
  category: z.string().min(2, "Category required."),
  visibility: z.enum(["public", "private"]).default("public"),
  pickup: z.boolean().default(true),
  shipOptions: z.array(z.string()).default([]),
});

type ProductInput = z.infer<typeof ProductSchema>;

export default function CreateProductPage() {
  const router = useRouter();

  // read auth state from Firebase directly (works with your existing provider initialization)
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { getAuth, onAuthStateChanged } = await import("firebase/auth");
      const auth = getAuth();
      return onAuthStateChanged(auth, (u) => {
        setSignedIn(!!u);
        setUserEmail(u?.email ?? null);
        setUserId(u?.uid ?? null);
      });
    })();
  }, []);

  const [form, setForm] = useState<ProductInput>({
    title: "",
    price: 0,
    inventory: 1,
    condition: "used",
    category: "",
    visibility: "public",
    pickup: true,
    shipOptions: [],
  });

  const canSubmit = useMemo(() => {
    const check = ProductSchema.safeParse(form);
    return check.success && !!userId;
  }, [form, userId]);

  // ⬇️ CHANGE #1: keep returning { id } from the API and type it
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        ownerId: userId,   // server will ignore and use token uid; harmless
        photos: [],        // placeholder for now
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return apiPost<{ id: string }>("/products", payload);
    },
    // ⬇️ CHANGE #2: redirect to the new product's detail page
    onSuccess: (data) => {
      router.push(`/products/${data.id}?created=1`);
    },
  });

  if (!signedIn) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Create Product</h1>
        <p className="mb-3">You must sign in to create a product.</p>
        <a href="/sign-in" className="inline-block rounded-lg border px-4 py-2 hover:bg-gray-50">
          Go to Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Create Product</h1>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = ProductSchema.safeParse(form);
          if (!parsed.success) {
            alert(parsed.error.issues.map(i => i.message).join("\n"));
            return;
          }
          createMutation.mutate();
        }}
      >
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g., MacBook Pro 14”"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Price (USD)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded-lg border px-3 py-2"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Inventory</label>
            <input
              type="number"
              min={0}
              step="1"
              className="w-full rounded-lg border px-3 py-2"
              value={form.inventory}
              onChange={(e) => setForm({ ...form, inventory: Number(e.target.value) })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Condition</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value as "new" | "used" | "refurbished" })}
            >
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Category</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g., Electronics"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Visibility</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value as "public" | "private" })}
            >
              <option value="public">Public</option>
              <option value="private">Private (draft)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="pickup"
              type="checkbox"
              checked={form.pickup}
              onChange={(e) => setForm({ ...form, pickup: e.target.checked })}
              className="h-5 w-5"
            />
            <label htmlFor="pickup" className="text-sm">Local pickup available</label>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={!canSubmit || createMutation.isPending}
            className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Product"}
          </button>
        </div>

        {createMutation.isError && (
          <p className="text-red-600 text-sm">
            {(createMutation.error as Error).message}
          </p>
        )}
      </form>

      <p className="mt-6 text-xs text-gray-500">
        Signed in as <span className="font-medium">{userEmail}</span>
      </p>
    </div>
  );
}
