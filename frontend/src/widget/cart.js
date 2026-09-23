export async function addServerCart(base, productId, quantity, fetcher = fetch) {
  if (!/^\d+$/.test(String(productId)) || !Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error('Проверьте товар и количество.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetcher(base.replace(/\/$/, '') + '/api/cart/add?' + new URLSearchParams({ product_id: productId, quantity }), {
      method: 'POST', signal: controller.signal,
    });
    if (!response.ok) {
      let data;
      try { data = await response.json(); } catch { /* Non-JSON server failure */ }
      if (response.status === 400 && typeof data?.detail === 'string') throw new Error(data.detail);
      throw new Error('Не удалось подтвердить добавление. Проверьте корзину на сервере перед повторной попыткой.');
    }
    const data = await response.json();
    if (!Array.isArray(data?.items) || !Number.isFinite(data.total) || !Number.isFinite(data.items_count)) {
      throw new Error('Сервер вернул неожиданный ответ. Проверьте корзину перед повторной попыткой.');
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ekt-cart-updated', { detail: { base } }));
    return data;
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) {
      throw new Error('Ответ не получен. Товар мог добавиться — проверьте корзину на сервере перед повтором.');
    }
    throw error;
  } finally { clearTimeout(timer); }
}

export async function readServerCart(base, fetcher = fetch) {
  const response = await fetcher(base.replace(/\/$/, '') + '/api/cart', { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось загрузить корзину.');
  const data = await response.json();
  if (!Array.isArray(data?.items) || !data.items.every(item => item && typeof item.name === 'string' && Number.isFinite(item.price) && Number.isInteger(item.quantity) && item.quantity > 0)) throw new Error('Некорректный ответ корзины.');
  return data.items.map(item => ({ ...item, id: String(item.id), sku: item.article }));
}
