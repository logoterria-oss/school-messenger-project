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

type ChatAreaProps = {
  messages: Message[];
  onReaction: (messageId: string, emoji: string) => void;
  chatName: string;
  isGroup?: boolean;
  topics?: Topic[];
  selectedTopic?: string;
  onTopicSelect?: (topicId: string) => void;
};

export const ChatArea = ({ messages, onReaction, chatName, isGroup, topics, selectedTopic, onTopicSelect }: ChatAreaProps) => {
  return (
    <>
      <div className="bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-white">
                {isGroup ? <Icon name="Users" size={18} /> : <Icon name="User" size={18} />}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-medium text-base">{chatName}</h2>
              <p className="text-xs text-muted-foreground">
                {isGroup ? '5 участников' : 'Личный чат'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Icon name="Phone" size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Icon name="Video" size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Icon name="Search" size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Icon name="MoreVertical" size={20} />
            </Button>
          </div>
        </div>
        
        {isGroup && topics && topics.length > 0 && (
          <div className="px-4 pb-3 border-t border-border/50">
            <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
              {topics.map((topic) => (
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
        className="flex-1 p-6 overflow-y-auto relative"
        style={{
          backgroundColor: 'var(--background)'
        }}
      >
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url("https://cdn.poehali.dev/files/644f6ae1dd01071d4fecc784ad48a4a1_a1442311-5b28-4898-bba3-42674649ca4d.png")`,
            backgroundSize: 'auto',
            backgroundPosition: 'center',
            backgroundRepeat: 'repeat',
            pointerEvents: 'none'
          }}
        />
        <div className="space-y-3 max-w-5xl mx-auto relative z-10">
          {messages.map((message) => (
            <MessageBubble 
              key={message.id}
              message={message}
              onReaction={onReaction}
            />
          ))}
        </div>
      </div>
    </>
  );
};