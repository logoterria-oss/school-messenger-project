# Интеграция индикатора "печатает..." с сервером

## Текущее состояние
Индикатор "печатает..." готов к интеграции с backend. Сейчас это чистая структура без симуляций.

## Как это должно работать

### 1. Клиентская часть (уже реализовано)
- `typingUsers: string[]` - массив имен пользователей, которые печатают
- Индикатор отображается только в групповых чатах
- Показывает имена через запятую: "Мария Вольт, Иван Петров печатают..."
- Правильное склонение: "печатает" / "печатают"
- Не показывается самому печатающему пользователю

### 2. Что нужно добавить на backend

#### WebSocket события:

**Отправка от клиента:**
```javascript
// При вводе текста
socket.emit('user_typing', {
  chatId: selectedChat,
  topicId: selectedTopic,
  userName: userName
});

// При остановке ввода (через 2-3 секунды)
socket.emit('user_stopped_typing', {
  chatId: selectedChat,
  topicId: selectedTopic,
  userName: userName
});
```

**Получение на клиенте:**
```javascript
// Когда другой пользователь начал печатать
socket.on('typing_update', (data) => {
  if (data.chatId === selectedChat && data.userName !== userName) {
    setTypingUsers(prev => {
      if (!prev.includes(data.userName)) {
        return [...prev, data.userName];
      }
      return prev;
    });
  }
});

// Когда другой пользователь перестал печатать
socket.on('stopped_typing_update', (data) => {
  if (data.chatId === selectedChat) {
    setTypingUsers(prev => prev.filter(name => name !== data.userName));
  }
});
```

### 3. Логика на сервере

```python
# Хранение состояния печатающих пользователей
typing_states = {}  # { chat_id: { user_name: timestamp } }

@socketio.on('user_typing')
def handle_typing(data):
    chat_id = data['chatId']
    user_name = data['userName']
    
    # Сохранить состояние
    if chat_id not in typing_states:
        typing_states[chat_id] = {}
    typing_states[chat_id][user_name] = time.time()
    
    # Отправить всем участникам чата кроме отправителя
    emit('typing_update', {
        'chatId': chat_id,
        'userName': user_name
    }, room=chat_id, skip_sid=request.sid)
    
    # Автоматическое удаление через 3 секунды
    def clear_typing():
        if chat_id in typing_states and user_name in typing_states[chat_id]:
            del typing_states[chat_id][user_name]
            emit('stopped_typing_update', {
                'chatId': chat_id,
                'userName': user_name
            }, room=chat_id)
    
    Timer(3.0, clear_typing).start()

@socketio.on('user_stopped_typing')
def handle_stopped_typing(data):
    chat_id = data['chatId']
    user_name = data['userName']
    
    # Удалить состояние
    if chat_id in typing_states and user_name in typing_states[chat_id]:
        del typing_states[chat_id][user_name]
    
    # Уведомить всех участников
    emit('stopped_typing_update', {
        'chatId': chat_id,
        'userName': user_name
    }, room=chat_id, skip_sid=request.sid)
```

### 4. Интеграция в `useChatLogic.ts`

Найти функцию `handleTyping` и добавить:

```typescript
const handleTyping = (text: string) => {
  setMessageText(text);
  
  const chat = chats.find(c => c.id === selectedChat);
  if (chat && chat.type === 'group') {
    // Отправить событие на сервер
    socket.emit('user_typing', {
      chatId: selectedChat,
      topicId: selectedTopic,
      userName: userName
    });
    
    // Установить таймер для отправки события остановки печати
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    const timeout = setTimeout(() => {
      socket.emit('user_stopped_typing', {
        chatId: selectedChat,
        topicId: selectedTopic,
        userName: userName
      });
    }, 2000);
    
    setTypingTimeout(timeout);
  }
};
```

### 5. Подписка на события (в useEffect)

```typescript
useEffect(() => {
  if (!socket) return;
  
  socket.on('typing_update', (data) => {
    if (data.chatId === selectedChat && data.userName !== userName) {
      setTypingUsers(prev => {
        if (!prev.includes(data.userName)) {
          return [...prev, data.userName];
        }
        return prev;
      });
    }
  });
  
  socket.on('stopped_typing_update', (data) => {
    if (data.chatId === selectedChat) {
      setTypingUsers(prev => prev.filter(name => name !== data.userName));
    }
  });
  
  return () => {
    socket.off('typing_update');
    socket.off('stopped_typing_update');
  };
}, [socket, selectedChat, userName]);
```

## Проверка работы

1. Откройте два браузера с разными пользователями
2. Войдите в один групповой чат
3. Начните печатать в одном браузере
4. В другом браузере должно появиться: "Имя Фамилия печатает..."
5. Остановите печать - индикатор должен исчезнуть через 2-3 секунды
