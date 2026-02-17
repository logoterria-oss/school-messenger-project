import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const EMOJI_LIST = ['😊', '😂', '❤️', '👍', '👎', '🙏', '🎉', '😮', '😢', '😡', '🤔', '👋', '✅', '❌', '🔥', '⭐', '💪', '🙌', '😍', '🤗'];

type AttachedFile = {
  type: 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
};

export type MentionableUser = {
  id: string;
  name: string;
  avatar?: string;
};

type MessageInputProps = {
  messageText: string;
  attachments: AttachedFile[];
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
  disabled?: boolean;
  disabledMessage?: string;
  mentionableUsers?: MentionableUser[];
};

export const MessageInput = ({
  messageText,
  attachments,
  onMessageChange,
  onSendMessage,
  onFileUpload,
  onImageUpload,
  onRemoveAttachment,
  disabled,
  disabledMessage,
  mentionableUsers,
}: MessageInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const filteredUsers = (mentionableUsers || []).filter(u =>
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [messageText]);

  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [mentionQuery]);

  useEffect(() => {
    if (showMentions && mentionListRef.current) {
      const item = mentionListRef.current.children[selectedMentionIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedMentionIndex, showMentions]);

  const handleTextChange = useCallback((value: string) => {
    onMessageChange(value);

    if (!mentionableUsers || mentionableUsers.length === 0) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = value.slice(0, cursorPos);

    const atMatch = textBefore.match(/@([^\s@]*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
      setMentionStartPos(cursorPos - atMatch[0].length);
    } else {
      setShowMentions(false);
      setMentionQuery('');
      setMentionStartPos(-1);
    }
  }, [onMessageChange, mentionableUsers]);

  const insertMention = useCallback((user: MentionableUser) => {
    const before = messageText.slice(0, mentionStartPos);
    const after = messageText.slice(textareaRef.current?.selectionStart || messageText.length);
    const newText = `${before}@${user.name} ${after}`;
    onMessageChange(newText);
    setShowMentions(false);
    setMentionQuery('');
    setMentionStartPos(-1);

    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + user.name.length + 2;
        textareaRef.current.selectionStart = pos;
        textareaRef.current.selectionEnd = pos;
        textareaRef.current.focus();
      }
    }, 0);
  }, [messageText, mentionStartPos, onMessageChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => Math.min(prev + 1, filteredUsers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredUsers[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  }, [showMentions, filteredUsers, selectedMentionIndex, insertMention, onSendMessage]);

  if (disabled) {
    return (
      <div className="bg-card border-t border-border px-4 py-3">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-2">
          <Icon name="Lock" size={16} />
          <span>{disabledMessage || 'Отправка сообщений недоступна'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border-t border-border px-4 py-3">
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

      <div className="relative flex items-center gap-2">
        {showMentions && filteredUsers.length > 0 && (
          <div
            ref={mentionListRef}
            className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
          >
            {filteredUsers.map((user, idx) => (
              <button
                key={user.id}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  idx === selectedMentionIndex ? 'bg-primary/10' : 'hover:bg-accent'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user);
                }}
                onMouseEnter={() => setSelectedMentionIndex(idx)}
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-primary">{user.name.charAt(0)}</span>
                  )}
                </div>
                <span className="font-medium truncate">{user.name}</span>
              </button>
            ))}
          </div>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Icon name="Smile" size={20} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top" align="start">
            <div className="grid grid-cols-5 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onMessageChange(messageText + emoji)}
                  className="text-2xl hover:scale-125 transition-transform p-1 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
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
          placeholder={mentionableUsers && mentionableUsers.length > 0 ? "Сообщение... (@  — упомянуть)" : "Введите сообщение"}
          value={messageText}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
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

export default MessageInput;
