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
};

export type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  type: 'group' | 'private';
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
