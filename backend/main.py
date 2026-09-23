from fastapi import FastAPI, HTTPException
import logging
from openai import APIConnectionError, APIStatusError, APITimeoutError, RateLimitError
from fastapi.middleware.cors import CORSMiddleware
from backend.products import search_products
import requests
from backend.cart import (
    get_cart,
    add_to_cart,
    update_cart_quantity,
    remove_from_cart,
    clear_cart
)
from pydantic import BaseModel
from ai.agent import ask_agent
from backend.ekt_api import get_products, get_product_detail

logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list = []

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

@app.delete("/api/cart")
def cart_clear():
    return clear_cart()


@app.post("/api/chat")
def chat(request: ChatRequest):
    try:
        history = request.history.copy()

        answer = ask_agent(
            message=request.message,
            history=history
        )

        return {
            "answer": answer,
            "history": history
        }

    except (APITimeoutError, requests.Timeout) as error:
        raise HTTPException(status_code=504, detail="Сервис AI или каталог не ответил вовремя. Повторите запрос.") from error
    except RateLimitError as error:
        raise HTTPException(status_code=503, detail="Сервис AI временно недоступен из-за лимита запросов или квоты. Попробуйте позже.") from error
    except (APIConnectionError, APIStatusError, requests.RequestException) as error:
        logger.warning("Chat dependency failed: %s", type(error).__name__)
        raise HTTPException(status_code=502, detail="Не удалось получить ответ от AI или каталога. Попробуйте позже.") from error
    except Exception as error:
        logger.exception("Unexpected chat failure")
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка чата. Повторите запрос; если ошибка сохраняется, обратитесь к администратору."
        )
