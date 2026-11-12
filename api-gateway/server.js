const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Только для лабораторной проверки. В production отключить.
app.post('/auth/dev-token', (req, res) => {
  const token = jwt.sign({ sub: 'demo-user' }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

const authenticateToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется токен авторизации' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Недействительный токен' });
  }
};

app.use(authenticateToken);

app.use('/api/orders', createProxyMiddleware({
  target: 'http://order-service:5000',
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '/orders' }
}));

app.use('/api/partners', createProxyMiddleware({
  target: 'http://partner-service:8080',
  changeOrigin: true,
  pathRewrite: { '^/api/partners': '/partners' }
}));

app.use('/api/notifications', createProxyMiddleware({
  target: 'http://notification-service:3004',
  changeOrigin: true,
  pathRewrite: { '^/api/notifications': '/notifications' }
}));

app.listen(3000, () => console.log('API Gateway: http://localhost:3000'));