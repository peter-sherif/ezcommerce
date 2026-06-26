import { defineCollection, z } from 'astro:content';

const products = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().positive(),
    image: z.string(),
    category: z.enum(['Apparel', 'Home', 'Accessories', 'Bags']),
    featured: z.boolean().default(true),
  }),
});

export const collections = { products };
