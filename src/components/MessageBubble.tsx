import { useState, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Message } from '@/types/chat.types';
import { MessageAttachments } from './message/MessageAttachments';
import { MessageImageViewer } from './message/MessageImageViewer';
import { MessageActions } from './message/MessageActions';

const formatScheduledTime = (isoStr: string): string => {
  const d = new Date(isoStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  if (msgDay.getTime() === today.getTime()) return `сегодня в ${time}`;
  if (msgDay.getTime() === tomorrow.getTime()) return `завтра в ${time}`;
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${months[d.getMonth()]} в ${time}`;
};

const URL_PATTERN = /(https?:\/\/[^\s<>']+|(?:www\.)[^\s<>']+|[a-zA-Z0-9а-яА-ЯёЁ-]+\.(?:ru|com|org|net|рф|su|io|dev|me|cc|co|info|biz|pro|shop|online|site|store|tech|app|by|ua|kz)(?:\/[^\s<>']*)?)/gi;

const DOMAIN_CHECK = /^[a-zA-Z0-9а-яА-ЯёЁ-]+\.(?:ru|com|org|net|рф|su|io|dev|me|cc|co|info|biz|pro|shop|online|site|store|tech|app|by|ua|kz)(?:\/|$)/i;

function linkify(text: string): (string | JSX.Element)[] {
  const parts = text.split(URL_PATTERN);
  return parts.map((part, i) => {
    if (/^https?:\/\//i.test(part) || /^www\./i.test(part) || DOMAIN_CHECK.test(part)) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

type MessageBubbleProps = {
  message: Message;
  onReaction: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  canDelete?: boolean;
  isGrouped?: boolean;
  onCancelScheduled?: (messageId: string) => void;
  onRetry?: (message: Message) => void;
};

export const MessageBubble = ({ message, onReaction, onReply, onForward, onDelete, canDelete, isGrouped, onCancelScheduled, onRetry }: MessageBubbleProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const images = message.attachments?.filter(a => a.type === 'image') || [];
  const files = message.attachments?.filter(a => a.type === 'file') || [];

  const senderInitial = message.sender ? message.sender.charAt(0).toUpperCase() : '?';

  const handleTouchStart = useCallback(() => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setMobileMenuOpen(true);
      if (navigator.vibrate) navigator.vibrate(20);
    }, 400);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div className="group relative">
      <div
        className={`flex items-start gap-2 md:gap-3 px-2 md:px-4 ${isGrouped ? 'py-0.5' : 'py-2.5'} rounded-xl md:transition-colors md:hover:bg-accent/40 ${message.isOwn ? 'bg-primary/[0.04]' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={(e) => { e.preventDefault(); setMobileMenuOpen(true); }}
      >
        {isGrouped ? (
          <div className="w-9 flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden mt-0.5">
            {message.senderAvatar ? (
              <img src={message.senderAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-xs font-semibold ${message.isOwn ? 'bg-primary/15 text-primary' : 'bg-accent text-muted-foreground'}`}>
                {senderInitial}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {!isGrouped && (
            <div className={`leading-tight ${message.senderRoleLabel ? 'mb-1' : 'mb-0.5'}`}>
              <div className="flex items-baseline gap-2">
                <span className={`text-[13px] font-semibold ${message.isOwn ? 'text-primary' : 'text-foreground'}`}>
                  {message.sender}
                </span>
                <span className="text-[11px] text-muted-foreground/70">{message.timestamp}</span>
                {message.isOwn && message.status && (
                  <span className="flex items-center gap-1">
                    {message.status === 'sending' && <Icon name="Clock" size={12} className="text-muted-foreground/50" />}
                    {message.status === 'sent' && <Icon name="Check" size={12} className="text-muted-foreground/50" />}
                    {message.status === 'delivered' && <Icon name="CheckCheck" size={12} className="text-muted-foreground/50" />}
                    {message.status === 'read' && <Icon name="CheckCheck" size={12} className="text-primary" />}
                    {message.status === 'error' && (
                      <>
                        <Icon name="AlertCircle" size={12} className="text-destructive" />
                        {onRetry && (
                          <button
                            onClick={() => onRetry(message)}
                            className="text-[10px] text-destructive underline underline-offset-2 hover:text-destructive/80 leading-none"
                          >
                            Повторить
                          </button>
                        )}
                      </>
                    )}
                  </span>
                )}
              </div>
              {message.senderRoleLabel && (
                <span className="text-[11px] text-muted-foreground/60 -mt-px block">{message.senderRoleLabel}</span>
              )}
            </div>
          )}

          {message.forwardedFrom && (
            <div className="mb-1.5 px-3 py-2 bg-accent/50 rounded-lg border-l-2 border-primary max-w-[calc(100vw-80px)] md:max-w-sm">
              <div className="flex items-start gap-2">
                <Icon name="Forward" size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-primary">{message.forwardedFrom.sender}</span>
                    <span className="text-[10px] text-muted-foreground">{message.forwardedFrom.chatName}</span>
                    <span className="text-[10px] text-muted-foreground/60">{message.forwardedFrom.date}</span>
                  </div>
                  {message.forwardedFrom.text && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{message.forwardedFrom.text}</p>
                  )}
                </div>
              </div>
              <MessageAttachments
                images={images}
                files={files}
                onOpenImage={setSelectedImageIndex}
                compact={true}
              />
            </div>
          )}

          {message.replyTo && (
            <div className="mb-1.5 flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border-l-2 border-primary cursor-pointer hover:bg-primary/10 transition-colors max-w-[calc(100vw-80px)] md:max-w-sm">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-primary block">{message.replyTo.sender}</span>
                <p className="text-xs text-muted-foreground truncate">{message.replyTo.text}</p>
              </div>
            </div>
          )}

          {message.text && (
            <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap text-foreground/90">
              {message.text.split(/(@\[[^\]]+\])/).map((part, i) =>
                /^@\[.+\]$/.test(part) ? (
                  <span key={i} className="text-primary font-semibold">@{part.slice(2, -1)}</span>
                ) : (
                  <span key={i}>{linkify(part)}</span>
                )
              )}
            </p>
          )}

          {!message.forwardedFrom && (
            <MessageAttachments
              images={images}
              files={files}
              onOpenImage={setSelectedImageIndex}
              compact={false}
            />
          )}

          {message.scheduledAt && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-md">
                <Icon name="Clock" size={12} />
                <span>Отправится {formatScheduledTime(message.scheduledAt)}</span>
              </div>
              {onCancelScheduled && (
                <button
                  onClick={() => onCancelScheduled(message.id)}
                  className="text-[11px] text-destructive hover:underline"
                >
                  Отменить
                </button>
              )}
            </div>
          )}

          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {message.reactions.map((reaction, idx) => (
                <Popover key={idx}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent hover:bg-accent/80 border border-border/50 transition-colors"
                    >
                      <span className="text-sm">{reaction.emoji}</span>
                      <span className="text-xs text-muted-foreground">{reaction.count}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto min-w-[140px] max-w-[220px] p-2" side="top">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 pb-1 border-b border-border/50">
                        <span className="text-base">{reaction.emoji}</span>
                        <span className="text-xs text-muted-foreground">{reaction.count}</span>
                      </div>
                      {reaction.users && reaction.users.map((user, uidx) => (
                        <p key={uidx} className="text-xs text-foreground">{user}</p>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ))}
            </div>
          )}
        </div>

        <MessageActions
          message={message}
          onReaction={onReaction}
          onReply={onReply}
          onForward={onForward}
          onDelete={onDelete}
          canDelete={canDelete}
          showDeleteConfirm={showDeleteConfirm}
          onShowDeleteConfirm={setShowDeleteConfirm}
          mobileMenuOpen={mobileMenuOpen}
          onMobileMenuClose={() => setMobileMenuOpen(false)}
        />
      </div>

      <MessageImageViewer
        images={images}
        selectedIndex={selectedImageIndex}
        onClose={() => setSelectedImageIndex(null)}
        onSelect={setSelectedImageIndex}
      />
    </div>
  );
};

export default MessageBubble;