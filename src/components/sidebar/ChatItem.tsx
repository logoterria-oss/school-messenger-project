import { memo, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { getChatSettings, setChatSound, setChatPush } from '@/utils/notificationSettings';
import type { Chat } from './types';

type ChatItemProps = {
  chat: Chat & { avatar?: string; isPinned?: boolean };
  isSelected: boolean;
  onClick: () => void;
  isAdmin?: boolean;
  onArchive?: (chatId: string, archive: boolean) => void;
  topicIds?: string[];
  onlyMentionBadge?: boolean;
};

export const ChatItem = memo(({ chat, isSelected, onClick, isAdmin, onArchive, topicIds, onlyMentionBadge }: ChatItemProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [settings, setSettings] = useState(() => getChatSettings(chat.id));

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  }, []);

  const toggleSound = useCallback(() => {
    const newVal = !settings.sound;
    setChatSound(chat.id, newVal);
    setSettings(prev => ({ ...prev, sound: newVal }));
  }, [chat.id, settings.sound]);

  const togglePush = useCallback(() => {
    const newVal = !settings.push;
    setChatPush(chat.id, newVal);
    setSettings(prev => ({ ...prev, push: newVal }));
  }, [chat.id, settings.push]);

  const chatMuted = !settings.sound && !settings.push;
  const isMuted = topicIds && topicIds.length > 0
    ? topicIds.every(id => { const s = getChatSettings(id); return !s.sound && !s.push; })
    : chatMuted;
  const initial = chat.name ? chat.name.charAt(0).toUpperCase() : '?';

  return (
    <>
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={`w-full px-3 py-2 text-left transition-all rounded-lg mx-1 ${
          isSelected
            ? 'bg-primary/10 shadow-sm'
            : 'hover:bg-accent/60'
        }`}
        style={{ width: 'calc(100% - 8px)' }}
      >
        <div className="flex items-center gap-3">
          <div className={`w-[52px] h-[52px] rounded-lg flex-shrink-0 overflow-hidden ${isSelected ? 'ring-2 ring-primary/30' : ''}`}>
            {chat.avatar ? (
              <img src={chat.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-accent flex items-center justify-center">
                {chat.type === 'group' ? (
                  <Icon name="Users" size={21} className="text-muted-foreground" />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">{initial}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <h3 className={`text-[13px] truncate ${isSelected ? 'font-semibold text-primary' : 'font-medium text-foreground'}`}>{chat.name}</h3>
                {chat.isPinned && (
                  <Icon name="Pin" size={12} className="text-muted-foreground/60 flex-shrink-0 rotate-45" />
                )}
                {isMuted && (
                  <Icon name="BellOff" size={16} className="text-muted-foreground/60 flex-shrink-0" />
                )}
              </div>
              <span className="text-[11px] text-muted-foreground/70 ml-2 flex-shrink-0">
                {chat.timestamp}
              </span>
            </div>
            {(chat.unread > 0 || chat.hasMutedUnread || (chat.unreadMentions || 0) > 0) && (
              <div className="flex items-center justify-end gap-1">
                {(chat.unreadMentions || 0) > 0 ? (
                  <Badge className="text-[10px] px-1.5 py-0 h-[18px] min-w-[18px] rounded-md flex items-center justify-center font-semibold bg-primary text-white">
                    @
                  </Badge>
                ) : onlyMentionBadge ? null
                : chat.unread > 0 && !isMuted ? (
                  <Badge className="text-[10px] px-1.5 py-0 h-[18px] min-w-[18px] rounded-md flex items-center justify-center font-semibold bg-primary text-white">
                    {chat.unread}
                  </Badge>
                ) : (chat.unread > 0 && isMuted) || chat.hasMutedUnread ? (
                  <div className="w-[10px] h-[10px] rounded-full bg-muted-foreground/40 flex-shrink-0" />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowMenu(false)} />
          <div
            className="fixed z-50 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[200px] max-w-[calc(100vw-16px)]"
            style={{ left: Math.min(menuPos.x, window.innerWidth - 220), top: menuPos.y }}
          >
            <button
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-accent flex items-center gap-3"
              onClick={() => { toggleSound(); setShowMenu(false); }}
            >
              <Icon name={settings.sound ? 'Volume2' : 'VolumeX'} size={16} />
              {settings.sound ? 'Выключить звук' : 'Включить звук'}
            </button>
            <button
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-accent flex items-center gap-3"
              onClick={() => { togglePush(); setShowMenu(false); }}
            >
              <Icon name={settings.push ? 'Bell' : 'BellOff'} size={16} />
              {settings.push ? 'Выключить уведомления' : 'Включить уведомления'}
            </button>
            {isAdmin && onArchive && chat.id !== 'teachers-group' && (
              <button
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-accent flex items-center gap-3"
                onClick={() => { onArchive(chat.id, !chat.isArchived); setShowMenu(false); }}
              >
                <Icon name={chat.isArchived ? 'ArchiveRestore' : 'Archive'} size={16} />
                {chat.isArchived ? 'Из архива' : 'В архив'}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
});
ChatItem.displayName = 'ChatItem';

export default ChatItem;