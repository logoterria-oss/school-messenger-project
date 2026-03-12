import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatItem } from './ChatItem';
import { FolderItem } from './FolderItem';
import { getChatSettings } from '@/utils/notificationSettings';
import type { Chat, Topic, UserRole, SimpleUser } from './types';

const SUPERVISOR_ID = 'admin';

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
  onArchiveChat?: (chatId: string, archive: boolean) => void;
  groupTopics?: Record<string, Topic[]>;
};

export const ChatList = ({ chats, allUsers, userRole, userId, selectedChat, onSelectChat, getDisplayChat, searchQuery = '', onArchiveChat, groupTopics }: ChatListProps) => {
  const [staffFolderOpen, setStaffFolderOpen] = useState(false);
  const [nonLeadFolderOpen, setNonLeadFolderOpen] = useState(false);
  const [archiveFolderOpen, setArchiveFolderOpen] = useState(false);

  const query = searchQuery.toLowerCase().trim();

  const isAdmin = userRole === 'admin';
  const isTeacher = userRole === 'teacher';
  const isSupervisor = userId === SUPERVISOR_ID;

  const filtered = [...chats].filter((chat) => {
    if (chat.type === 'private' && chat.participants) {
      const otherUserIds = chat.participants.filter(id => id !== userId);
      if (otherUserIds.length === 0) return false;
      const uniqueIds = new Set(chat.participants);
      if (uniqueIds.size === 1 && uniqueIds.has(userId || '')) return false;
    }
    if (isTeacher && chat.isArchived) return false;
    if (query) {
      const display = getDisplayChat(chat);
      return display.name.toLowerCase().includes(query);
    }
    return true;
  });

  const isStaffChat = (chat: Chat) => {
    if (chat.type !== 'private' || !chat.participants) return false;
    if (!userId) return false;
    const otherIds = chat.participants.filter(id => id !== userId);
    if (otherIds.length === 0) return false;
    return otherIds.some(id => {
      const user = allUsers.find(u => u.id === id);
      return user?.role === 'teacher' || user?.role === 'admin';
    });
  };

  const archivedChats = isAdmin ? filtered.filter(c => c.isArchived) : [];
  const archivedUnread = archivedChats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const active = filtered.filter(c => !c.isArchived);

  const staffChatsUnsorted = (isAdmin || isTeacher) ? active.filter(c => isStaffChat(c)) : [];
  const staffChats = staffChatsUnsorted.sort((a, b) => {
    const getOtherUser = (chat: Chat) => {
      const otherId = chat.participants?.find(id => id !== userId);
      return otherId ? allUsers.find(u => u.id === otherId) : undefined;
    };
    const userA = getOtherUser(a);
    const userB = getOtherUser(b);
    const rankA = userA?.id === SUPERVISOR_ID ? 0 : userA?.role === 'admin' ? 1 : 2;
    const rankB = userB?.id === SUPERVISOR_ID ? 0 : userB?.role === 'admin' ? 1 : 2;
    if (rankA !== rankB) return rankA - rankB;
    return (userA?.name || '').localeCompare(userB?.name || '', 'ru');
  });
  const staffUnread = staffChats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const nonLeadChats = isTeacher
    ? active.filter(c => isNonLeadGroupForTeacher(c, userId))
    : (isAdmin && !isSupervisor)
      ? active.filter(c => isNonLeadGroupForAdmin(c, userId))
      : [];
  const nonLeadUnread = nonLeadChats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const otherChats = active.filter(c => {
    if ((isAdmin || isTeacher) && isStaffChat(c)) return false;
    if (isTeacher && isNonLeadGroupForTeacher(c, userId)) return false;
    if (isAdmin && !isSupervisor && isNonLeadGroupForAdmin(c, userId)) return false;
    return true;
  });

  const isChatEffectivelyMuted = (c: Chat) => {
    const topics = groupTopics?.[c.id];
    if (topics && topics.length > 0) {
      return topics.every(t => { const s = getChatSettings(t.id); return !s.sound && !s.push; });
    }
    const s = getChatSettings(c.id);
    return !s.sound && !s.push;
  };

  const hasUnmutedUnread = (c: Chat) => c.unread > 0 && !isChatEffectivelyMuted(c);

  const sorted = otherChats.sort((a, b) => {
    if (a.id === 'teachers-group') return -1;
    if (b.id === 'teachers-group') return 1;
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const aMention = (a.unreadMentions || 0) > 0;
    const bMention = (b.unreadMentions || 0) > 0;
    if (aMention && !bMention) return -1;
    if (!aMention && bMention) return 1;
    const aUnmuted = hasUnmutedUnread(a);
    const bUnmuted = hasUnmutedUnread(b);
    if (aUnmuted && !bUnmuted) return -1;
    if (!aUnmuted && bUnmuted) return 1;
    return 0;
  });

  if (isAdmin || isTeacher) {
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
              isAdmin={isAdmin}
              onArchive={onArchiveChat}
              topicIds={groupTopics?.[chat.id]?.map(t => t.id)}
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
            isAdmin={isAdmin}
            onArchiveChat={onArchiveChat}
            searchable
            groupTopics={groupTopics}
          />
        )}

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
            isAdmin={isAdmin}
            onArchiveChat={onArchiveChat}
            groupTopics={groupTopics}
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
              isAdmin={isAdmin}
              onArchive={onArchiveChat}
              topicIds={groupTopics?.[chat.id]?.map(t => t.id)}
            />
          );
        })}

        {isAdmin && archivedChats.length > 0 && (
          <FolderItem
            name="Архив"
            icon="Archive"
            chats={archivedChats}
            unread={archivedUnread}
            isOpen={archiveFolderOpen}
            onToggle={() => setArchiveFolderOpen(!archiveFolderOpen)}
            selectedChat={selectedChat}
            onSelectChat={onSelectChat}
            getDisplayChat={getDisplayChat}
            isAdmin={isAdmin}
            onArchiveChat={onArchiveChat}
            groupTopics={groupTopics}
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
            topicIds={groupTopics?.[chat.id]?.map(t => t.id)}
          />
        );
      })}
    </ScrollArea>
  );
};

export default ChatList;