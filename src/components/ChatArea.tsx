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

type ChatAreaProps = {
  messages: Message[];
  onReaction: (messageId: string, emoji: string) => void;
};

export const ChatArea = ({ messages, onReaction }: ChatAreaProps) => {
  return (
    <>
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-white">
                <Icon name="Users" size={18} />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-medium text-base">Группа: Иванов Пётр</h2>
              <p className="text-xs text-muted-foreground">
                5 участников
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
      </div>

      <div 
        className="flex-1 p-6 overflow-y-auto"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
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
        </div>
      </div>
    </>
  );
};
