// apps/web/app/products/[id]/page.tsx
import CreatedToast from "../../../components/CreatedToast";
import OwnerActions from "../../../components/OwnerActions";
import Reviews from "../../../components/Reviews";
import BookmarkButton from "../../../components/BookmarkButton";

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

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Server component: fetch directly from API (public route)
  const res = await fetch(`${API_URL}/products/${params.id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Product not found</h1>
        <p className="text-sm text-gray-600">ID: {params.id}</p>
        <a
          href="/"
          className="inline-block mt-4 rounded-lg border px-4 py-2 hover:bg-gray-50"
        >
          Back home
        </a>
      </div>
    );
  }

  const product = (await res.json()) as Product;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      {/* Shows a toast only when ?created=1 is in the URL */}
      <CreatedToast />

      <h1 className="text-3xl font-semibold">{product.title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: media + details */}
        <div className="md:col-span-2 space-y-3">
          {/* Main image */}
          <div className="aspect-video rounded-xl border overflow-hidden flex items-center justify-center">
            {product.photos && product.photos.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.photos[0]}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm text-gray-500">No photos yet</span>
            )}
          </div>

          {/* Additional images */}
          {product.photos && product.photos.length > 1 && (
            <div className="grid grid-cols-3 gap-3">
              {product.photos.slice(1).map((url, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-lg border overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${product.title} ${i + 2}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Facts */}
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
            <span className="font-medium">Pickup:</span>{" "}
            {product.pickup ? "Available" : "No"}
          </p>
          {product.shipOptions?.length ? (
            <p className="text-gray-700">
              <span className="font-medium">Shipping:</span>{" "}
              {product.shipOptions.join(", ")}
            </p>
          ) : null}
        </div>

        {/* Right: actions */}
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

            {/* Make Offer (auth handled on the /offer page) */}
            <a
              href={`/products/${product.id}/offer`}
              className="mt-3 block text-center rounded-lg border px-4 py-2 hover:bg-gray-50"
              title="Propose a price to the seller"
            >
              Make Offer
            </a>
          </div>

          {/* Bookmark toggle */}
          <BookmarkButton productId={product.id} />

          {/* Owner-only actions (Edit/Delete) */}
          <OwnerActions productId={product.id} ownerId={product.ownerId} />

          <a
            href="/"
            className="inline-block rounded-lg border px-4 py-2 hover:bg-gray-50"
          >
            Back home
          </a>
        </div>
      </div>

      {/* Reviews under the grid */}
      <Reviews productId={product.id} />
    </div>
  );
}
