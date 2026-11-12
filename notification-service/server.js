const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const amqp = require('amqplib');
const { Client } = require('pg');
const redis = require('redis');
const { randomUUID } = require('crypto');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const pg = new Client({ connectionString: process.env.DATABASE_URL });
const redisClient = redis.createClient({ url: process.env.REDIS_URL });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket подключён' }));
});

function broadcast(payload) {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

async function connectWithRetry(fn, name, attempts = 30) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      console.log(`${name}: попытка ${i}/${attempts}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error(`${name}: не удалось подключиться`);
}

async function handleMessage(ch, msg, eventType, status) {
  if (!msg) return;

  try {
    const event = JSON.parse(msg.content.toString());
    const orderId = event.orderId;
    const customerId = event.customerId || null;

    await pg.query(
      'INSERT INTO notifications(id, order_id, customer_id, message, delivery_status) ' +
      'VALUES($1,$2,$3,$4,$5)',
      [randomUUID(), orderId, customerId, eventType, status]
    );

    await redisClient.set(`order:${orderId}:status`, status);
    broadcast({ orderId, eventType, status });

    ch.ack(msg);
  } catch (e) {
    console.error('Ошибка обработки сообщения:', e);
    ch.nack(msg, false, false);
  }
}

async function main() {
  await connectWithRetry(() => pg.connect(), 'PostgreSQL');
  await connectWithRetry(() => redisClient.connect(), 'Redis');

  const conn = await connectWithRetry(
    () => amqp.connect(process.env.RABBITMQ_URL),
    'RabbitMQ'
  );
  const ch = await conn.createChannel();

  await ch.assertExchange('orders', 'topic', { durable: true });
  await ch.assertExchange('partners', 'topic', { durable: true });

  await ch.assertQueue('notification.order.created.queue', { durable: true });
  await ch.bindQueue('notification.order.created.queue', 'orders', 'order.created');

  await ch.assertQueue('notification.partner.assigned.queue', { durable: true });
  await ch.bindQueue('notification.partner.assigned.queue', 'partners', 'partner.assigned');

  ch.consume('notification.order.created.queue', (msg) =>
    handleMessage(ch, msg, 'OrderCreated', 'Ожидает назначения партнёра')
  );

  ch.consume('notification.partner.assigned.queue', (msg) =>
    handleMessage(ch, msg, 'PartnerAssigned', 'Партнёр назначен')
  );

  console.log('Notification Service запущен');
}

app.get('/notifications/:orderId', async (req, res) => {
  const status = await redisClient.get(`order:${req.params.orderId}:status`);
  res.json({ orderId: req.params.orderId, status });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

server.listen(3004, () => console.log('Notification Service: http://localhost:3004'));
main().catch((e) => {
  console.error(e);
  process.exit(1);
});