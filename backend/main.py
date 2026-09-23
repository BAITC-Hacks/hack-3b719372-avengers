from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from products import search_products
import requests
from cart import (
    get_cart,
    add_to_cart,
    update_cart_quantity,
    remove_from_cart,
    clear_cart
)


from ekt_api import get_products, get_product_detail


app = FastAPI(
    title="EKT AI Assistant API",
    version="0.1.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "EKT AI backend is running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/products")
def products(page: int = 1):
    try:
        return get_products(page)

    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"EKT API error: {str(error)}"
        )


@app.get("/api/products/{product_id}")
def product_detail(product_id: int):
    try:
        return get_product_detail(product_id)

    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"EKT API error: {str(error)}"
        )


@app.get("/api/search")
def search(q: str):
    try:
        results = search_products(q)

        return {
            "query": q,
            "count": len(results),
            "products": results
        }

    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"EKT API error: {str(error)}"
        )



@app.get("/api/cart")
def cart_get():
    return get_cart()


@app.post("/api/cart/add")
def cart_add(product_id: int, quantity: int = 1):
    try:
        return add_to_cart(product_id, quantity)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"EKT API error: {str(error)}"
        )


@app.delete("/api/cart/{product_id}")
def cart_remove(product_id: int):
    try:
        return remove_from_cart(product_id)

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )


@app.patch("/api/cart/{product_id}")
def cart_update(product_id: int, quantity: int):
    try:
        return update_cart_quantity(
            product_id=product_id,
            quantity=quantity
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail=f"EKT API error: {str(error)}"
        )


@app.delete("/api/cart/{product_id}")
def cart_remove(product_id: int):
    try:
        return remove_from_cart(product_id)

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

@app.delete("/api/cart")
def cart_clear():
    return clear_cart()