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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const images = message.attachments?.filter(a => a.type === 'image') || [];
  const files = message.attachments?.filter(a => a.type === 'file') || [];

  const openImage = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeImage = () => {
    setSelectedImageIndex(null);
  };

  const nextImage = () => {
    setSelectedImageIndex(prev => {
      if (prev !== null && prev < images.length - 1) {
        return prev + 1;
      }
      return prev;
    });
  };

  const prevImage = () => {
    setSelectedImageIndex(prev => {
      if (prev !== null && prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  };

  useEffect(() => {
    if (selectedImageIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setSelectedImageIndex(prev => {
          if (prev !== null && prev < images.length - 1) return prev + 1;
          return prev;
        });
      }
      if (e.key === 'ArrowLeft') {
        setSelectedImageIndex(prev => {
          if (prev !== null && prev > 0) return prev - 1;
          return prev;
        });
      }
      if (e.key === 'Escape') {
        setSelectedImageIndex(null);
      }
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
    if (count === 3) return 'aspect-square';
    return 'aspect-square';
  };

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

          {images.length > 0 && (
            <div className="p-1">
              <div className={`grid gap-0.5 ${getGridLayout(Math.min(images.length, 4))} max-w-xs`}>
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
            <div className="space-y-1">
              {files.map((file, idx) => (
                <div key={idx} className="px-3 py-2 flex items-center gap-3 min-w-[280px]">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name="FileText" size={24} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.fileName}</p>
                    <p className="text-xs text-muted-foreground">{file.fileSize}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <Icon name="Download" size={18} />
                  </Button>
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

      <Dialog open={selectedImageIndex !== null} onOpenChange={closeImage}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none">
          <DialogTitle className="sr-only">Просмотр изображения</DialogTitle>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={closeImage}
            >
              <Icon name="X" size={24} />
            </Button>
            
            {selectedImageIndex !== null && images[selectedImageIndex] && (
              <>
                <img 
                  src={images[selectedImageIndex].fileUrl} 
                  alt={`Изображение ${selectedImageIndex + 1} из ${images.length}`}
                  className="w-full h-auto max-h-[90vh] object-contain"
                />
                
                {images.length > 1 && (
                  <>
                    {selectedImageIndex > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-12 h-12"
                        onClick={prevImage}
                      >
                        <Icon name="ChevronLeft" size={32} />
                      </Button>
                    )}
                    
                    {selectedImageIndex < images.length - 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-12 h-12"
                        onClick={nextImage}
                      >
                        <Icon name="ChevronRight" size={32} />
                      </Button>
                    )}
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {selectedImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};