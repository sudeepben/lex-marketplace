// packages/schemas/product.ts

export type Condition = "new" | "used" | "refurbished";
export type Visibility = "public" | "private";

export interface Product {
  /** Firestore document id (not stored inside the doc) */
  id: string;

  /** Required. 2–80 chars. */
  title: string;

  /** Required. USD dollars as a number (not cents). Non-negative. */
  price: number;

  /** Required. Integer >= 0 */
  inventory: number;

  /** Required. One of: new | used | refurbished */
  condition: Condition;

  /** Required. Category name (free text for now; document common values in README) */
  category: string;

  /** Optional. e.g., ["UPS","USPS"] */
  shipOptions: string[];

  /** Required. true if local pickup is available */
  pickup: boolean;

  /** Optional. Up to 12 image URLs. First is used as cover/thumbnail. */
  photos: string[];

  /** Required. Owner’s Firebase UID */
  ownerId: string;

  /** Required. "public" or "private" */
  visibility: Visibility;

  /** Firestore timestamps */
  createdAt?: any;
  updatedAt?: any;
}
