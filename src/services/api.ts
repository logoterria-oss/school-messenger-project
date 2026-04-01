// API сервис для работы с backend
const API_BASE = 'https://functions.poehali.dev';

export const API_URLS = {
  auth: `${API_BASE}/5a8de8b1-0d64-4384-8dc1-a94e8e68c2e3`,
  users: `${API_BASE}/093c9bd4-bdb3-41c4-865c-e707f472dc3c`,
  chats: `${API_BASE}/7321ff36-8923-4d5f-ba35-61643bc89545`,
  messages: `${API_BASE}/7e041335-402a-4ff5-9199-6d3754f1d2d5`,
  push: `${API_BASE}/6f14d956-9bae-4666-99e7-38a5840a017b`,
  typing: `${API_BASE}/8855f8c1-8ad6-41e0-9752-585db470dcfe`,
};

export type User = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'admin' | 'teacher' | 'parent' | 'student';
  avatar?: string;
  availableSlots?: string[];
  educationDocs?: string[];
  lessonForms?: 'individual' | 'group' | 'both';
};

export type Chat = {
  id: string;
  name: string;
  type: 'group' | 'private';
  avatar?: string;
  schedule?: string;
  conclusion_link?: string;
  is_pinned?: boolean;
  last_message?: string;
  timestamp?: string;
  unread?: number;
  participants?: string[];
};

export type Message = {
  id: string;
  text?: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  attachments?: Array<{
    type: 'image' | 'file';
    fileUrl?: string;
    fileName?: string;
    fileSize?: string;
  }>;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
  reply_to_id?: string;
  reply_to_sender?: string;
  reply_to_text?: string;
  forwarded_from_id?: string;
  forwarded_from_sender?: string;
  forwarded_from_text?: string;
  forwarded_from_date?: string;
  forwarded_from_chat_name?: string;
};

