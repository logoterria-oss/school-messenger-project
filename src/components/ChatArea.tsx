import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';
import { MessageBubble } from './MessageBubble';

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
};

export const ChatArea = ({ messages, onReaction, chatName, isGroup, topics, selectedTopic, onTopicSelect, typingUsers, userRole, onOpenChatInfo, chatId, participantsCount }: ChatAreaProps) => {
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
      <div className="bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          {!isParentOrStudent && (
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary text-white">
                  {isGroup ? <Icon name="Users" size={18} /> : <Icon name="User" size={18} />}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium text-base">{chatName}</h2>
                <p className="text-xs text-muted-foreground">
                  {isGroup ? `${participantsCount || 0} участников` : 'Личный чат'}
                </p>
              </div>
            </div>
          )}
          {isParentOrStudent && <div />}
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Icon name="Search" size={20} />
            </Button>
            {!isTeachersGroup && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onOpenChatInfo}
                className="text-sm font-medium"
              >
                <Icon name="Info" size={16} className="mr-2" />
                Основное
              </Button>
            )}
          </div>
        </div>
        
        {shouldShowTopics && !isParentOrStudent && (
          <div className="px-4 pb-3 border-t border-border/50">
            <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
              {filteredTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => onTopicSelect?.(topic.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 whitespace-nowrap transition-all ${
                    selectedTopic === topic.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                >
                  <Icon name={topic.icon} size={14} />
                  <span className="text-sm font-medium">{topic.name}</span>
                  {topic.unread > 0 && selectedTopic !== topic.id && (
                    <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {topic.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div 
        className="flex-1 p-6 overflow-y-auto"
        style={{
          backgroundColor: 'var(--background)'
        }}
      >
        <div className="space-y-3 max-w-5xl mx-auto">
          {messages.map((message) => (
            <MessageBubble 
              key={message.id}
              message={message}
              onReaction={onReaction}
            />
          ))}
          {isGroup && typingUsers && typingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="bg-accent rounded-2xl px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-xs text-muted-foreground ml-1">
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