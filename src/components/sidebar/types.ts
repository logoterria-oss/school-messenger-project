export type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

export type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  type: 'group' | 'private';
  leadTeachers?: string[];
  isPinned?: boolean;
  avatar?: string;
  participants?: string[];
};

export type Topic = {
  id: string;
  name: string;
  icon: string;
  unread: number;
};

export type SimpleUser = {
  id: string;
  name: string;
  role: string;
  avatar?: string;
};
