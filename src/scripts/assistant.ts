import type { Product } from '../types/product';
import { stripProductTags } from '../types/chat';

interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  productIds?: string[];
}

const STORAGE_KEY = 'ezcommerce-assistant-messages';

const QUICK_PROMPTS = [
  'Find me a cozy gift under $100',
  'What goes with the linen blazer?',
  'Curate a weekend travel outfit',
];

function getProducts(): Product[] {
  const root = document.getElementById('assistant-root');
  if (!root?.dataset.products) return [];
  try {
    return JSON.parse(root.dataset.products) as Product[];
  } catch {
    return [];
  }
}

function loadMessages(): StoredMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredMessage[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: StoredMessage[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderProductCard(product: Product, origin: string): string {
  return `
    <div class="assistant-product-card">
      <img src="${escapeHtml(product.image)}" alt="" width="48" height="48" />
      <div class="assistant-product-info">
        <a href="${escapeHtml(product.url)}" class="assistant-product-name">${escapeHtml(product.name)}</a>
        <span class="assistant-product-price">$${product.price.toFixed(2)}</span>
      </div>
      <button
        class="snipcart-add-item btn btn-primary assistant-add-btn"
        type="button"
        data-item-id="${escapeHtml(product.id)}"
        data-item-name="${escapeHtml(product.name)}"
        data-item-price="${product.price}"
        data-item-url="${escapeHtml(origin + product.url)}"
        data-item-image="${escapeHtml(origin + product.image)}"
        data-item-description="${escapeHtml(product.description)}"
      >Add</button>
    </div>
  `;
}

function renderMessage(msg: StoredMessage, products: Product[], origin: string): string {
  const isUser = msg.role === 'user';
  const text = isUser ? msg.content : stripProductTags(msg.content);
  const productCards =
    !isUser && msg.productIds?.length
      ? msg.productIds
          .map((id) => products.find((p) => p.id === id))
          .filter(Boolean)
          .map((p) => renderProductCard(p!, origin))
          .join('')
      : '';

  return `
    <div class="assistant-message ${isUser ? 'assistant-message--user' : 'assistant-message--assistant'}">
      <div class="assistant-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
      ${productCards ? `<div class="assistant-products">${productCards}</div>` : ''}
    </div>
  `;
}

function renderAllMessages(
  container: HTMLElement,
  messages: StoredMessage[],
  products: Product[],
  origin: string,
) {
  container.innerHTML = messages
    .map((msg) => renderMessage(msg, products, origin))
    .join('');
  container.scrollTop = container.scrollHeight;
}

export function initAssistant() {
  const root = document.getElementById('assistant-root');
  if (!root) return;

  const products = getProducts();
  const origin = window.location.origin;
  const toggle = root.querySelector<HTMLButtonElement>('[data-assistant-toggle]');
  const panel = root.querySelector<HTMLElement>('[data-assistant-panel]');
  const closeBtn = root.querySelector<HTMLButtonElement>('[data-assistant-close]');
  const messagesEl = root.querySelector<HTMLElement>('[data-assistant-messages]');
  const form = root.querySelector<HTMLFormElement>('[data-assistant-form]');
  const input = root.querySelector<HTMLTextAreaElement>('[data-assistant-input]');
  const sendBtn = root.querySelector<HTMLButtonElement>('[data-assistant-send]');
  const promptsEl = root.querySelector<HTMLElement>('[data-assistant-prompts]');

  if (!toggle || !panel || !messagesEl || !form || !input || !sendBtn) return;

  let messages = loadMessages();
  let isOpen = false;
  let isLoading = false;

  function setOpen(open: boolean) {
    isOpen = open;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      input.focus();
      renderAllMessages(messagesEl, messages, products, origin);
    }
  }

  function setLoading(loading: boolean) {
    isLoading = loading;
    sendBtn.disabled = loading;
    input.disabled = loading;
    const existing = messagesEl.querySelector('.assistant-typing');
    if (loading) {
      messagesEl.insertAdjacentHTML(
        'beforeend',
        '<div class="assistant-typing" aria-live="polite"><span></span><span></span><span></span></div>',
      );
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else {
      existing?.remove();
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    messages.push({ role: 'user', content: trimmed });
    saveMessages(messages);
    renderAllMessages(messagesEl, messages, products, origin);
    input.value = '';
    setLoading(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Request failed');
      }

      messages.push({
        role: 'assistant',
        content: data.reply,
        productIds: data.productIds ?? [],
      });
      saveMessages(messages);
      renderAllMessages(messagesEl, messages, products, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      messages.push({
        role: 'assistant',
        content: `Sorry, I couldn't reach the stylist right now. ${message}`,
      });
      saveMessages(messages);
      renderAllMessages(messagesEl, messages, products, origin);
    } finally {
      setLoading(false);
    }
  }

  toggle.addEventListener('click', () => setOpen(!isOpen));
  closeBtn?.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) setOpen(false);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  if (promptsEl) {
    promptsEl.innerHTML = QUICK_PROMPTS.map(
      (prompt) =>
        `<button type="button" class="assistant-prompt-chip" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`,
    ).join('');

    promptsEl.addEventListener('click', (e) => {
      const chip = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-prompt]');
      if (chip?.dataset.prompt) sendMessage(chip.dataset.prompt);
    });
  }

  if (messages.length === 0) {
    messages.push({
      role: 'assistant',
      content:
        "Hi! I'm your personal shopping assistant. Tell me about your style, an occasion you're dressing for, or a gift you're hunting — I'll curate picks from our collection.",
    });
    saveMessages(messages);
  }

  renderAllMessages(messagesEl, messages, products, origin);
}

document.addEventListener('astro:page-load', initAssistant);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssistant);
} else {
  initAssistant();
}
