import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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
  status?: 'sending' | 'sent' | 'delivered' | 'read';
};

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

type MessageBubbleProps = {
  message: Message;
  onReaction: (messageId: string, emoji: string) => void;
};

export const MessageBubble = ({ message, onReaction }: MessageBubbleProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const images = message.attachments?.filter(a => a.type === 'image') || [];
  const files = message.attachments?.filter(a => a.type === 'file') || [];

  const openImage = (index: number) => setSelectedImageIndex(index);
  const closeImage = () => setSelectedImageIndex(null);

  useEffect(() => {
    if (selectedImageIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setSelectedImageIndex(prev => (prev !== null && prev < images.length - 1) ? prev + 1 : prev);
      }
      if (e.key === 'ArrowLeft') {
        setSelectedImageIndex(prev => (prev !== null && prev > 0) ? prev - 1 : prev);
      }
      if (e.key === 'Escape') setSelectedImageIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, images.length]);

  const getGridLayout = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    return 'grid-cols-2';
  };

  const getImageSize = (count: number, idx: number) => {
    if (count === 1) return 'aspect-square max-w-xs';
    if (count === 2) return 'aspect-square';
    if (count === 3 && idx === 0) return 'col-span-3 aspect-video';
    return 'aspect-square';
  };

  const senderInitial = message.sender ? message.sender.charAt(0).toUpperCase() : '?';

  return (
    <div className="group relative">
      <div className={`flex items-start gap-2 md:gap-3 px-2 md:px-4 py-2.5 rounded-xl transition-colors hover:bg-accent/40 ${message.isOwn ? 'bg-primary/[0.04]' : ''}`}>
        <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden mt-0.5">
          {message.senderAvatar ? (
            <img src={message.senderAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-xs font-semibold ${message.isOwn ? 'bg-primary/15 text-primary' : 'bg-accent text-muted-foreground'}`}>
              {senderInitial}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={`text-[13px] font-semibold ${message.isOwn ? 'text-primary' : 'text-foreground'}`}>
              {message.sender}
            </span>
            <span className="text-[11px] text-muted-foreground/70">{message.timestamp}</span>
            {message.isOwn && message.status && (
              <span className="flex items-center">
                {message.status === 'sending' && <Icon name="Clock" size={12} className="text-muted-foreground/50" />}
                {message.status === 'sent' && <Icon name="Check" size={12} className="text-muted-foreground/50" />}
                {message.status === 'delivered' && <Icon name="CheckCheck" size={12} className="text-muted-foreground/50" />}
                {message.status === 'read' && <Icon name="CheckCheck" size={12} className="text-primary" />}
              </span>
            )}
          </div>

          {message.text && (
            <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap text-foreground/90">
              {message.text.split(/(@[А-Яа-яёЁA-Za-z]+(?:\s[А-Яа-яёЁA-Za-z]+)?)/).map((part, i) =>
                part.startsWith('@') ? (
                  <span key={i} className="text-primary font-semibold">{part}</span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </p>
          )}

          {images.length > 0 && (
            <div className="mt-2">
              <div className={`grid gap-1.5 ${getGridLayout(Math.min(images.length, 4))} max-w-[calc(100vw-80px)] md:max-w-sm`}>
                {images.slice(0, 4).map((img, idx) => (
                  <div
                    key={idx}
                    className={`${getImageSize(Math.min(images.length, 4), idx)} overflow-hidden rounded-lg cursor-pointer relative group/img`}
                    onClick={() => openImage(idx)}
                  >
                    <img
                      src={img.fileUrl}
                      alt={`Изображение ${idx + 1}`}
                      className="w-full h-full object-cover group-hover/img:brightness-90 transition-all"
                      loading="lazy"
                    />
                    {images.length > 4 && idx === 3 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-3xl font-medium">+{images.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 bg-accent/60 rounded-lg max-w-[calc(100vw-80px)] md:max-w-sm">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="FileText" size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.fileName}</p>
                    <p className="text-xs text-muted-foreground">{file.fileSize}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8"
                    onClick={() => {
                      if (file.fileUrl) {
                        const a = document.createElement('a');
                        a.href = file.fileUrl;
                        a.download = file.fileName || 'file';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }
                    }}
                  >
                    <Icon name="Download" size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {message.reactions.map((reaction, idx) => (
                <button
                  key={idx}
                  onClick={() => onReaction(message.id, reaction.emoji)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent hover:bg-accent/80 border border-border/50 transition-colors"
                  title={reaction.users?.join(', ')}
                >
                  <span className="text-sm">{reaction.emoji}</span>
                  <span className="text-xs text-muted-foreground">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center">
                <Icon name="SmilePlus" size={15} className="text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top">
              <div className="flex gap-1">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onReaction(message.id, emoji)}
                    className="w-8 h-8 rounded-md hover:bg-accent flex items-center justify-center transition-transform hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {selectedImageIndex !== null && images[selectedImageIndex] && (
        <Dialog open={true} onOpenChange={closeImage}>
          <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] p-0 bg-black/95 border-none">
            <DialogTitle className="sr-only">Просмотр изображения</DialogTitle>
            <div className="relative flex items-center justify-center min-h-[200px] md:min-h-[400px]">
              <img
                src={images[selectedImageIndex].fileUrl}
                alt={`Изображение ${selectedImageIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain"
              />
              {selectedImageIndex > 0 && (
                <button
                  onClick={() => setSelectedImageIndex(prev => prev !== null ? prev - 1 : null)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <Icon name="ChevronLeft" size={24} className="text-white" />
                </button>
              )}
              {selectedImageIndex < images.length - 1 && (
                <button
                  onClick={() => setSelectedImageIndex(prev => prev !== null ? prev + 1 : null)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <Icon name="ChevronRight" size={24} className="text-white" />
                </button>
              )}
              <button
                onClick={closeImage}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <Icon name="X" size={20} className="text-white" />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MessageBubble;