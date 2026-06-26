export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantRequest {
  messages: ChatMessage[];
}

export interface AssistantResponse {
  reply: string;
  productIds: string[];
}

export const PRODUCT_TAG_PATTERN = /\[PRODUCT:([a-z0-9-]+)\]/gi;

export function extractProductIds(text: string): string[] {
  const ids = new Set<string>();
  for (const match of text.matchAll(PRODUCT_TAG_PATTERN)) {
    if (match[1]) ids.add(match[1]);
  }
  return [...ids];
}

export function stripProductTags(text: string): string {
  return text.replace(PRODUCT_TAG_PATTERN, '').replace(/\n{3,}/g, '\n\n').trim();
}
