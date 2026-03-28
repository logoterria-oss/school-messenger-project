import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { MessageBubble } from './MessageBubble';
import { getChatSettings, setChatSound, setChatPush } from '@/utils/notificationSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Message } from '@/types/chat.types';

const formatDateSeparator = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDay.getTime() === today.getTime()) return 'Сегодня';
  if (msgDay.getTime() === yesterday.getTime()) return 'Вчера';

  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const day = date.getDate();
  const month = months[date.getMonth()];

  if (date.getFullYear() === now.getFullYear()) return `${day} ${month}`;
  return `${day} ${month} ${date.getFullYear()}`;
};

const getDateKey = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

type Topic = {
  id: string;
  name: string;
  icon: string;
  unread: number;
  unreadMentions?: number;
};

type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

type ChatAreaProps = {
  messages: Message[];
  onReaction: (messageId: string, emoji: string) => void;
  chatName: string;
  isGroup?: boolean;
  topics?: Topic[];
  selectedTopic?: string;
  onTopicSelect?: (topicId: string) => void;
  typingUsers?: string[];
  userRole?: UserRole;
  onOpenChatInfo?: () => void;
  chatId?: string;
  participantsCount?: number;
  onMobileBack?: () => void;
  userId?: string;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenUsers?: () => void;
  onAddStudent?: () => void;
  onAddParent?: () => void;
  onAddTeacher?: () => void;
  onCreateGroup?: () => void;
  onAddAdmin?: () => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onDeleteMessage?: (messageId: string) => void;
  allUsers?: { id: string; role: string }[];
  scrollToMessageId?: string | null;
  onScrollComplete?: () => void;
  onCancelScheduledMessage?: (messageId: string) => void;
  muteVersion?: number;
  messagesLoading?: boolean;
  onRetryMessage?: (message: Message) => void;
};

const TopicMuteButton = ({ topicId }: { topicId: string }) => {
  const [muted, setMuted] = useState(() => {
    const s = getChatSettings(topicId);
    return !s.sound && !s.push;
  });

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !muted;
    setChatSound(topicId, !newMuted);
    setChatPush(topicId, !newMuted);
    setMuted(newMuted);
  };

  return (
    <button
      onClick={toggle}
      className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
      title={muted ? 'Включить уведомления' : 'Выключить уведомления'}
    >
      <Icon name={muted ? 'BellOff' : 'Bell'} size={13} className={muted ? 'text-muted-foreground' : 'text-primary'} />
    </button>
  );
};

const SUPERVISOR_ID = 'admin';

const canDeleteMessage = (message: Message, currentUserId?: string, currentUserRole?: UserRole, allUsers?: { id: string; role: string }[]): boolean => {
  if (!currentUserId) return false;
  if (currentUserId === SUPERVISOR_ID) return true;
  if (message.isOwn || message.senderId === currentUserId) return true;
  if (currentUserRole === 'admin') {
    const senderRole = message.senderRole || allUsers?.find(u => u.id === message.senderId)?.role;
    if (senderRole !== 'admin' && message.senderId !== SUPERVISOR_ID) return true;
  }
  return false;
};

