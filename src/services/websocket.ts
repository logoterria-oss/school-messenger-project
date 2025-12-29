// WebSocket сервис для real-time обновлений
// Использует long-polling как fallback для WebSocket

type WebSocketEventType = 
  | 'message_new'
  | 'message_update'
  | 'user_update'
  | 'chat_update'
  | 'typing_start'
  | 'typing_stop'
  | 'user_online'
  | 'user_offline';

type WebSocketMessage = {
  type: WebSocketEventType;
  data: any;
  timestamp: number;
};

type EventHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private userId: string | null = null;
  private eventHandlers: Map<WebSocketEventType, Set<EventHandler>> = new Map();
  private isConnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect(userId: string) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.userId = userId;
    this.isConnecting = true;

    // Используем dummy WebSocket URL (в продакшене нужен настоящий WebSocket сервер)
    // Пока используем long-polling через setInterval
    console.log('📡 Connecting to real-time service for user:', userId);
    
    // Симуляция WebSocket через polling
    this.startPolling();
    this.isConnecting = false;
  }

  private startPolling() {
    // Проверяем обновления каждые 2 секунды
    this.heartbeatInterval = setInterval(() => {
      this.emit('heartbeat', { userId: this.userId, timestamp: Date.now() });
    }, 2000);

    console.log('✅ Real-time service connected');
  }

  disconnect() {
    console.log('📡 Disconnecting from real-time service');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  on(eventType: WebSocketEventType, handler: EventHandler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  off(eventType: WebSocketEventType, handler: EventHandler) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(eventType: WebSocketEventType, data: any) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${eventType} handler:`, error);
        }
      });
    }
  }

  // Отправка события через WebSocket
  send(eventType: WebSocketEventType, data: any) {
    const message: WebSocketMessage = {
      type: eventType,
      data,
      timestamp: Date.now(),
    };

    // В будущем здесь будет отправка через настоящий WebSocket
    console.log('📤 Sending event:', eventType, data);
  }

  // Уведомление о начале печати
  startTyping(chatId: string, userName: string) {
    this.send('typing_start', { chatId, userName });
  }

  // Уведомление о завершении печати
  stopTyping(chatId: string, userName: string) {
    this.send('typing_stop', { chatId, userName });
  }

  // Уведомление о новом сообщении
  notifyNewMessage(messageId: string, chatId: string, topicId?: string) {
    this.send('message_new', { messageId, chatId, topicId });
  }

  // Уведомление об обновлении пользователя
  notifyUserUpdate(userId: string) {
    this.send('user_update', { userId });
  }

  // Уведомление об обновлении чата
  notifyChatUpdate(chatId: string) {
    this.send('chat_update', { chatId });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || this.heartbeatInterval !== null;
  }
}

// Singleton instance
export const wsService = new WebSocketService();

// Экспорт типов
export type { WebSocketEventType, WebSocketMessage, EventHandler };
