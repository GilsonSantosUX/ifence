// Servidor WebSocket simples para testes
const WebSocket = require('ws');

// Criar servidor WebSocket na porta 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log('Servidor WebSocket iniciado na porta 8080');

// Armazenar conexões ativas
const clients = new Set();

// Manipular novas conexões
wss.on('connection', (ws) => {
  console.log('Nova conexão estabelecida');
  clients.add(ws);
  
  // Enviar mensagem de boas-vindas
  ws.send(JSON.stringify({
    type: 'connect_success',
    payload: { message: 'Conexão estabelecida com sucesso!' }
  }));
  
  // Manipular mensagens recebidas
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Mensagem recebida:', data);
      
      // Transmitir a mensagem para todos os clientes conectados
      broadcastMessage(data);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });
  
  // Manipular desconexão
  ws.on('close', () => {
    console.log('Conexão fechada');
    clients.delete(ws);
  });
});

// Função para transmitir mensagem para todos os clientes
function broadcastMessage(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}