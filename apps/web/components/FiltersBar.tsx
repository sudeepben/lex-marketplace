"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  total: number;
  pageSize: number;
};

export default function FiltersBar({ total, pageSize }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  // hydrate from URL
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [category, setCategory] = useState(sp.get("category") ?? "");
  const [condition, setCondition] = useState(sp.get("condition") ?? "");
  const [minPrice, setMinPrice] = useState(sp.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(sp.get("maxPrice") ?? "");

  // rebuild URL on submit
  function applyFilters() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category.trim()) params.set("category", category.trim());
    if (condition.trim()) params.set("condition", condition.trim());
    if (minPrice.trim()) params.set("minPrice", minPrice.trim());
    if (maxPrice.trim()) params.set("maxPrice", maxPrice.trim());
    params.set("page", "1"); // reset to page 1 on new search
    router.push(`/?${params.toString()}`);
  }

  function reset() {
    router.push("/");
  }

  const showingText = useMemo(() => {
    const page = Number(sp.get("page") ?? 1);
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(start + pageSize - 1, total);
    if (total === 0) return "No results";
    return `Showing ${start}-${end} of ${total}`;
  }, [sp, pageSize, total]);

  return (
    <div className="rounded-xl border p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <input
          placeholder="Search (title or category)"
          className="rounded-lg border px-3 py-2 md:col-span-2"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          placeholder="Category (exact)"
          className="rounded-lg border px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <select
          className="rounded-lg border px-3 py-2"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          <option value="">Any condition</option>
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="refurbished">Refurbished</option>
        </select>
        <input
          type="number"
          min={0}
          placeholder="Min $"
          className="rounded-lg border px-3 py-2"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          type="number"
          min={0}
          placeholder="Max $"
          className="rounded-lg border px-3 py-2"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">{showingText}</div>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="rounded-lg border px-3 py-2 hover:bg-gray-50"
            type="button"
          >
            Reset
          </button>
          <button
            onClick={applyFilters}
            className="rounded-lg bg-black text-white px-3 py-2"
            type="button"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
