import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { whatsappRouter } from './server/api';
import { WhatsAppAutomationService } from './server/whatsappService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON & URL-encoded request body parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize WhatsApp Automation Cron Service
  WhatsAppAutomationService.getInstance();

  // API Routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // WhatsApp Poll & Dispatch microservice routes
  app.use('/api/whatsapp', whatsappRouter);

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MessMate Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
