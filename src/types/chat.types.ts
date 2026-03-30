export type UserRole = 'admin' | 'teacher' | 'parent' | 'student' | 'tech_specialist';

export const ADMIN_ROLES: ReadonlySet<string> = new Set(['admin', 'tech_specialist']);
export const isAdminRole = (role?: string | null): boolean => !!role && ADMIN_ROLES.has(role);

export type User = {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  email?: string;
  password: string;
  avatar?: string;
  availableSlots?: string[];
  educationDocs?: string[];
  lessonForms?: 'individual' | 'group' | 'both';
};

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
  senderRole?: UserRole;
  senderRoleLabel?: string;
  senderAvatar?: string;
  timestamp: string;
  date?: string;
  isOwn: boolean;
  attachments?: AttachedFile[];
  reactions?: { emoji: string; count: number; users: string[] }[];
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  replyTo?: ReplyInfo;
  forwardedFrom?: ForwardInfo;
  scheduledAt?: string;
};

export type Conclusion = {
  id: number;
  conclusionLink?: string;
  conclusionPdf?: string;
  createdDate: string;
  diagnosisDate?: string;
};

export type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  unreadMentions?: number;
  hasMutedUnread?: boolean;
  type: 'group' | 'private';
  isPinned?: boolean;
  isArchived?: boolean;
  participants?: string[];
  leadTeachers?: string[];
  leadAdmin?: string;
  schedule?: string;
  conclusionLink?: string;
  conclusionPdf?: string;
  conclusions?: Conclusion[];
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