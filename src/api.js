export const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function validProduct(product) {
  return product && typeof product.id === 'string' && typeof product.name === 'string'
    && Number.isFinite(product.price) && product.price >= 0 && typeof product.available === 'boolean';
}

export async function requestChat(message, sessionId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Сервер вернул ошибку ${response.status}. Попробуйте позже.`);
    const data = await response.json();
    if (typeof data.message !== 'string' || !Array.isArray(data.products) || !data.products.every(validProduct)) {
      throw new Error('Сервер вернул неожиданный формат ответа.');
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Сервер не ответил за 30 секунд. Попробуйте ещё раз.');
    if (error instanceof TypeError) throw new Error('Не удалось связаться с сервером. Проверьте подключение.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
