import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';

type AttachedFile = {
  type: 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
};

type MessageInputProps = {
  messageText: string;
  attachments: AttachedFile[];
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
};

export const MessageInput = ({
  messageText,
  attachments,
  onMessageChange,
  onSendMessage,
  onFileUpload,
  onImageUpload,
  onRemoveAttachment,
}: MessageInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [messageText]);

  return (
    <div className="bg-card border-t border-border px-4 py-3 max-lg:px-3 max-lg:py-2">
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, idx) => (
            <div 
              key={idx}
              className="relative group bg-accent rounded-lg overflow-hidden"
            >
              {attachment.type === 'image' && attachment.fileUrl && (
                <div className="relative">
                  <img 
                    src={attachment.fileUrl} 
                    alt="Preview" 
                    className="h-20 w-20 object-cover"
                  />
                  <button
                    onClick={() => onRemoveAttachment(idx)}
                    className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
              )}
              
              {attachment.type === 'file' && (
                <div className="flex items-center gap-2 p-2 pr-8 min-w-[200px]">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="FileText" size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{attachment.fileName}</p>
                    <p className="text-[10px] text-muted-foreground">{attachment.fileSize}</p>
                  </div>
                  <button
                    onClick={() => onRemoveAttachment(idx)}
                    className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="X" size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Icon name="Smile" size={20} />
        </Button>
        
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onImageUpload}
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground"
          onClick={() => imageInputRef.current?.click()}
        >
          <Icon name="Image" size={20} />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFileUpload}
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="Paperclip" size={20} />
        </Button>

        <Textarea
          ref={textareaRef}
          placeholder="Введите сообщение"
          value={messageText}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          className="flex-1 bg-card border-border min-h-[40px] max-h-[120px] resize-none py-2 overflow-y-auto"
          rows={1}
        />
        <Button
          onClick={onSendMessage}
          size="icon"
          className="bg-primary hover:bg-primary/90 text-white"
          disabled={!messageText.trim() && attachments.length === 0}
        >
          <Icon name="Send" size={18} />
        </Button>
      </div>
    </div>
  );
};