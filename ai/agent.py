from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from prompts import SYSTEM_PROMPT


load_dotenv(Path(__file__).parent / ".env")

client = OpenAI()
history = []

print("AI-консультант ekt.kz")
print("Для выхода напиши: выход\n")

while True:
    message = input("Покупатель: ").strip()

    if message.lower() in ("выход", "exit"):
        break

    if not message:
        continue

    try:
        response = client.responses.create(
            model="gpt-5-mini",
            instructions=SYSTEM_PROMPT,
            input=history + [
                {"role": "user", "content": message}
            ],
        )

        answer = response.output_text
        print(f"\nAI-консультант: {answer}\n")

        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": answer})

    except Exception as error:
        print(f"\nОшибка: {error}\n")