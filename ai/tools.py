# Временные данные только для тестирования.
# Это НЕ реальные товары каталога ekt.kz.

TEST_PRODUCTS = [
    {
        "id": "demo-1",
        "name": "Тестовый автоматический выключатель 16 А, 1P, C",
        "current_a": 16,
        "poles": "1P",
        "curve": "C",
        "price": None,
        "availability": "не проверено",
    },
    {
        "id": "demo-2",
        "name": "Тестовый автоматический выключатель 16 А, 2P, B",
        "current_a": 16,
        "poles": "2P",
        "curve": "B",
        "price": None,
        "availability": "не проверено",
    },
]


def search_products(query: str) -> list[dict]:
    """Временный поиск для проверки работы AI-агента."""
    query = query.lower()

    if "автомат" in query or "выключатель" in query:
        return TEST_PRODUCTS

    return []