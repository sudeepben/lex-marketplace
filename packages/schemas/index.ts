import { z } from "zod";

export const Visibility = z.enum(["public","private","unlisted"]);
export const Condition = z.enum(["new","like-new","good","fair"]);
export const Category = z.enum(["electronics","furniture","fashion","sports","toys","other"]);

export const Product = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(80),
  photos: z.array(z.string().url()).max(12),
  price: z.number().int().nonnegative(),
  inventory: z.number().nonnegative(),
  condition: Condition,
  category: Category,
  shipOptions: z.array(z.string()).default([]),
  pickup: z.boolean().default(false),
  geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  address: z.string().optional(),

  createdAt: z.number(),
  updatedAt: z.number(),
  ownerId: z.string(),
  visibility: Visibility
});
export type Product = z.infer<typeof Product>;