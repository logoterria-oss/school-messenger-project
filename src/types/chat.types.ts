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

export type ReplyInfo = {
  id: string;
  sender: string;
  text: string;
};

export type ForwardInfo = {
  id: string;
  sender: string;
  text: string;
  date: string;
  chatName: string;
};

export type Message = {
  id: string;
  text?: string;
  sender: string;
  senderId?: string;
  senderAvatar?: string;
  timestamp: string;
  isOwn: boolean;
  attachments?: AttachedFile[];
  reactions?: { emoji: string; count: number; users: string[] }[];
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: ReplyInfo;
  forwardedFrom?: ForwardInfo;
};

export type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  unreadMentions?: number;
  type: 'group' | 'private';
  isPinned?: boolean;
  isArchived?: boolean;
  participants?: string[];
  leadTeachers?: string[];
  leadAdmin?: string;
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
  unreadMentions?: number;
};

export type GroupTopics = {
  [groupId: string]: Topic[];
};