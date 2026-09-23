from ekt_api import get_products


def extract_products(response):
    """
    Достаёт список товаров из ответа EKT API.
    """

    if isinstance(response, list):
        return response

    if isinstance(response, dict):
        for key in ("products", "items", "data", "results"):
            value = response.get(key)

            if isinstance(value, list):
                return value

    return []


def search_products(query: str, max_pages: int = 5):
    query = query.strip().lower()

    if not query:
        return []

    results = []

    for page in range(1, max_pages + 1):
        response = get_products(page)

        products = extract_products(response)

        if not products:
            break

        for product in products:
            name = str(product.get("name", "")).lower()
            article = str(product.get("article", "")).lower()
            description = str(product.get("description", "")).lower()

            searchable_text = f"{name} {article} {description}"

            if query in searchable_text:
                results.append(product)

        if len(results) >= 20:
            break

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