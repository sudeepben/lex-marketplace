// apps/web/app/page.tsx
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Product = {
  id: string;
  title: string;
  price: number;
  category: string;
};

async function fetchProducts(): Promise<{ ok: boolean; status: number; message?: string; items: Product[] }> {
  try {
    const res = await fetch(`${API_URL}/products`, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, message: text, items: [] };
    }
    const data = (await res.json()) as { items: any[] };
    const items = (data.items ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category,
    }));
    return { ok: true, status: 200, items };
  } catch (e: any) {
    return { ok: false, status: -1, message: e?.message ?? "fetch error", items: [] };
  }
}

export default async function HomePage() {
  const res = await fetchProducts();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Latest Products</h1>
        <a href="/products/new" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
          Create Product
        </a>
      </div>

      {!res.ok ? (
        <div className="rounded-lg border p-4 bg-red-50 text-red-700">
          <div className="font-medium mb-1">Fetch failed</div>
          <div>Status: {res.status}</div>
          {res.message ? <pre className="mt-2 whitespace-pre-wrap text-xs">{res.message}</pre> : null}
          <div className="mt-2 text-xs text-gray-600">
            API_URL seen by server: <code>{API_URL}</code>
          </div>
        </div>
      ) : res.items.length === 0 ? (
        <p className="text-gray-600">
          No products yet. Be the first to{" "}
          <a href="/products/new" className="underline">create one</a>.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {res.items.map((p) => (
            <li key={p.id} className="rounded-xl border p-4">
              <a href={`/products/${p.id}`} className="block space-y-2">
                <div className="aspect-video rounded-lg border flex items-center justify-center text-sm text-gray-500">
                  No photo
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
      )}
    </div>
  );
}