export const ChatArea = ({ messages, onReaction, chatName, isGroup, topics, selectedTopic, onTopicSelect, typingUsers, userRole, onOpenChatInfo, chatId, participantsCount, onMobileBack, userId, onLogout, onOpenProfile, onOpenSettings, onOpenUsers, onAddStudent, onAddParent, onAddTeacher, onCreateGroup, onAddAdmin, onReply, onForward, onDeleteMessage, allUsers, scrollToMessageId, onScrollComplete, onCancelScheduledMessage, muteVersion, messagesLoading, onRetryMessage }: ChatAreaProps) => {
  const scrollTargetRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevChatKeyRef = useRef<string>('');
  const isParentOrStudent = userRole === 'parent' || userRole === 'student';
  const isTeachersGroup = chatId === 'teachers-group';

  const studentAllowedSuffixes = ['-important', '-zoom', '-homework', '-reports', '-cancellation'];
  const teachersGroupOrder = ['-important', '-general', '-flood', '-new-students', '-parent-reviews', '-support'];
  const filteredTopics = (() => {
    if (!isGroup || !topics || topics.length === 0) return [];
    let result = topics;
    if (userRole === 'teacher') result = topics.filter(t => !t.id.endsWith('-admin-contact'));
    else if (userRole === 'student') result = topics.filter(t => studentAllowedSuffixes.some(s => t.id.endsWith(s)));
    if (isTeachersGroup) {
      result = [...result].sort((a, b) => {
        const aIdx = teachersGroupOrder.findIndex(s => a.id.endsWith(s));
        const bIdx = teachersGroupOrder.findIndex(s => b.id.endsWith(s));
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });
    }
    return result;
  })();

  const shouldShowTopics = filteredTopics.length > 0;
  const [showScrollDown, setShowScrollDown] = useState(false);

  const checkIfNearBottom = useCallback(() => {
    if (!containerRef.current) return false;
    const el = containerRef.current;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      setShowScrollDown(!checkIfNearBottom());
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [checkIfNearBottom]);

  useEffect(() => {
    if (scrollToMessageId && scrollTargetRef.current) {
      setTimeout(() => {
        scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        onScrollComplete?.();
      }, 150);
    }
  }, [scrollToMessageId]);

  const chatKey = `${chatId || ''}_${selectedTopic || ''}`;
  const initialScrollDoneRef = useRef<string>('');
  useEffect(() => {
    if (scrollToMessageId) return;
    if (messages.length === 0) return;
    if (chatKey !== prevChatKeyRef.current) {
      prevChatKeyRef.current = chatKey;
      initialScrollDoneRef.current = '';
    }
    if (initialScrollDoneRef.current !== chatKey) {
      initialScrollDoneRef.current = chatKey;
      requestAnimationFrame(() => {
        scrollToBottom(false);
        setShowScrollDown(false);
      });
      return;
    }
    if (checkIfNearBottom()) {
      setTimeout(() => scrollToBottom(true), 50);
    }
  }, [chatKey, messages.length, scrollToMessageId, scrollToBottom, checkIfNearBottom]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/60">
        <div className="flex items-center justify-between px-3 md:px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            {onMobileBack && (
              <button onClick={onMobileBack} className="md:hidden mr-1 p-1 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                <Icon name="ArrowLeft" size={20} />
              </button>
            )}
            {!isParentOrStudent && (
              <>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${isGroup ? 'bg-primary/10' : 'bg-accent'}`}>
                  <Icon name={isGroup ? 'Users' : 'User'} size={15} className={isGroup ? 'text-primary' : 'text-muted-foreground'} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm leading-tight truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">{chatName}</h2>
                  <p className="text-[11px] text-muted-foreground/70">
                    {isGroup ? `${participantsCount || 0} уч.` : 'Личный чат'}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
              <Icon name="Search" size={16} />
            </Button>
            {!isTeachersGroup && !isParentOrStudent && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenChatInfo}
                className="text-muted-foreground h-8 w-8 sm:w-auto sm:px-2.5"
              >
                <Icon name="Info" size={14} className="sm:mr-1.5" />
                <span className="hidden sm:inline text-xs font-medium">Основное</span>
              </Button>
            )}

          </div>
        </div>

        {shouldShowTopics && !isParentOrStudent && (
          <div className="px-3 md:px-5 pb-2">
            <div className="flex gap-1 flex-wrap">
              {filteredTopics.map((topic) => {
                const topicSettings = getChatSettings(topic.id);
                const topicMuted = !topicSettings.sound && !topicSettings.push;
                const isActive = selectedTopic === topic.id;
                return (
                  <div key={topic.id} className="flex items-center gap-0.5">
                    <button
                      onClick={() => onTopicSelect?.(topic.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-[11px] font-medium ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Icon name={topic.icon} size={12} />
                      <span>{topic.name}</span>
                      {topicMuted && !isActive && (
                        <Icon name="BellOff" size={11} className="text-muted-foreground/60" />
                      )}
                      {topic.unread > 0 && !isActive && (
                        (topic.unreadMentions || 0) > 0 ? (
                          <span className="text-[10px] px-1 py-0 rounded min-w-[16px] text-center font-semibold bg-primary text-white">
                            @
                          </span>
                        ) : topicMuted ? (
                          <span className="inline-block w-[8px] h-[8px] rounded-full bg-muted-foreground/40 ml-0.5" />
                        ) : (
                          <span className="text-[10px] px-1 py-0 rounded min-w-[16px] text-center font-semibold bg-primary text-white">
                            {topic.unread}
                          </span>
                        )
                      )}
                    </button>
                    {isActive && !topic.id.endsWith('-important') && <TopicMuteButton topicId={topic.id} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 relative">
        <div ref={containerRef} className="h-full overflow-y-auto overflow-x-hidden" style={{ backgroundColor: 'var(--background)' }}>
          <div className="max-w-4xl mx-auto py-4 space-y-0.5">
            {messagesLoading && messages.length === 0 && (
              <div className="space-y-3 px-4">
                {[0.6, 0.45, 0.7, 0.5, 0.55].map((w, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <div className="rounded-2xl px-4 py-3 bg-accent/40 animate-pulse" style={{ width: `${w * 100}%`, maxWidth: 340 }}>
                      <div className="h-3 rounded bg-muted-foreground/10 mb-2" style={{ width: '40%' }} />
                      <div className="h-3 rounded bg-muted-foreground/10" style={{ width: '100%' }} />
                      {i % 3 === 0 && <div className="h-3 rounded bg-muted-foreground/10 mt-1" style={{ width: '60%' }} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(() => {
              const seen = new Set<string>();
              const unique = messages.filter(m => {
                if (seen.has(m.id)) return false;
                seen.add(m.id);
                return true;
              });
              const regular = unique.filter(m => !m.scheduledAt);
              const scheduled = unique.filter(m => m.scheduledAt).sort((a, b) =>
                new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()
              );
              return [...regular, ...scheduled];
            })().map((message, index, sortedMessages) => {
              const prevMessage = index > 0 ? sortedMessages[index - 1] : null;
              const showDate = message.date && (!prevMessage || getDateKey(prevMessage.date) !== getDateKey(message.date));
              const getMessageMinutes = (msg: typeof message) => {
                if (!msg.date || !msg.timestamp) return null;
                const [h, m] = msg.timestamp.split(':').map(Number);
                const d = new Date(msg.date);
                d.setHours(h, m, 0, 0);
                return d.getTime();
              };
              const timeDiff = prevMessage
                ? Math.abs((getMessageMinutes(message) ?? 0) - (getMessageMinutes(prevMessage) ?? 0))
                : Infinity;
              const isGrouped = !showDate && prevMessage && prevMessage.senderId === message.senderId && prevMessage.sender === message.sender && !message.scheduledAt && !prevMessage.scheduledAt && timeDiff < 3 * 60 * 1000;

              return (
                <div key={message.id}>
                  {showDate && message.date && (
                    <div className="flex justify-center py-2 sticky top-0 z-10">
                      <span className="text-[12px] text-muted-foreground bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-border/40">
                        {formatDateSeparator(message.date)}
                      </span>
                    </div>
                  )}
                  <div ref={message.id === scrollToMessageId ? scrollTargetRef : undefined}>
                    <MessageBubble
                      message={message}
                      onReaction={onReaction}
                      onReply={onReply}
                      onForward={onForward}
                      onDelete={onDeleteMessage}
                      canDelete={canDeleteMessage(message, userId, userRole, allUsers)}
                      isGrouped={!!isGrouped}
                      onCancelScheduled={message.scheduledAt ? onCancelScheduledMessage : undefined}
                      onRetry={onRetryMessage}
                    />
                  </div>
                </div>
              );
            })}
            {isGroup && typingUsers && typingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/60 rounded-lg">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'печатает' : 'печатают'}...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {showScrollDown && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-accent transition-all z-10 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <Icon name="ArrowDown" size={18} className="text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatArea;