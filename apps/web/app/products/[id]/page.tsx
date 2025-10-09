// apps/web/app/products/[id]/page.tsx
import CreatedToast from "../../../components/CreatedToast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Product = {
  id: string;
  title: string;
  price: number;
  inventory: number;
  condition: "new" | "used" | "refurbished";
  category: string;
  visibility: "public" | "private";
  pickup: boolean;
  shipOptions: string[];
  photos: string[];
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
};

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  // Server component: fetch straight from API (public route)
  const res = await fetch(`${API_URL}/products/${params.id}`, { cache: "no-store" });
  if (!res.ok) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Product not found</h1>
        <p className="text-sm text-gray-600">ID: {params.id}</p>
        <a href="/" className="inline-block mt-4 rounded-lg border px-4 py-2 hover:bg-gray-50">
          Back home
        </a>
      </div>
    );
  }
  const product = (await res.json()) as Product;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <CreatedToast /> {/* Shows toast only when ?created=1 */}
      <h1 className="text-3xl font-semibold">{product.title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          <div className="aspect-video rounded-xl border flex items-center justify-center">
            <span className="text-sm text-gray-500">No photos yet</span>
          </div>
          <p className="text-gray-700">
            <span className="font-medium">Category:</span> {product.category}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Condition:</span> {product.condition}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Inventory:</span> {product.inventory}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Pickup:</span> {product.pickup ? "Available" : "No"}
          </p>
          {product.shipOptions?.length ? (
            <p className="text-gray-700">
              <span className="font-medium">Shipping:</span> {product.shipOptions.join(", ")}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border p-4">
            <div className="text-2xl font-semibold">${product.price}</div>
            <button
              className="mt-3 w-full rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
              disabled
              title="Checkout coming soon"
            >
              Buy now
            </button>
          </div>
          <a href="/" className="inline-block rounded-lg border px-4 py-2 hover:bg-gray-50">
            Back home
          </a>
        </div>
      </div>
    </div>
  );
}
