from ekt_api import get_product_detail

cart = {}


def get_cart():
    items = []
    total = 0

    for product_id, item in cart.items():
        subtotal = item["price"] * item["quantity"]

        items.append({
            **item,
            "subtotal": subtotal
        })

        total += subtotal

    return {
        "items": items,
        "total": total,
        "items_count": sum(item["quantity"] for item in cart.values())
    }


def add_to_cart(product_id: int, quantity: int = 1):
    if quantity < 1:
        raise ValueError("Количество должно быть больше 0")

    product = get_product_detail(product_id)

    available_quantity = product.get("quantity", 0)

    if available_quantity < quantity:
        raise ValueError(
            f"Недостаточно товара. Доступно: {available_quantity}"
        )

    if product_id in cart:
        new_quantity = cart[product_id]["quantity"] + quantity

        if new_quantity > available_quantity:
            raise ValueError(
                f"Недостаточно товара. Доступно: {available_quantity}"
            )

        cart[product_id]["quantity"] = new_quantity

    else:
        cart[product_id] = {
            "id": product["id"],
            "name": product["name"],
            "article": product["article"],
            "price": product["price"],
            "image": product.get("image"),
            "url": product.get("url"),
            "quantity": quantity
        }

    return get_cart()


def remove_from_cart(product_id: int):
    if product_id not in cart:
        raise ValueError("Товар отсутствует в корзине")

    del cart[product_id]

    return get_cart()


def update_cart_quantity(product_id: int, quantity: int):
    if product_id not in cart:
        raise ValueError("Товар отсутствует в корзине")

    if quantity < 0:
        raise ValueError("Количество не может быть отрицательным")

    # 0 = удалить товар
    if quantity == 0:
        del cart[product_id]
        return get_cart()

    product = get_product_detail(product_id)

    available_quantity = product.get("quantity", 0)

    if quantity > available_quantity:
        raise ValueError(
            f"Недостаточно товара. Доступно: {available_quantity}"
        )

    cart[product_id]["quantity"] = quantity

    return get_cart()

def remove_from_cart(product_id: int):
    if product_id not in cart:
        raise ValueError("Товар отсутствует в корзине")

    del cart[product_id]

    return get_cart()


def clear_cart():
    cart.clear()

    return get_cart()