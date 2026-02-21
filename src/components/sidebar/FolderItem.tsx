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
        className={`w-full px-4 py-2.5 text-left transition-colors hover:bg-accent/50 border-l-4 ${
          hasSelectedChat && !isOpen ? 'border-primary bg-accent/30' : 'border-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <Icon name={icon} size={22} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm text-foreground">{name}</h3>
                <Icon name="Pin" size={14} className="text-muted-foreground flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && !isOpen && (
                  <Badge className="bg-primary text-white text-xs px-2 py-0 h-5 min-w-5 rounded-full flex items-center justify-center">
                    {unread}
                  </Badge>
                )}
                <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {chats.length} {chats.length === 1 ? 'чат' : chats.length < 5 ? 'чата' : 'чатов'}
            </p>
          </div>
        </div>
      </button>

      {isOpen && chats.map((chat) => {
        const displayChat = getDisplayChat(chat);
        return (
          <div key={chat.id} className="pl-4">
            <ChatItem
              chat={displayChat}
              isSelected={selectedChat === chat.id}
              onClick={() => onSelectChat(chat.id)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default FolderItem;
