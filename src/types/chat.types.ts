export type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

export type TeacherAccount = {
  name: string;
  phone: string;
  email: string;
  password: string;
};

export type AttachedFile = {
  type: 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
};

export type Message = {
  id: string;
  text?: string;
  sender: string;
  timestamp: string;
  isOwn: boolean;
  attachments?: AttachedFile[];
  reactions?: { emoji: string; count: number; users: string[] }[];
  status?: 'sending' | 'sent' | 'delivered' | 'read';
};

export type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  type: 'group' | 'private';
  isPinned?: boolean;
  participants?: string[];
  schedule?: string;
  conclusionLink?: string;
  avatar?: string;
  lastTime?: string;
};

export type Topic = {
  id: string;
  name: string;
  icon: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
};

export type GroupTopics = {
  [groupId: string]: Topic[];
};