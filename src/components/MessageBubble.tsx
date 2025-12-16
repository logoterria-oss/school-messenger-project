import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

type MessageBubbleProps = {
  message: Message;
  onReaction: (messageId: string, emoji: string) => void;
};

export const MessageBubble = ({ message, onReaction }: MessageBubbleProps) => {
  return (
    <div
      className={`flex group ${message.isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div className="relative">
        <div
          className={`max-w-md rounded-lg shadow-sm ${
            message.isOwn
              ? 'bg-[#D9FDD3] text-foreground rounded-br-none'
              : 'bg-card text-foreground rounded-bl-none'
          }`}
        >
          {!message.isOwn && (
            <p className="text-xs font-medium text-primary mb-1 px-3 pt-2">
              {message.sender}
            </p>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-1">
              {message.attachments.map((attachment, idx) => (
                <div key={idx}>
                  {attachment.type === 'image' && attachment.fileUrl && (
                    <div className="p-1">
                      <img 
                        src={attachment.fileUrl} 
                        alt="Изображение" 
                        className="rounded-lg max-w-xs max-h-80 object-cover"
                      />
                    </div>
                  )}
                  
                  {attachment.type === 'file' && (
                    <div className="px-3 py-2 flex items-center gap-3 min-w-[280px]">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon name="FileText" size={24} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                        <p className="text-xs text-muted-foreground">{attachment.fileSize}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <Icon name="Download" size={18} />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {message.text && (
            <div className="px-3 py-2">
              <p className="text-[14.2px] leading-[19px] break-words">{message.text}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-1 px-3 pb-2">
            <span className="text-[11px] text-muted-foreground">
              {message.timestamp}
            </span>
            {message.isOwn && (
              <Icon name="CheckCheck" size={14} className="text-primary" />
            )}
          </div>
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="absolute -bottom-2 right-2 flex gap-1 bg-card rounded-full px-2 py-0.5 border border-border shadow-sm">
            {message.reactions.map((reaction, idx) => (
              <button
                key={idx}
                className="flex items-center gap-0.5 text-xs hover:scale-110 transition-transform"
                onClick={() => onReaction(message.id, reaction.emoji)}
              >
                <span>{reaction.emoji}</span>
                <span className="text-muted-foreground">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className={`absolute top-1 ${message.isOwn ? 'left-[-40px]' : 'right-[-40px]'} opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8`}
            >
              <Icon name="SmilePlus" size={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex gap-1">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReaction(message.id, emoji)}
                  className="text-2xl hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
