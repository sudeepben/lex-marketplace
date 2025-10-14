"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { apiGet } from "../../../../lib/api";        // public GET for product info
import { apiPutAuth } from "../../../../lib/api";     // auth PUT for updates
import { storage } from "../../../../lib/storage";    // for optional photo re-upload (local)
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const ProductSchema = z.object({
  title: z.string().min(2),
  price: z.coerce.number().min(0),
  inventory: z.coerce.number().int().min(0),
  condition: z.enum(["new","used","refurbished"]),
  category: z.string().min(2),
  visibility: z.enum(["public","private"]),
  pickup: z.boolean(),
  shipOptions: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
  ownerId: z.string().min(1),
});

type Product = z.infer<typeof ProductSchema>;

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [product, setProduct] = useState<Product | null>(null);

  // Fetch product
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/products/${params.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Not found");
        const p = await res.json();
        const parsed = ProductSchema.safeParse(p);
        if (!parsed.success) throw new Error("Bad data");
        setProduct(parsed.data);
      } catch (e) {
        alert("Product not found");
        router.push("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, router]);

  const canSave = useMemo(() => !!product, [product]);

  const onChange = (patch: Partial<Product>) => {
    setProduct((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const uploadPhotosIfAny = async () => {
    if (!files.length) return null as string[] | null;
    // using local file-server-based /uploads? If you kept Storage configured you can use it too
    // Here we’ll use Firebase Storage (since storage.ts is present).
    const urls: string[] = [];
    for (const file of files) {
      const path = `products/${params.id}/${Date.now()}-${file.name}`;
      const r = ref(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      urls.push(url);
    }
    return urls;
  };

  const save = async () => {
    if (!product) return;
    setSaving(true);
    try {
      // optional: if new files picked, replace photos
      let photosPatch: string[] | undefined = undefined;
      const newUrls = await uploadPhotosIfAny();
      if (newUrls && newUrls.length > 0) {
        photosPatch = newUrls; // replace with new photos
      }

      const payload: Partial<Product> = {
        title: product.title,
        price: Number(product.price),
        inventory: Number(product.inventory),
        condition: product.condition,
        category: product.category,
        visibility: product.visibility,
        pickup: product.pickup,
        shipOptions: product.shipOptions || [],
        ...(photosPatch ? { photos: photosPatch } : {}),
      };

      await apiPutAuth<{ ok: true }>(`/products/${params.id}`, payload);
      router.push(`/products/${params.id}`);
    } catch (e: any) {
      alert(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !product) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Edit Product</h1>
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Edit Product</h1>

      <div className="space-y-5">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={product.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Price (USD)</label>
            <input
              type="number"
              className="w-full rounded-lg border px-3 py-2"
              min={0}
              step="0.01"
              value={product.price}
              onChange={(e) => onChange({ price: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Inventory</label>
            <input
              type="number"
              className="w-full rounded-lg border px-3 py-2"
              min={0}
              step="1"
              value={product.inventory}
              onChange={(e) => onChange({ inventory: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Condition</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={product.condition}
              onChange={(e) => onChange({ condition: e.target.value as any })}
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
              value={product.category}
              onChange={(e) => onChange({ category: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Visibility</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={product.visibility}
              onChange={(e) => onChange({ visibility: e.target.value as any })}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-7">
            <input
              id="pickup"
              type="checkbox"
              checked={product.pickup}
              onChange={(e) => onChange({ pickup: e.target.checked })}
              className="h-5 w-5"
            />
            <label htmlFor="pickup" className="text-sm">Local pickup available</label>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Replace photos (optional)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          {product.photos?.length ? (
            <p className="text-xs text-gray-600 mt-1">
              Current photos: {product.photos.length}. Uploading new files will replace all photos.
            </p>
          ) : null}
        </div>

        <div className="pt-2">
          <button
            onClick={save}
            disabled={!canSave || saving}
            className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <a href={`/products/${params.id}`} className="ml-3 rounded-lg border px-4 py-2 hover:bg-gray-50">
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}
