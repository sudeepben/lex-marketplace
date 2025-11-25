"use client";

import { useEffect, useState } from "react";
import { apiDeleteAuth, apiGetAuth } from "../../../lib/api";

type Product = {
  id: string;
  title: string;
  price: number;
  category: string;
  photos?: string[];
};

type BookmarkItem = {
  id: string;           // bookmark id
  userId: string;
  productId: string;
  createdAt?: any;
  product: Product | null;
};

export default function MyBookmarksPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // auth gate + fetch bookmarks
  useEffect(() => {
    (async () => {
      const { getAuth, onAuthStateChanged } = await import("firebase/auth");
      const auth = getAuth();
      return onAuthStateChanged(auth, async (u) => {
        setSignedIn(!!u);
        if (!u) {
          setItems([]);
          setLoading(false);
          return;
        }
        try {
          setLoading(true);
          setError(null);
          const res = await apiGetAuth<{ items: BookmarkItem[] }>("/bookmarks");
          setItems(res.items ?? []);
        } catch (e: any) {
          setError(e?.message ?? "Failed to load bookmarks");
        } finally {
          setLoading(false);
        }
      });
    })();
  }, []);

  const removeBookmark = async (bookmarkId: string) => {
    try {
        await apiDeleteAuth(`/bookmarks/${bookmarkId}`);
        setItems((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch (e: any) {
      alert(e?.message || "Failed to remove");
    }
  };

  if (!signedIn) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">My Bookmarks</h1>
        <p className="text-gray-600">
          Please <a href="/sign-in" className="underline">sign in</a> to view your saved items.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">My Bookmarks</h1>
        <a href="/" className="rounded-lg border px-4 py-2 hover:bg-gray-50">Back home</a>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading…</p>
      ) : error ? (
        <div className="rounded-lg border p-4 bg-red-50 text-red-700">{error}</div>
      ) : items.length === 0 ? (
        <p className="text-gray-600">
          You don’t have any saved items yet. Visit the{" "}
          <a href="/" className="underline">homepage</a> and click “Save”.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((b) => {
            const p = b.product;
            return (
              <li key={b.id} className="rounded-xl border p-4 space-y-2">
                <a
                  href={p ? `/products/${p.id}` : "#"}
                  className="block space-y-2"
                >
                  <div className="relative aspect-[16/9] rounded-lg border overflow-hidden flex items-center justify-center">
                    {p?.photos && p.photos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.photos[0]}
                        alt={p.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-gray-500">No photo</span>
                    )}
                    {p?.photos && p.photos.length > 1 && (
                      <span className="absolute right-2 top-2 rounded-md bg-black/70 text-white text-xs px-2 py-0.5">
                        +{p.photos.length - 1}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-medium line-clamp-1">
                      {p ? p.title : "Deleted item"}
                    </h2>
                    <div className="whitespace-nowrap font-semibold">
                      {p ? `$${p.price}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {p ? p.category : ""}
                  </div>
                </a>

                <div className="pt-1">
                  <button
                    onClick={() => removeBookmark(b.id)}
                    className="w-full rounded-lg border px-4 py-2 hover:bg-gray-50"
                    title="Remove from bookmarks"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
