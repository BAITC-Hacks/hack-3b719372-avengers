import os
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

BASE_URL = os.getenv("EKT_API_URL")
USERNAME = os.getenv("EKT_API_USERNAME")
PASSWORD = os.getenv("EKT_API_PASSWORD")


def get_products(page: int = 1):
    response = requests.get(
        f"{BASE_URL}/products",
        params={"page": page},
        auth=(USERNAME, PASSWORD),
        timeout=(3, 8),
    )

    response.raise_for_status()

    return response.json()


def get_product_detail(product_id: int):
    response = requests.get(
        f"{BASE_URL}/products/detail",
        params={"id": product_id},
        auth=(USERNAME, PASSWORD),
        timeout=(3, 8),
    )

    response.raise_for_status()

    return response.json()
