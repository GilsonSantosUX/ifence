// Serviço para gerenciar conexões WebSocket

// Interface para mensagens WebSocket
export interface WebSocketMessage {
  type: string;
  payload: any;
}

// Interface para eventos de cerca
export interface FenceEvent {
  fenceId: number;
  eventType: 'enter' | 'exit' | 'dwell';
  timestamp: string;
  coordinates: [number, number];
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectInterval: number = 5000; // 5 segundos
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private eventListeners: Map<string, Function[]> = new Map();
  
  // Inicializar conexão WebSocket
  connect(url: string): void {
    if (this.socket) {
      this.socket.close();
    }
    
    try {
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => {
        console.log('Conexão WebSocket estabelecida');
        this.reconnectAttempts = 0;
        this.dispatchEvent('connect', null);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.dispatchEvent(message.type, message.payload);
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      };
      
      this.socket.onclose = () => {
        console.log('Conexão WebSocket fechada');
        this.dispatchEvent('disconnect', null);
        this.attemptReconnect();
      };
      
      this.socket.onerror = (error) => {
        // Silencia erro se for apenas falha de conexão local (comum em dev sem backend)
        console.warn('Aviso de conexão WebSocket (backend pode estar offline):', error);
        this.dispatchEvent('error', error);
      };
    } catch (error) {
      console.warn('Falha ao iniciar conexão WebSocket (modo offline ativo):', error);
      this.attemptReconnect();
    }
  }
  
  // Tentar reconectar automaticamente
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // console.log(`Tentativa de reconexão ${this.reconnectAttempts} de ${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        if (this.socket && this.socket.url) {
          this.connect(this.socket.url);
        }
      }, this.reconnectInterval);
    } else {
      console.warn('WebSocket: Backend offline. Operando em modo local.');
      this.dispatchEvent('reconnect_failed', null);
    }
  }
  
  // Enviar mensagem para o servidor (ou despacho local se offline)
  sendMessage(type: string, payload: any): boolean {
    // Tenta enviar via rede se estiver conectado
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type, payload };
      this.socket.send(JSON.stringify(message));
      return true;
    } 
    
    // Fallback: Despacho local para simular tempo real na própria sessão
    // Isso permite que o app funcione sem backend (offline-first/serverless)
    console.warn(`WebSocket desconectado. Despachando evento '${type}' localmente.`);
    this.dispatchEvent(type, payload);
    return false;
  }
  
  // Fechar conexão
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
  
  // Registrar listener para eventos
  on(eventType: string, callback: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)?.push(callback);
  }
  
  // Remover listener
  off(eventType: string, callback: Function): void {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType) || [];
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  // Disparar evento para todos os listeners registrados
  private dispatchEvent(eventType: string, data: any): void {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType) || [];
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro ao executar listener para ${eventType}:`, error);
        }
      });
    }
  }
}

// Exportar uma instância única do serviço
export const wsService = new WebSocketService();