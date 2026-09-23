import json
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from ai.prompts import SYSTEM_PROMPT
from ai.tools import search_products


load_dotenv(Path(__file__).parent / ".env")

client = OpenAI(timeout=20.0, max_retries=0)

TOOLS = [
    {
        "type": "function",
        "name": "search_products",
        "description": (
            "Ищет товары по запросу покупателя. "
            "Возвращает товары реального каталога ekt.kz."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Поисковый запрос покупателя"
                }
            },
            "required": ["query"],
            "additionalProperties": False
        },
        "strict": True
    }
]


def ask_agent(message, history):
    # Добавляем сообщение покупателя в историю.
    history.append({
        "role": "user",
        "content": message
    })

    # Модель может запросить поиск товаров.
    response = client.responses.create(
        model="gpt-5-mini",
        instructions=SYSTEM_PROMPT,
        input=history,
        tools=TOOLS
    )

    # Сохраняем ответ модели, включая вызовы инструментов.
    history.extend(response.output)

    # Обрабатываем запросы модели к поиску товаров.
    for item in response.output:
        if item.type == "function_call" and item.name == "search_products":
            arguments = json.loads(item.arguments)
            query = arguments["query"]

            print(f"[Поиск товаров: {query}]")

            products = search_products(query)

            # Возвращаем результаты поиска модели.
            history.append({
                "type": "function_call_output",
                "call_id": item.call_id,
                "output": json.dumps(products, ensure_ascii=False)
            })

    # Если модель вызвала поиск, просим её сформировать
    # окончательный ответ с учётом результатов.
    if any(item.type == "function_call" for item in response.output):
        response = client.responses.create(
            model="gpt-5-mini",
            instructions=SYSTEM_PROMPT,
            input=history,
            tools=TOOLS,
            tool_choice="none"
        )

        history.extend(response.output)

    return response.output_text


def main():
    history = []

    print("AI-консультант ekt.kz")
    print("Режим: демонстрационный каталог")
    print("Для выхода напиши: выход\n")

    while True:
        message = input("Покупатель: ").strip()

        if message.lower() in ("выход", "exit"):
            break

        if not message:
            continue

        try:
            answer = ask_agent(message, history)
            print(f"\nAI-консультант: {answer}\n")

        except Exception as error:
            print(f"\nОшибка: {error}\n")


if __name__ == "__main__":
    main()
