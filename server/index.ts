import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import prisma from './prisma';
import { geofenceRouter } from './routes/geofences';
import { createGenericRouter } from './routes/createGenericRouter';

const app = express();
const port = 3000;
const wsPort = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/geofences', geofenceRouter);
// Use generic router for simple entities
app.use('/api/companies', createGenericRouter(prisma.company));
app.use('/api/branches', createGenericRouter(prisma.branch));
app.use('/api/departments', createGenericRouter(prisma.department));
app.use('/api/people', createGenericRouter(prisma.person));
// Perimeters are sub-resources but we also expose them directly for ID lookups if needed
app.use('/api/perimeters', createGenericRouter(prisma.perimeter)); 
app.use('/api/rules', createGenericRouter(prisma.rule));
app.use('/api/geofence_pins', createGenericRouter(prisma.geofencePin));
app.use('/api/settings', createGenericRouter(prisma.appSettings, { idType: 'string' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Seed default settings
async function seedSettings() {
  try {
    const token = await prisma.appSettings.findUnique({ where: { id: 'mapbox_token' } });
    if (!token) {
      console.log('Seeding mapbox_token...');
      await prisma.appSettings.create({
        data: { id: 'mapbox_token', value: { value: '' } } // Assuming value is JSON
      });
    }

    const style = await prisma.appSettings.findUnique({ where: { id: 'mapbox_style' } });
    if (!style) {
      console.log('Seeding mapbox_style...');
      await prisma.appSettings.create({
        data: { id: 'mapbox_style', value: { value: 'streets-v12' } }
      });
    }
  } catch (error) {
    console.error('Failed to seed settings:', error);
  }
}

// Create HTTP server for WebSocket (or separate)
const server = createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ port: wsPort });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  console.log('Nova conexão WebSocket estabelecida');
  clients.add(ws);

  ws.send(JSON.stringify({
    type: 'connect_success',
    payload: { message: 'Conexão estabelecida com sucesso!' }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Mensagem recebida:', data);
      broadcastMessage(data);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcastMessage(data: any) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start server and seed
app.listen(port, async () => {
  console.log(`Servidor API rodando em http://localhost:${port}`);
  await seedSettings();
});

console.log(`Servidor WebSocket rodando na porta ${wsPort}`);
