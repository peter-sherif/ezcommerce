import { getCollection } from 'astro:content';
import type { Product } from '../types/product';

export async function getProducts(): Promise<Product[]> {
  const entries = await getCollection('products');
  return entries
    .sort((a, b) => a.data.name.localeCompare(b.data.name))
    .map((entry) => ({
      id: entry.data.id,
      name: entry.data.name,
      description: entry.body.trim(),
      price: entry.data.price,
      image: entry.data.image,
      category: entry.data.category,
      url: `/products/${entry.data.id}/`,
    }));
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const entries = await getCollection('products', ({ data }) => data.featured);
  return entries
    .sort((a, b) => a.data.name.localeCompare(b.data.name))
    .map((entry) => ({
      id: entry.data.id,
      name: entry.data.name,
      description: entry.body.trim(),
      price: entry.data.price,
      image: entry.data.image,
      category: entry.data.category,
      url: `/products/${entry.data.id}/`,
    }));
}
