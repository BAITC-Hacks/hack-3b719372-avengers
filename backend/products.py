from backend.ekt_api import get_products


def extract_products(response):
    if isinstance(response, list):
        return response

    if isinstance(response, dict):
        for key in ("products", "items", "data", "results"):
            value = response.get(key)

            if isinstance(value, list):
                return value

    return []


def search_products(query: str, max_pages: int = 10):
    query = query.strip().lower()

    if not query:
        return []

    # Разбиваем запрос на отдельные слова
    query_words = query.split()

    results = []

    for page in range(1, max_pages + 1):
        response = get_products(page)
        products = extract_products(response)

        if not products:
            break

        for product in products:
            name = str(product.get("name", "")).lower()
            article = str(product.get("article", "")).lower()

            searchable_text = f"{name} {article}"

            # Считаем количество совпавших слов
            score = sum(
                1 for word in query_words
                if word in searchable_text
            )

            if score > 0:
                product_copy = product.copy()
                product_copy["_search_score"] = score

                results.append(product_copy)

    # Сначала товары с большим количеством совпадений
    results.sort(
        key=lambda product: product["_search_score"],
        reverse=True
    )

    # Убираем техническое поле
    for product in results:
        product.pop("_search_score", None)

    return results[:20]

def normalize_product(product: dict):
    properties = product.get("properties") or {}

    return {
        "id": product.get("id"),
        "name": product.get("name"),
        "article": product.get("article"),
        "description": product.get("description"),

        "price": product.get("price"),
        "quantity": product.get("quantity", 0),
        "available": product.get("quantity", 0) > 0,

        "image": product.get("image"),
        "url": product.get("url"),

        "brand": properties.get("TORGOVAYA_MARKA"),
        "category": properties.get("OBYEM"),
        "poles": properties.get("KOLICHESTVO_POLYUSOV"),
        "current": properties.get("NOMINALNYY_TOK"),
        "voltage": properties.get("NOMINALNOE_NAPRYAZHENIE"),
        "breaking_capacity": properties.get(
            "NOMINALNAYA_OTKLYUCHAYUSHCHAYA_SPOSOBNOST"
        ),

        "properties": properties,
        "stores": product.get("stores", [])
    }