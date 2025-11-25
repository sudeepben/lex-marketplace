"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGetAuth, apiDelete } from "../../../lib/api";

type Product = {
  id: string;
  title: string;
  price: number;
  category: string;
  photos?: string[];
  createdAt?: any;
};

export default function MyListingsPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);

  // read current user email (for header note)
  useEffect(() => {
    (async () => {
      const { getAuth, onAuthStateChanged } = await import("firebase/auth");
      const auth = getAuth();
      return onAuthStateChanged(auth, (u) => setEmail(u?.email ?? null));
    })();
  }, []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["me", "products"],
    queryFn: () => apiGetAuth<{ items: Product[] }>("/me/products"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm("Delete this product?")) return;
      await apiDelete(`/products/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me", "products"] }),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">My Listings</h1>
        <p>Loading…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">My Listings</h1>
        <div className="rounded border p-4 bg-red-50 text-red-700">
          {(error as Error).message}
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">My Listings</h1>
        <a href="/products/new" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
          Create Product
        </a>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Signed in as <span className="font-medium">{email ?? "unknown"}</span>
      </p>

      {items.length === 0 ? (
        <p className="text-gray-600">
          You haven’t listed anything yet.{" "}
          <a href="/products/new" className="underline">Create your first listing</a>.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <li key={p.id} className="rounded-xl border p-4 space-y-2">
              <a href={`/products/${p.id}`} className="block">
                <div className="relative aspect-[16/9] rounded-lg border overflow-hidden flex items-center justify-center">
                  {p.photos?.length ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photos[0]} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm text-gray-500">No photo</span>
                  )}
                </div>
                <div className="flex items-start justify-between gap-3 mt-2">
                  <h2 className="font-medium line-clamp-1">{p.title}</h2>
                  <div className="whitespace-nowrap font-semibold">${p.price}</div>
                </div>
                <div className="text-xs text-gray-500">{p.category}</div>
              </a>

              <div className="flex gap-2">
                <a
                  href={`/products/${p.id}`} // we'll add edit later
                  className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                >
                  View
                </a>
                <button
                  onClick={() => del.mutate(p.id)}
                  className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                  disabled={del.isPending}
                >
                  {del.isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
