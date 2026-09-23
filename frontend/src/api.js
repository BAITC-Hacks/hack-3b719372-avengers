export const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function validProduct(product) {
  return (
    product &&
    (typeof product.id === "number" || typeof product.id === "string") &&
    typeof product.name === "string" &&
    (product.price === null ||
      (Number.isFinite(product.price) && product.price >= 0))
  );
}

export async function requestChat(message, history = []) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75000);

  try {
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        history,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      throw new Error(
        typeof failure.detail === "string" ? failure.detail : `Сервер вернул ошибку ${response.status}. Попробуйте позже.`,
      );
    }

    const data = await response.json();

    if (typeof data.answer !== "string" || !Array.isArray(data.history)) {
      throw new Error("Сервер вернул неожиданный формат ответа.");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Ответ занял больше 75 секунд. Попробуйте уточнить запрос и повторить.");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Не удалось связаться с сервером. Проверьте подключение.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
