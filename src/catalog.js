export function normalizeProduct(raw) {
  if (!raw || !['string', 'number'].includes(typeof raw.id) || !String(raw.id).trim() || typeof raw.name !== 'string') {
    throw new Error('Некорректная карточка в ответе каталога.');
  }
  const numeric = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
  const stock = numeric(raw.quantity);
  return {
    id: String(raw.id), name: raw.name,
    sku: String(raw.article ?? raw.sku ?? ''),
    price: numeric(raw.price), stock,
    available: stock !== null ? stock > 0 : typeof raw.available === 'boolean' ? raw.available : null,
    image: typeof raw.image === 'string' ? raw.image : null,
    description: typeof raw.description === 'string' ? raw.description : '',
    properties: raw.properties && typeof raw.properties === 'object' && !Array.isArray(raw.properties) ? raw.properties : {},
    stores: Array.isArray(raw.stores) ? raw.stores.filter(store => typeof store.name === 'string' && numeric(store.quantity) !== null) : [],
    url: typeof raw.url === 'string' && /^https?:\/\//.test(raw.url) ? raw.url : null,
  };
}

export async function searchCatalog(baseUrl, query, fetcher = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetcher(baseUrl.replace(/\/$/, '') + '/api/search?' + new URLSearchParams({ q: query.trim() }), { signal: controller.signal });
    if (!response.ok) throw new Error(`Каталог недоступен (HTTP ${response.status}). Попробуйте ещё раз.`);
    const body = await response.json();
    if (!body || !Array.isArray(body.products)) throw new Error('Неожиданный формат ответа каталога.');
    const products = body.products.map(normalizeProduct);
    // Search returns summary records without quantity. Read stock from detail,
    // limiting concurrency and keeping unknown stock distinct from zero.
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, products.length) }, async () => {
      while (next < products.length) {
        const index = next++;
        const product = products[index];
        try {
          const detailResponse = await fetcher(baseUrl.replace(/\/$/, '') + '/api/products/' + encodeURIComponent(product.id), { signal: controller.signal });
          if (!detailResponse.ok) continue;
          const detail = normalizeProduct(await detailResponse.json());
          if (detail.id !== product.id) continue;
          products[index] = { ...product, ...detail };
        } catch { /* Preserve summary; unavailable detail is not zero stock. */ }
      }
    }));
    return products;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Поиск занял больше 30 секунд. Попробуйте более точный артикул.');
    if (error instanceof TypeError) throw new Error('Нет связи с каталогом. Проверьте адрес сервера и подключение.');
    throw error;
  } finally { clearTimeout(timer); }
}
