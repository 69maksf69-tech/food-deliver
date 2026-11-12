# Food Delivery Microservices (ЛР №4, Вариант 9)

Микросервисное приложение агрегатора доставки еды.

## Компоненты
- API Gateway (Node.js/Express)
- Order Service (.NET Core + PostgreSQL)
- Partner Service (Java Spring Boot + MongoDB)
- Notification Service (Node.js + PostgreSQL + Redis + WebSocket)
- RabbitMQ (брокер сообщений)

## Быстрый запуск
```bash
cp .env.example .env
docker compose up --build -d