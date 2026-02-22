import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { MessageBubble } from './MessageBubble';
import { getChatSettings, setChatSound, setChatPush } from '@/utils/notificationSettings';

type AttachedFile = {
  type: 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
};

type Message = {
  id: string;
  text?: string;
  sender: string;
  senderId?: string;
  senderAvatar?: string;
  timestamp: string;
  isOwn: boolean;
  attachments?: AttachedFile[];
  reactions?: { emoji: string; count: number; users: string[] }[];
};

type Topic = {
  id: string;
  name: string;
  icon: string;
  unread: number;
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

export const ChatArea = ({ messages, onReaction, chatName, isGroup, topics, selectedTopic, onTopicSelect, typingUsers, userRole, onOpenChatInfo, chatId, participantsCount, onMobileBack }: ChatAreaProps) => {
  const isParentOrStudent = userRole === 'parent' || userRole === 'student';
  const isTeachersGroup = chatId === 'teachers-group';

  const studentAllowedSuffixes = ['-important', '-zoom', '-homework', '-reports', '-cancellation'];
  const filteredTopics = (() => {
    if (!isGroup || !topics || topics.length === 0) return [];
    if (userRole === 'admin') return topics;
    if (userRole === 'parent') return topics;
    if (userRole === 'teacher') return topics.filter(t => !t.id.endsWith('-admin-contact'));
    if (userRole === 'student') return topics.filter(t => studentAllowedSuffixes.some(s => t.id.endsWith(s)));
    return topics;
  })();

  const shouldShowTopics = filteredTopics.length > 0;

  return (
    <>
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
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isGroup ? 'bg-primary/10' : 'bg-accent'}`}>
                  <Icon name={isGroup ? 'Users' : 'User'} size={15} className={isGroup ? 'text-primary' : 'text-muted-foreground'} />
                </div>
                <div>
                  <h2 className="font-semibold text-sm leading-tight">{chatName}</h2>
                  <p className="text-[11px] text-muted-foreground/70">
                    {isGroup ? `${participantsCount || 0} участников` : 'Личный чат'}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
              <Icon name="Search" size={16} />
            </Button>
            {!isTeachersGroup && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenChatInfo}
                className="text-xs font-medium h-8 text-muted-foreground hover:text-foreground"
              >
                <Icon name="Info" size={14} className="mr-1.5" />
                Основное
              </Button>
            )}
          </div>
        </div>

        {shouldShowTopics && !isParentOrStudent && (
          <div className="px-3 md:px-5 pb-2">
            <div className="flex gap-1 flex-wrap md:flex-nowrap md:overflow-x-auto scrollbar-hide">
              {filteredTopics.map((topic) => {
                const topicSettings = getChatSettings(topic.id);
                const topicMuted = !topicSettings.sound && !topicSettings.push;
                const isActive = selectedTopic === topic.id;
                return (
                  <div key={topic.id} className="flex items-center gap-0.5">
                    <button
                      onClick={() => onTopicSelect?.(topic.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg whitespace-nowrap transition-all text-xs font-medium ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Icon name={topic.icon} size={13} />
                      <span>{topic.name}</span>
                      {topicMuted && !isActive && (
                        <Icon name="BellOff" size={11} className="text-muted-foreground/60" />
                      )}
                      {topic.unread > 0 && !isActive && (
                        <span className={`text-[10px] px-1 py-0 rounded min-w-[16px] text-center font-semibold ${topicMuted ? 'bg-muted-foreground/30 text-foreground/60' : 'bg-primary text-white'}`}>
                          {topic.unread}
                        </span>
                      )}
                    </button>
                    {isActive && <TopicMuteButton topicId={topic.id} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto py-4 space-y-0.5">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onReaction={onReaction}
            />
          ))}
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
        </div>
      </div>
    </>
  );
};

export default ChatArea;