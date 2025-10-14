"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGetAuth } from "../../lib/api";
import OwnerActions from "../../components/OwnerActions";

type Product = {
  id: string;
  title: string;
  price: number;
  category: string;
  photos?: string[];
  ownerId: string;
};

type ListResp = {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
};

export default function MyListingsPage() {
  const router = useRouter();
  const search = useSearchParams();

  const page = Math.max(1, Number(search.get("page") || 1));
  const pageSize = Math.max(1, Number(search.get("pageSize") || 12));

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [data, setData] = useState<ListResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // watch auth
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const { getAuth, onAuthStateChanged } = await import("firebase/auth");
      const auth = getAuth();
      unsub = onAuthStateChanged(auth, (u) => setSignedIn(!!u));
    })();
    return () => unsub();
  }, []);

  useEffect(() => {
    if (signedIn === false) {
      // not signed in -> redirect to sign-in
      router.push("/sign-in?next=/my-listings");
      return;
    }
    if (signedIn === null) return; // still checking

    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const resp = await apiGetAuth<ListResp>(`/products?ownerId=me&page=${page}&pageSize=${pageSize}`);
        setData(resp);
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [signedIn, page, pageSize, router]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const goTo = (p: number) => {
    const params = new URLSearchParams(search?.toString() || "");
    params.set("page", String(p));
    params.set("pageSize", String(pageSize));
    router.push(`/my-listings?${params.toString()}`);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">My Listings</h1>
        <a href="/" className="rounded-lg border px-4 py-2 hover:bg-gray-50">Back home</a>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading…</p>
      ) : err ? (
        <div className="rounded-lg border p-4 bg-red-50 text-red-700">{err}</div>
      ) : !data || data.items.length === 0 ? (
        <p className="text-gray-600">No listings yet. <a className="underline" href="/products/new">Create one</a>.</p>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-3">
            Showing {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </p>

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((p) => (
              <li key={p.id} className="rounded-xl border p-4">
                <a href={`/products/${p.id}`} className="block space-y-2">
                  <div className="relative aspect-[16/9] rounded-lg border overflow-hidden flex items-center justify-center">
                    {p.photos?.length ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photos[0]} alt={p.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm text-gray-500">No photo</span>
                    )}
                    {p.photos && p.photos.length > 1 && (
                      <span className="absolute right-2 top-2 rounded-md bg-black/70 text-white text-xs px-2 py-0.5">
                        +{p.photos.length - 1}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-medium line-clamp-1">{p.title}</h2>
                    <div className="whitespace-nowrap font-semibold">${p.price}</div>
                  </div>
                  <div className="text-xs text-gray-500">{p.category}</div>
                </a>

                {/* owner actions inline for quick manage */}
                <div className="mt-3">
                  <OwnerActions productId={p.id} ownerId={p.ownerId} />
                </div>
              </li>
            ))}
          </ul>

          {/* simple pagination */}
          <div className="mt-6 flex items-center gap-2">
            <button
              className="rounded-lg border px-3 py-1 disabled:opacity-50"
              disabled={data.page <= 1}
              onClick={() => goTo(data.page - 1)}
            >
              Prev
            </button>
            <span className="text-sm">
              Page {data.page} of {totalPages}
            </span>
            <button
              className="rounded-lg border px-3 py-1 disabled:opacity-50"
              disabled={data.page >= totalPages}
              onClick={() => goTo(data.page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
