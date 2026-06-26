import type { APIRoute } from 'astro';
import { GoogleGenAI } from '@google/genai';
import { getProducts } from '../../lib/products';
import { buildSystemPrompt } from '../../lib/assistant-prompt';
import type { AssistantRequest } from '../../types/chat';
import { extractProductIds } from '../../types/chat';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as AssistantRequest;

    if (!body.messages?.length) {
      return new Response(JSON.stringify({ error: 'Messages are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = import.meta.env.PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Production PUBLIC_GEMINI_API_KEY is missing.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const products = await getProducts();
    const systemPrompt = buildSystemPrompt(products);

    const contents = body.messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const reply = aiResponse.text?.trim();

    if (!reply) {
      return new Response(JSON.stringify({ error: 'Empty response from assistant.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        reply,
        productIds: extractProductIds(reply),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Assistant API Error:', error);
    return new Response(JSON.stringify({ error: 'Unexpected assistant error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};