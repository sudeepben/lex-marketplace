// apps/web/app/products/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "../../../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

  // auth state (from Firebase client SDK)
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

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

  // Upload via API (multipart/form-data). Returns array of URLs.
  async function uploadAllSelectedFiles(): Promise<string[]> {
    if (files.length === 0) return [];
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    // include auth token
    const { getAuth } = await import("firebase/auth");
    const token = await getAuth().currentUser?.getIdToken();

    const res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } as any : undefined,
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Upload failed: ${res.status} ${res.statusText} ${text}`);
    }
    const data = (await res.json()) as { urls: string[] };
    return data.urls || [];
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");

      // 1) upload images via API
      const photoUrls = await uploadAllSelectedFiles();

      // 2) assemble payload
      const payload = {
        ...form,
        photos: photoUrls,
        ownerId: userId,   // server will set owner from token; harmless
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 3) POST to API
      return apiPost<{ id: string }>("/products", payload);
    },
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
            alert(parsed.error.issues.map((i) => i.message).join("\n"));
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
              onChange={(e) =>
                setForm({ ...form, condition: e.target.value as "new" | "used" | "refurbished" })
              }
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

        {/* Photos */}
        <div>
          <label className="block text-sm mb-1">Photos (up to 5)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              setFiles(list.slice(0, 5));
            }}
          />
          {files.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {files.map((f, i) => {
                const url = URL.createObjectURL(f);
                return (
                  <div key={i} className="aspect-square rounded-lg border overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={f.name} className="h-full w-full object-cover" />
                  </div>
                );
              })}
            </div>
          )}
          {files.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">Images will upload when you submit.</p>
          )}
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
