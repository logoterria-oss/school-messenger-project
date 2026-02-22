// API сервис для работы с backend
const API_BASE = 'https://functions.poehali.dev';

export const API_URLS = {
  auth: `${API_BASE}/5a8de8b1-0d64-4384-8dc1-a94e8e68c2e3`,
  users: `${API_BASE}/093c9bd4-bdb3-41c4-865c-e707f472dc3c`,
  chats: `${API_BASE}/7321ff36-8923-4d5f-ba35-61643bc89545`,
  messages: `${API_BASE}/7e041335-402a-4ff5-9199-6d3754f1d2d5`,
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
};

// Аутентификация
export async function login(phone: string, password: string): Promise<User> {
  const response = await fetch(API_URLS.auth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
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

  if (!response.ok) {
    throw new Error('Failed to create user');
  }

  const data = await response.json();
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

export async function sendMessage(message: {
  id: string;
  chatId: string;
  topicId?: string;
  senderId: string;
  senderName: string;
  text?: string;
  attachments?: Array<{
    type: 'image' | 'file';
    fileUrl?: string;
    fileName?: string;
    fileSize?: string;
  }>;
}): Promise<Message> {
  const response = await fetch(API_URLS.messages, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  const data = await response.json();
  return data.message;
}