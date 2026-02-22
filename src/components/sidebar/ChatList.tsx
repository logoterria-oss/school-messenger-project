import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatItem } from './ChatItem';
import { FolderItem } from './FolderItem';
import type { Chat, UserRole, SimpleUser } from './types';

const SUPERVISOR_ID = 'admin';

const isTeacherChat = (chat: Chat, allUsers: SimpleUser[]) => {
  if (chat.type !== 'private' || !chat.participants) return false;
  return chat.participants.some(id => {
    const user = allUsers.find(u => u.id === id);
    return user?.role === 'teacher';
  });
};

const isNonLeadGroupForTeacher = (chat: Chat, userId?: string) => {
  if (chat.type !== 'group' || chat.id === 'teachers-group') return false;
  if (!chat.leadTeachers || chat.leadTeachers.length === 0) return false;
  return !chat.leadTeachers.includes(userId || '');
};

const isNonLeadGroupForAdmin = (chat: Chat, userId?: string) => {
  if (chat.type !== 'group' || chat.id === 'teachers-group') return false;
  if (userId === SUPERVISOR_ID) return false;
  if (!chat.leadAdmin) return false;
  return chat.leadAdmin !== userId;
};

type ChatListProps = {
  chats: Chat[];
  allUsers: SimpleUser[];
  userRole: UserRole;
  userId?: string;
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  getDisplayChat: (chat: Chat) => Chat;
  searchQuery?: string;
};

export const ChatList = ({ chats, allUsers, userRole, userId, selectedChat, onSelectChat, getDisplayChat, searchQuery = '' }: ChatListProps) => {
  const [teacherFolderOpen, setTeacherFolderOpen] = useState(false);
  const [nonLeadFolderOpen, setNonLeadFolderOpen] = useState(false);

  const query = searchQuery.toLowerCase().trim();

  const filtered = [...chats].filter((chat) => {
    if (chat.type === 'private' && chat.participants) {
      const otherUserId = chat.participants.find(id => id !== userId);
      if (otherUserId === userId || (otherUserId === 'admin' && userId === 'admin')) {
        return false;
      }
    }
    if (query) {
      const display = getDisplayChat(chat);
      return display.name.toLowerCase().includes(query);
    }
    return true;
  });

  const isAdmin = userRole === 'admin';
  const isTeacher = userRole === 'teacher';
  const isSupervisor = userId === SUPERVISOR_ID;

  const teacherChats = isAdmin ? filtered.filter(c => isTeacherChat(c, allUsers)) : [];
  const teacherUnread = teacherChats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const nonLeadChats = isTeacher
    ? filtered.filter(c => isNonLeadGroupForTeacher(c, userId))
    : (isAdmin && !isSupervisor)
      ? filtered.filter(c => isNonLeadGroupForAdmin(c, userId))
      : [];
  const nonLeadUnread = nonLeadChats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const otherChats = filtered.filter(c => {
    if (isAdmin && isTeacherChat(c, allUsers)) return false;
    if (isTeacher && isNonLeadGroupForTeacher(c, userId)) return false;
    if (isAdmin && !isSupervisor && isNonLeadGroupForAdmin(c, userId)) return false;
    return true;
  });

  const sorted = otherChats.sort((a, b) => {
    if (a.id === 'teachers-group') return -1;
    if (b.id === 'teachers-group') return 1;
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  if (isAdmin) {
    const teachersGroupIndex = sorted.findIndex(c => c.id === 'teachers-group');
    const beforeFolder = teachersGroupIndex >= 0 ? sorted.slice(0, teachersGroupIndex + 1) : sorted;
    const afterFolder = teachersGroupIndex >= 0 ? sorted.slice(teachersGroupIndex + 1) : [];

    return (
      <ScrollArea className="flex-1">
        {beforeFolder.map((chat) => {
          const displayChat = getDisplayChat(chat);
          return (
            <ChatItem
              key={chat.id}
              chat={displayChat}
              isSelected={selectedChat === chat.id}
              onClick={() => onSelectChat(chat.id)}
            />
          );
        })}

        {teacherChats.length > 0 && (
          <FolderItem
            name="ЛС с педагогами"
            icon="FolderOpen"
            chats={teacherChats}
            unread={teacherUnread}
            isOpen={teacherFolderOpen}
            onToggle={() => setTeacherFolderOpen(!teacherFolderOpen)}
            selectedChat={selectedChat}
            onSelectChat={onSelectChat}
            getDisplayChat={getDisplayChat}
          />
        )}

        {afterFolder.map((chat) => {
          const displayChat = getDisplayChat(chat);
          return (
            <ChatItem
              key={chat.id}
              chat={displayChat}
              isSelected={selectedChat === chat.id}
              onClick={() => onSelectChat(chat.id)}
            />
          );
        })}

        {nonLeadChats.length > 0 && (
          <FolderItem
            name="Чужие ученики"
            icon="FolderOpen"
            chats={nonLeadChats}
            unread={nonLeadUnread}
            isOpen={nonLeadFolderOpen}
            onToggle={() => setNonLeadFolderOpen(!nonLeadFolderOpen)}
            selectedChat={selectedChat}
            onSelectChat={onSelectChat}
            getDisplayChat={getDisplayChat}
          />
        )}
      </ScrollArea>
    );
  }

  if (isTeacher) {
    const adminChatIndex = sorted.findIndex(c => c.type === 'private' && c.participants?.includes('admin'));
    const insertIndex = adminChatIndex >= 0 ? adminChatIndex + 1 : sorted.length;
    const beforeNonLead = sorted.slice(0, insertIndex);
    const afterNonLead = sorted.slice(insertIndex);

    return (
      <ScrollArea className="flex-1">
        {beforeNonLead.map((chat) => {
          const displayChat = getDisplayChat(chat);
          return (
            <ChatItem
              key={chat.id}
              chat={displayChat}
              isSelected={selectedChat === chat.id}
              onClick={() => onSelectChat(chat.id)}
            />
          );
        })}

        {nonLeadChats.length > 0 && (
          <FolderItem
            name="Чужие ученики"
            icon="FolderOpen"
            chats={nonLeadChats}
            unread={nonLeadUnread}
            isOpen={nonLeadFolderOpen}
            onToggle={() => setNonLeadFolderOpen(!nonLeadFolderOpen)}
            selectedChat={selectedChat}
            onSelectChat={onSelectChat}
            getDisplayChat={getDisplayChat}
          />
        )}

        {afterNonLead.map((chat) => {
          const displayChat = getDisplayChat(chat);
          return (
            <ChatItem
              key={chat.id}
              chat={displayChat}
              isSelected={selectedChat === chat.id}
              onClick={() => onSelectChat(chat.id)}
            />
          );
        })}
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1">
      {sorted.map((chat) => {
        const displayChat = getDisplayChat(chat);
        return (
          <ChatItem
            key={chat.id}
            chat={displayChat}
            isSelected={selectedChat === chat.id}
            onClick={() => onSelectChat(chat.id)}
          />
        );
      })}
    </ScrollArea>
  );
};

export default ChatList;
