import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import type { Chat } from './types';

export const ChatItem = memo(({ chat, isSelected, onClick }: { chat: Chat & { avatar?: string; isPinned?: boolean }, isSelected: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full px-4 py-3 text-left transition-colors border-l-4 ${
      isSelected 
        ? 'bg-accent border-primary' 
        : 'border-transparent hover:bg-accent/50'
    }`}
  >
    <div className="flex items-center gap-3">
      <Avatar className="w-14 h-14">
        {chat.avatar && <AvatarImage src={chat.avatar} />}
        <AvatarFallback className="bg-primary text-white text-sm">
          {chat.type === 'group' ? (
            <Icon name="Users" size={20} />
          ) : (
            <Icon name="User" size={20} />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate text-foreground">{chat.name}</h3>
            {chat.isPinned && (
              <Icon name="Pin" size={14} className="text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
            {chat.timestamp}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground truncate flex-1">
            {chat.lastMessage}
          </p>
          {chat.unread > 0 && (
            <Badge className="bg-primary text-white text-xs px-2 py-0 h-5 min-w-5 rounded-full flex items-center justify-center">
              {chat.unread}
            </Badge>
          )}
        </div>
      </div>
    </div>
  </button>
));
ChatItem.displayName = 'ChatItem';

export default ChatItem;
