import type { APIRoute } from 'astro';
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

    const baseUrl = import.meta.env.ANTHROPIC_BASE_URL ?? 'http://localhost:4000';
    const apiKey = import.meta.env.ANTHROPIC_API_KEY ?? 'DUMMY_KEY';
    const model = import.meta.env.ANTHROPIC_MODEL ?? 'gemini-2.5-flash';

    const products = await getProducts();
    const systemPrompt = buildSystemPrompt(products);

    const llmResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...body.messages],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!llmResponse.ok) {
      const detail = await llmResponse.text();
      console.error('LiteLLM error:', llmResponse.status, detail);
      return new Response(
        JSON.stringify({
          error: 'Assistant is temporarily unavailable. Is LiteLLM running on port 4000?',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const data = await llmResponse.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

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
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Assistant API error:', error);
    return new Response(JSON.stringify({ error: 'Unexpected assistant error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
