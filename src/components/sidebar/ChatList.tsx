import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatItem } from './ChatItem';
import { FolderItem } from './FolderItem';
import type { Chat, UserRole, SimpleUser } from './types';

const SUPERVISOR_ID = 'admin';

const isTeacherChat = (chat: Chat, allUsers: SimpleUser[], userId?: string) => {
  if (chat.type !== 'private' || !chat.participants) return false;
  return chat.participants.some(id => {
    if (id === userId) return false;
    const user = allUsers.find(u => u.id === id);
    return user?.role === 'teacher';
  });
};

const isAdminChat = (chat: Chat, allUsers: SimpleUser[], userId?: string) => {
  if (chat.type !== 'private' || !chat.participants) return false;
  return chat.participants.some(id => {
    if (id === userId) return false;
    if (id === SUPERVISOR_ID) return false;
    const user = allUsers.find(u => u.id === id);
    return user?.role === 'admin';
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
  const [staffFolderOpen, setStaffFolderOpen] = useState(false);
  const [nonLeadFolderOpen, setNonLeadFolderOpen] = useState(false);

  const query = searchQuery.toLowerCase().trim();

  const filtered = [...chats].filter((chat) => {
    if (chat.type === 'private' && chat.participants) {
      const otherUserIds = chat.participants.filter(id => id !== userId);
      if (otherUserIds.length === 0) return false;
      const uniqueIds = new Set(chat.participants);
      if (uniqueIds.size === 1 && uniqueIds.has(userId || '')) return false;
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

  const isSupervisorChat = (chat: Chat) => {
    if (chat.type !== 'private' || !chat.participants) return false;
    return chat.participants.includes(SUPERVISOR_ID) && userId !== SUPERVISOR_ID;
  };

  const isStaffChat = (chat: Chat) => {
    if (chat.type !== 'private' || !chat.participants) return false;
    return chat.participants.some(id => {
      if (id === userId) return false;
      const user = allUsers.find(u => u.id === id);
      return user?.role === 'teacher' || user?.role === 'admin';
    });
  };

  const staffChatsUnsorted = (isAdmin || isTeacher) ? filtered.filter(c => isStaffChat(c)) : [];
  const staffChats = staffChatsUnsorted.sort((a, b) => {
    const getOtherUser = (chat: Chat) => {
      const otherId = chat.participants?.find(id => id !== userId);
      return otherId ? allUsers.find(u => u.id === otherId) : undefined;
    };
    const userA = getOtherUser(a);
    const userB = getOtherUser(b);
    const rankA = userA?.id === SUPERVISOR_ID ? 0 : userA?.role === 'admin' ? 1 : 2;
    const rankB = userB?.id === SUPERVISOR_ID ? 0 : userB?.role === 'admin' ? 1 : 2;
    return rankA - rankB;
  });
  const staffUnread = staffChats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const nonLeadChats = isTeacher
    ? filtered.filter(c => isNonLeadGroupForTeacher(c, userId))
    : (isAdmin && !isSupervisor)
      ? filtered.filter(c => isNonLeadGroupForAdmin(c, userId))
      : [];
  const nonLeadUnread = nonLeadChats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const otherChats = filtered.filter(c => {
    if ((isAdmin || isTeacher) && isStaffChat(c)) return false;
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

        {staffChats.length > 0 && (
          <FolderItem
            name="ЛС с педагогами и админами"
            icon="FolderOpen"
            chats={staffChats}
            unread={staffUnread}
            isOpen={staffFolderOpen}
            onToggle={() => setStaffFolderOpen(!staffFolderOpen)}
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
            name="Ученики на замену"
            icon="FolderOpen"
            chats={nonLeadChats}
            unread={nonLeadUnread}
            isOpen={nonLeadFolderOpen}
            onToggle={() => setNonLeadFolderOpen(!nonLeadFolderOpen)}
            selectedChat={selectedChat}
            onSelectChat={onSelectChat}
            getDisplayChat={getDisplayChat}
            onlyMentionUnread
          />
        )}
      </ScrollArea>
    );
  }

  if (isTeacher) {
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

        {staffChats.length > 0 && (
          <FolderItem
            name="ЛС с педагогами и админами"
            icon="FolderOpen"
            chats={staffChats}
            unread={staffUnread}
            isOpen={staffFolderOpen}
            onToggle={() => setStaffFolderOpen(!staffFolderOpen)}
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
            name="Ученики на замену"
            icon="FolderOpen"
            chats={nonLeadChats}
            unread={nonLeadUnread}
            isOpen={nonLeadFolderOpen}
            onToggle={() => setNonLeadFolderOpen(!nonLeadFolderOpen)}
            selectedChat={selectedChat}
            onSelectChat={onSelectChat}
            getDisplayChat={getDisplayChat}
            onlyMentionUnread
          />
        )}
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