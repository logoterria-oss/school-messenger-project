import { useState, useRef, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { ChatItem } from './ChatItem';
import { getChatSettings } from '@/utils/notificationSettings';
import type { Chat, Topic } from './types';

type FolderItemProps = {
  name: string;
  icon: string;
  chats: Chat[];
  unread: number;
  isOpen: boolean;
  onToggle: () => void;
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  getDisplayChat: (chat: Chat) => Chat;
  onlyMentionUnread?: boolean;
  showMentionBadge?: boolean;
  isAdmin?: boolean;
  onArchiveChat?: (chatId: string, archive: boolean) => void;
  searchable?: boolean;
  groupTopics?: Record<string, Topic[]>;
};

const MIN_CHATS_FOR_SEARCH = 5;

export const FolderItem = ({ name, icon, chats, unread, isOpen, onToggle, selectedChat, onSelectChat, getDisplayChat, onlyMentionUnread, showMentionBadge, isAdmin, onArchiveChat, searchable, groupTopics }: FolderItemProps) => {
  const hasSelectedChat = chats.some(c => c.id === selectedChat);
  const [folderSearch, setFolderSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const showSearch = searchable && isOpen && chats.length >= MIN_CHATS_FOR_SEARCH;

  useEffect(() => {
    if (!isOpen) setFolderSearch('');
  }, [isOpen]);

  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  const isChatMuted = (c: Chat) => {
    const topics = groupTopics?.[c.id];
    if (topics && topics.length > 0) {
      return topics.every(t => { const s = getChatSettings(t.id); return !s.sound && !s.push; });
    }
    const s = getChatSettings(c.id);
    return !s.sound && !s.push;
  };

  const query = folderSearch.toLowerCase().trim();
  const filteredChats = query
    ? chats.filter(chat => {
        const display = getDisplayChat(chat);
        return display.name.toLowerCase().includes(query);
      })
    : chats;

  const sortedChats = useMemo(() => {
    return [...filteredChats].sort((a, b) => {
      const aMuted = isChatMuted(a);
      const bMuted = isChatMuted(b);
      const aMentions = a.unreadMentions || 0;
      const bMentions = b.unreadMentions || 0;
      const aUnread = a.unread || 0;
      const bUnread = b.unread || 0;

      const aPriority = aMentions > 0 ? 0 : (!aMuted && aUnread > 0) ? 1 : 2;
      const bPriority = bMentions > 0 ? 0 : (!bMuted && bUnread > 0) ? 1 : 2;

      if (aPriority !== bPriority) return aPriority - bPriority;
      return 0;
    });
  }, [filteredChats, groupTopics]);

  const allMentions = showMentionBadge ? chats.reduce((sum, c) => sum + (c.unreadMentions || 0), 0) : 0;
  const unmutedUnread = onlyMentionUnread
    ? chats.filter(c => !isChatMuted(c)).reduce((sum, c) => sum + (c.unreadMentions || 0), 0)
    : chats.filter(c => !isChatMuted(c)).reduce((sum, c) => sum + (c.unread || 0), 0);
  const hasMutedUnread = chats.some(c => isChatMuted(c) && (onlyMentionUnread ? (c.unreadMentions || 0) > 0 : (c.unread || 0) > 0));

  const renderBadge = () => {
    if (isOpen) return null;
    if (allMentions > 0) return (
      <Badge className="bg-primary text-white text-[10px] px-1.5 py-0 h-[18px] min-w-[18px] rounded-md flex items-center justify-center font-semibold">
        @
      </Badge>
    );
    if (unmutedUnread > 0) return (
      <Badge className="bg-primary text-white text-[10px] px-1.5 py-0 h-[18px] min-w-[18px] rounded-md flex items-center justify-center font-semibold">
        {unmutedUnread}
      </Badge>
    );
    if (hasMutedUnread) return (
      <div className="w-[10px] h-[10px] rounded-full bg-primary/70 flex-shrink-0" />
    );
    return null;
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full px-3 py-2 text-left transition-all rounded-lg mx-1 ${
          hasSelectedChat && !isOpen ? 'bg-primary/5' : 'hover:bg-accent/60'
        }`}
        style={{ width: 'calc(100% - 8px)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-[52px] h-[52px] rounded-lg bg-accent/80 flex items-center justify-center flex-shrink-0">
            <Icon name={icon} size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3 className="font-medium text-[13px] text-foreground">{name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {renderBadge()}
                <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={18} className="text-muted-foreground/60" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground/70">
              {chats.length} {chats.length === 1 ? 'чат' : chats.length < 5 ? 'чата' : 'чатов'}
            </p>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="ml-3 border-l-2 border-border/50 pl-1 max-h-[60vh] overflow-y-auto">
          {showSearch && (
            <div className="px-2 py-1.5">
              <div className="relative">
                <Icon name="Search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Найти контакт..."
                  value={folderSearch}
                  onChange={(e) => setFolderSearch(e.target.value)}
                  className="w-full pl-7 pr-7 h-7 text-xs bg-accent/50 border-0 rounded-md placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                {folderSearch && (
                  <button
                    onClick={() => setFolderSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    <Icon name="X" size={13} />
                  </button>
                )}
              </div>
            </div>
          )}
          {sortedChats.length === 0 && query ? (
            <p className="text-xs text-muted-foreground/50 px-3 py-2">Ничего не найдено</p>
          ) : (
            sortedChats.map((chat) => {
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
            })
          )}
        </div>
      )}
    </div>
  );
};

export default FolderItem;