"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGetAuth, apiPatchAuth } from "../../lib/api";

type Offer = {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  message?: string;
  status: "pending" | "accepted" | "declined";
  createdAt?: any;
};

type ListResp = {
  items: Offer[];
  page: number;
  pageSize: number;
  total: number;
};

export default function OffersPage() {
  const router = useRouter();
  const search = useSearchParams();

  const tab = (search.get("tab") as "received" | "sent") || "received";
  const page = Math.max(1, Number(search.get("page") || 1));
  const pageSize = Math.max(1, Number(search.get("pageSize") || 12));

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

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
      router.push("/sign-in?next=/offers");
      return;
    }
    if (signedIn === null) return;

    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const resp = await apiGetAuth<ListResp>(
          `/offers?role=${tab === "received" ? "seller" : "buyer"}&page=${page}&pageSize=${pageSize}`
        );
        setData(resp);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load offers");
      } finally {
        setLoading(false);
      }
    })();
  }, [signedIn, tab, page, pageSize, router]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const go = (updates: Record<string, string>) => {
    const params = new URLSearchParams(search?.toString() || "");
    Object.entries(updates).forEach(([k, v]) => params.set(k, v));
    router.push(`/offers?${params.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Offers</h1>
        <a href="/" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
          Back home
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          className={`rounded-lg border px-3 py-1 ${tab === "received" ? "bg-black text-white" : ""}`}
          onClick={() => go({ tab: "received", page: "1" })}
        >
          Received
        </button>
        <button
          className={`rounded-lg border px-3 py-1 ${tab === "sent" ? "bg-black text-white" : ""}`}
          onClick={() => go({ tab: "sent", page: "1" })}
        >
          Sent
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading…</p>
      ) : err ? (
        <div className="rounded-lg border p-4 bg-red-50 text-red-700">{err}</div>
      ) : !data || data.items.length === 0 ? (
        <p className="text-gray-600">No offers in this tab.</p>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Showing {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </p>

          <ul className="space-y-3">
            {data.items.map((o) => (
              <li key={o.id} className="rounded-xl border p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Product:</div>
                  <a href={`/products/${o.productId}`} className="underline">
                    {o.productId}
                  </a>
                  <div className="text-lg font-semibold">${o.amount}</div>
                  {o.message ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{o.message}</p> : null}
                  <div className="text-xs text-gray-500">Status: {o.status}</div>
                </div>

                {/* Actions for received (seller side) and pending */}
                {tab === "received" && o.status === "pending" ? (
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border px-3 py-1 hover:bg-green-50"
                      onClick={async () => {
                        try {
                          setActionErr(null);
                          await apiPatchAuth<{ ok: boolean }>(`/offers/${o.id}`, { status: "accepted" });
                          go({}); // refresh
                        } catch (e: any) {
                          setActionErr(e?.message ?? "Failed to update");
                        }
                      }}
                    >
                      Accept
                    </button>
                    <button
                      className="rounded-lg border px-3 py-1 text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        try {
                          setActionErr(null);
                          await apiPatchAuth<{ ok: boolean }>(`/offers/${o.id}`, { status: "declined" });
                          go({});
                        } catch (e: any) {
                          setActionErr(e?.message ?? "Failed to update");
                        }
                      }}
                    >
                      Decline
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {actionErr ? <p className="text-sm text-red-600 mt-2">{actionErr}</p> : null}

          <div className="mt-4 flex items-center gap-2">
            <button
              className="rounded-lg border px-3 py-1 disabled:opacity-50"
              disabled={data.page <= 1}
              onClick={() => go({ page: String(data.page - 1) })}
            >
              Prev
            </button>
            <span className="text-sm">Page {data.page} of {totalPages}</span>
            <button
              className="rounded-lg border px-3 py-1 disabled:opacity-50"
              disabled={data.page >= totalPages}
              onClick={() => go({ page: String(data.page + 1) })}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
