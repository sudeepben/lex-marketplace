// apps/web/app/page.tsx
import FiltersBar from "../components/FiltersBar";
import Pagination from "../components/Pagination";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Product = {
  id: string;
  title: string;
  price: number;
  category: string;
  photos: string[];
};

type ProductsResponse = {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
};

// Build a query string from Next.js searchParams
function buildQuery(sp: Record<string, string | string[] | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v) p.set(k, v);
    if (Array.isArray(v)) v.forEach((vv) => vv && p.append(k, vv));
  }
  return p.toString();
}

async function fetchProducts(
  sp: Record<string, string | string[] | undefined>
) {
  const qs = buildQuery(sp);
  const url = `${API_URL}/products${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, message: text, data: null as any };
    }
    const data = (await res.json()) as ProductsResponse;

    // normalize photos
    const items = (data.items ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category,
      photos: Array.isArray(p.photos) ? p.photos : [],
    }));

    return { ok: true, status: 200, data: { ...data, items } };
  } catch (e: any) {
    return { ok: false, status: -1, message: e?.message ?? "fetch error", data: null as any };
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const res = await fetchProducts(searchParams ?? {});

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Latest Products</h1>
        <a href="/products/new" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
          Create Product
        </a>
      </div>

      <FiltersBar
        total={res.ok ? res.data.total : 0}
        pageSize={res.ok ? res.data.pageSize : 12}
      />

      {!res.ok ? (
        <div className="rounded-lg border p-4 bg-red-50 text-red-700">
          <div className="font-medium mb-1">Fetch failed</div>
          <div>Status: {res.status}</div>
          {res.message ? (
            <pre className="mt-2 whitespace-pre-wrap text-xs">{res.message}</pre>
          ) : null}
          <div className="mt-2 text-xs text-gray-600">
            API_URL seen by server: <code>{API_URL}</code>
          </div>
        </div>
      ) : res.data.items.length === 0 ? (
        <p className="text-gray-600">
          No products match those filters.{" "}
          <a href="/" className="underline">Clear filters</a>.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {res.data.items.map((p) => (
              <li key={p.id} className="rounded-xl border p-4">
                <a href={`/products/${p.id}`} className="block space-y-2">
                  <div className="relative aspect-[16/9] rounded-lg border overflow-hidden flex items-center justify-center">
                    {p.photos && p.photos.length > 0 ? (
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
              </li>
            ))}
          </ul>

          <Pagination
            page={res.data.page}
            pageSize={res.data.pageSize}
            total={res.data.total}
          />
        </>
      )}
    </div>
  );
}