// Аутентификация
export async function login(phone: string, password: string, role: string): Promise<User> {
  const response = await fetch(API_URLS.auth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password, role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  return data.user;
}

// Пользователи
export async function getUsers(): Promise<User[]> {
  const response = await fetch(API_URLS.users);
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  const data = await response.json();
  return data.users;
}

export async function getUser(userId: string): Promise<User> {
  const response = await fetch(`${API_URLS.users}?userId=${userId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }

  const data = await response.json();
  return data.user;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  const response = await fetch(API_URLS.users, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, ...updates }),
  });

  if (!response.ok) {
    throw new Error('Failed to update user');
  }

  const data = await response.json();
  return data.user;
}

export async function createUser(user: User & { password: string }): Promise<User> {
  const response = await fetch(API_URLS.users, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Не удалось создать пользователя');
  }

  return data.user;
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_URLS.users}?userId=${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete user');
  }
}

// Чаты
export async function getChats(userId: string): Promise<{ chats: Chat[]; topics: Record<string, unknown[]> }> {
  const response = await fetch(API_URLS.chats, {
    headers: { 'X-User-Id': userId },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch chats');
  }

  return await response.json();
}

export async function createChat(chat: {
  id: string;
  name: string;
  type: 'group' | 'private';
  participants: string[];
  avatar?: string;
  schedule?: string;
  conclusionLink?: string;
  conclusionPdfBase64?: string;
  isPinned?: boolean;
  topics?: Array<{ id: string; name: string; icon: string }>;
  leadTeachers?: string[];
  leadAdmin?: string;
}): Promise<string> {
  const response = await fetch(API_URLS.chats, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chat),
  });

  if (!response.ok) {
    throw new Error('Failed to create chat');
  }

  const data = await response.json();
  return data.chatId;
}

export async function updateChat(chatId: string, updates: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(API_URLS.chats, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: chatId, ...updates }),
  });

  if (!response.ok) {
    throw new Error('Failed to update chat');
  }

  return await response.json();
}

export async function addConclusion(chatId: string, data: { conclusionLink?: string; conclusionPdfBase64?: string; diagnosisDate?: string }): Promise<{ id: number; conclusionLink?: string; conclusionPdf?: string; createdDate: string; diagnosisDate?: string }> {
  const response = await fetch(API_URLS.chats, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add_conclusion', chatId, ...data }),
  });
  if (!response.ok) throw new Error('Failed to add conclusion');
  const result = await response.json();
  return result.conclusion;
}

export async function updateConclusion(chatId: string, conclusionId: number, data: { conclusionLink?: string; conclusionPdfBase64?: string; diagnosisDate?: string }): Promise<{ id: number; conclusionLink?: string; conclusionPdf?: string; createdDate: string; diagnosisDate?: string }> {
  const response = await fetch(API_URLS.chats, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update_conclusion', chatId, conclusionId, ...data }),
  });
  if (!response.ok) throw new Error('Failed to update conclusion');
  const result = await response.json();
  return result.conclusion;
}

export async function deleteConclusion(chatId: string, conclusionId: number): Promise<void> {
  const response = await fetch(API_URLS.chats, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete_conclusion', chatId, conclusionId }),
  });
  if (!response.ok) throw new Error('Failed to delete conclusion');
}

export async function deleteChat(chatId: string): Promise<void> {
  const response = await fetch(`${API_URLS.chats}?chatId=${chatId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete chat');
  }
}

// Сообщения
export async function getMessages(chatId: string, topicId?: string): Promise<Message[]> {
  const url = new URL(API_URLS.messages);
  url.searchParams.append('chatId', chatId);
  if (topicId) {
    url.searchParams.append('topicId', topicId);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  const data = await response.json();
  return data.messages;
}

export async function toggleReaction(userId: string, messageId: string, emoji: string): Promise<void> {
  await fetch(API_URLS.messages, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
    body: JSON.stringify({ messageId, emoji }),
  });
}

export async function markAsRead(userId: string, chatId: string, topicId?: string): Promise<void> {
  const body: Record<string, string> = { chatId };
  if (topicId) body.topicId = topicId;

  await fetch(API_URLS.messages, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
    body: JSON.stringify(body),
  });
}

export async function deleteMessage(userId: string, messageId: string): Promise<void> {
  await fetch(`${API_URLS.messages}?messageId=${encodeURIComponent(messageId)}`, {
    method: 'DELETE',
    headers: { 'X-User-Id': userId },
  });
}

export async function sendMessage(message: {
  id: string;
  chatId: string;
  topicId?: string;
  senderId: string;
  senderName: string;
  text?: string;
  createdAt?: string;
  attachments?: Array<{
    type: 'image' | 'file';
    fileUrl?: string;
    fileName?: string;
    fileSize?: string;
  }>;
  replyToId?: string;
  replyToSender?: string;
  replyToText?: string;
  forwardedFromId?: string;
  forwardedFromSender?: string;
  forwardedFromText?: string;
  forwardedFromDate?: string;
  forwardedFromChatName?: string;
}, signal?: AbortSignal): Promise<Message> {
  const response = await fetch(API_URLS.messages, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  const data = await response.json();
  return data.message;
}

// Typing indicator
export async function sendTyping(userId: string, chatId: string, topicId: string | undefined, userName: string): Promise<void> {
  try {
    await fetch(API_URLS.typing, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      body: JSON.stringify({ chatId, topicId: topicId || '', userId, userName }),
    });
  } catch {
    // игнорируем ошибки typing — не критично
  }
}

export async function stopTyping(userId: string, chatId: string, topicId: string | undefined): Promise<void> {
  try {
    await fetch(API_URLS.typing, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      body: JSON.stringify({ chatId, topicId: topicId || '', userId }),
    });
  } catch {
    // игнорируем ошибки typing — не критично
  }
}

export async function getTypingUsers(userId: string, chatId: string, topicId: string | undefined): Promise<string[]> {
  try {
    const url = new URL(API_URLS.typing);
    url.searchParams.set('chatId', chatId);
    if (topicId) url.searchParams.set('topicId', topicId);
    const response = await fetch(url.toString(), {
      headers: { 'X-User-Id': userId },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.typingUsers || [];
  } catch {
    return [];
  }
}