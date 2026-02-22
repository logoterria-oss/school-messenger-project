import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { ChatItem } from './ChatItem';
import type { Chat } from './types';

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
};

export const FolderItem = ({ name, icon, chats, unread, isOpen, onToggle, selectedChat, onSelectChat, getDisplayChat }: FolderItemProps) => {
  const hasSelectedChat = chats.some(c => c.id === selectedChat);

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
          <div className="w-10 h-10 rounded-lg bg-accent/80 flex items-center justify-center flex-shrink-0">
            <Icon name={icon} size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3 className="font-medium text-[13px] text-foreground">{name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && !isOpen && (
                  <Badge className="bg-primary text-white text-[10px] px-1.5 py-0 h-[18px] min-w-[18px] rounded-md flex items-center justify-center font-semibold">
                    {unread}
                  </Badge>
                )}
                <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-muted-foreground/60" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground/70">
              {chats.length} {chats.length === 1 ? 'чат' : chats.length < 5 ? 'чата' : 'чатов'}
            </p>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="ml-3 border-l-2 border-border/50 pl-1">
          {chats.map((chat) => {
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
        </div>
      )}
    </div>
  );
};

export default FolderItem;