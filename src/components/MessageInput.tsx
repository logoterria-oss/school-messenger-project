import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScheduleMessagePicker } from './ScheduleMessagePicker';

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
  role?: string;
  isPrimary?: boolean;
};

type MessageInputProps = {
  messageText: string;
  attachments: AttachedFile[];
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  onScheduleMessage?: (date: Date) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
  disabled?: boolean;
  disabledMessage?: string;
  hintMessage?: string;
  mentionableUsers?: MentionableUser[];
  replyTo?: { id: string; sender: string; text: string } | null;
  onCancelReply?: () => void;
};

export const MessageInput = ({
  messageText,
  attachments,
  onMessageChange,
  onSendMessage,
  onScheduleMessage,
  onFileUpload,
  onImageUpload,
  onRemoveAttachment,
  disabled,
  disabledMessage,
  hintMessage,
  mentionableUsers,
  replyTo,
  onCancelReply,
}: MessageInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  const [showScheduleDesktop, setShowScheduleDesktop] = useState(false);
  const [showScheduleMobile, setShowScheduleMobile] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const filteredUsers = (mentionableUsers || []).filter(u =>
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const hasPrimaryDivision = filteredUsers.some(u => u.isPrimary) && filteredUsers.some(u => !u.isPrimary);
  const sortedMentionUsers = hasPrimaryDivision
    ? [...filteredUsers.filter(u => u.isPrimary), ...filteredUsers.filter(u => !u.isPrimary)]
    : filteredUsers;
  const primaryCount = hasPrimaryDivision ? filteredUsers.filter(u => u.isPrimary).length : 0;

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

    const completedBefore = textBefore.lastIndexOf('@[');
    const closedBefore = textBefore.lastIndexOf(']');
    const insideCompleted = completedBefore !== -1 && completedBefore > closedBefore;

    const atMatch = !insideCompleted ? textBefore.match(/@([^\s@[\]]*)$/) : null;
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
    const label = user.role ? `${user.name} (${user.role})` : user.name;
    const mention = `@[${label}]`;
    const newText = `${before}${mention} ${after}`;
    onMessageChange(newText);
    setShowMentions(false);
    setMentionQuery('');
    setMentionStartPos(-1);

    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + mention.length + 1;
        textareaRef.current.selectionStart = pos;
        textareaRef.current.selectionEnd = pos;
        textareaRef.current.focus();
      }
    }, 0);
  }, [messageText, mentionStartPos, onMessageChange]);

  const flushAndSend = useCallback(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      if (domValue !== messageText) {
        onMessageChange(domValue);
      }
    }
    onSendMessage();
  }, [messageText, onMessageChange, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showMentions && sortedMentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => Math.min(prev + 1, sortedMentionUsers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(sortedMentionUsers[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

  }, [showMentions, sortedMentionUsers, selectedMentionIndex, insertMention]);

  if (disabled) {
    return (
      <div className="bg-card/80 backdrop-blur-sm border-t border-border/60 px-3 md:px-5 py-3">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-2">
          <Icon name="Lock" size={16} />
          <span>{disabledMessage || 'Отправка сообщений недоступна'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/80 backdrop-blur-sm border-t border-border/60 px-3 md:px-5 py-3">
      {hintMessage && (
        <div className="mb-2 flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border border-primary/30 rounded-lg">
          <Icon name="Info" size={14} className="text-primary/60 flex-shrink-0" />
          <span>{hintMessage}</span>
        </div>
      )}

      {replyTo && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-lg border-l-2 border-primary">
          <Icon name="Reply" size={16} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-primary block">{replyTo.sender}</span>
            <p className="text-xs text-muted-foreground truncate">{replyTo.text}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="flex-shrink-0 w-6 h-6 rounded-md hover:bg-accent flex items-center justify-center transition-colors"
          >
            <Icon name="X" size={14} className="text-muted-foreground" />
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, idx) => (
            <div
              key={idx}
              className="relative group bg-accent/60 rounded-lg overflow-hidden"
            >
              {attachment.type === 'image' && attachment.fileUrl && (
                <div className="relative">
                  <img
                    src={attachment.fileUrl}
                    alt="Preview"
                    className="h-16 w-16 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => onRemoveAttachment(idx)}
                    className="absolute top-0.5 right-0.5 bg-destructive text-white rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="X" size={12} />
                  </button>
                </div>
              )}

              {attachment.type === 'file' && (
                <div className="flex items-center gap-2 p-2 pr-8 min-w-0 max-w-full">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="FileText" size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{attachment.fileName}</p>
                    <p className="text-[10px] text-muted-foreground">{attachment.fileSize}</p>
                  </div>
                  <button
                    onClick={() => onRemoveAttachment(idx)}
                    className="absolute top-1.5 right-1.5 bg-destructive text-white rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="X" size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        {showMentions && filteredUsers.length > 0 && (
          <div
            ref={mentionListRef}
            className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto overscroll-contain z-50"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {sortedMentionUsers.map((user, idx) => (
              <div key={user.id}>
                {hasPrimaryDivision && idx === primaryCount && (
                  <div className="border-t border-border/60 mx-3 my-1" />
                )}
                <button
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    idx === selectedMentionIndex ? 'bg-primary/10' : 'hover:bg-accent'
                  }`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => insertMention(user)}
                  onMouseEnter={() => setSelectedMentionIndex(idx)}
                >
                  <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">{user.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="font-medium truncate text-sm">
                    {user.name}
                    {user.role && <span className="text-muted-foreground font-normal"> ({user.role})</span>}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-accent/40 rounded-xl px-3 py-2">
          <div className="flex items-center gap-0.5 flex-shrink-0 pb-0.5">
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onImageUpload} />
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFileUpload} />

            <Popover>
              <PopoverTrigger asChild>
                <button className="hidden md:flex w-8 h-8 rounded-lg hover:bg-accent items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
                  <Icon name="Smile" size={18} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="top" align="start">
                <div className="grid grid-cols-5 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onMessageChange(messageText + emoji)}
                      className="text-xl hover:scale-110 transition-transform p-1.5 cursor-pointer rounded-md hover:bg-accent"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <button
              className="hidden md:flex w-8 h-8 rounded-lg hover:bg-accent items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
              onClick={() => imageInputRef.current?.click()}
            >
              <Icon name="Image" size={18} />
            </button>

            <button
              className="hidden md:flex w-8 h-8 rounded-lg hover:bg-accent items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="Paperclip" size={18} />
            </button>

            <Popover open={showAttachMenu} onOpenChange={setShowAttachMenu}>
              <PopoverTrigger asChild>
                <button className="md:hidden w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
                  <Icon name="Paperclip" size={18} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" side="top" align="start">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }}
                >
                  <Icon name="Image" size={16} />
                  <span>Фото</span>
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                >
                  <Icon name="File" size={16} />
                  <span>Файл</span>
                </button>
                <div className="border-t border-border/60 my-1" />
                <div className="grid grid-cols-5 gap-0.5 px-1 py-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { onMessageChange(messageText + emoji); setShowAttachMenu(false); }}
                      className="text-lg hover:scale-110 transition-transform p-1 cursor-pointer rounded-md hover:bg-accent"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Textarea
            ref={textareaRef}
            placeholder="Напишите сообщение..."
            value={messageText}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-0 shadow-none min-h-[36px] max-h-[120px] resize-none py-1.5 overflow-y-auto focus-visible:ring-0 text-sm placeholder:text-muted-foreground/50"
            rows={1}
          />

          <div className="flex items-center gap-0.5 flex-shrink-0 mb-0.5">
            {onScheduleMessage && (
              <>
                <Popover open={showScheduleDesktop} onOpenChange={setShowScheduleDesktop}>
                  <PopoverTrigger asChild>
                    <button
                      disabled={!messageText.trim() && attachments.length === 0}
                      className="hidden md:flex w-8 h-8 rounded-lg hover:bg-accent items-center justify-center transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Icon name="Clock" size={16} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" side="top" align="end">
                    <ScheduleMessagePicker
                      onSchedule={(date) => {
                        onScheduleMessage(date);
                        setShowScheduleDesktop(false);
                      }}
                      onClose={() => setShowScheduleDesktop(false)}
                    />
                  </PopoverContent>
                </Popover>

                <button
                  disabled={!messageText.trim() && attachments.length === 0}
                  className="md:hidden w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => setShowScheduleMobile(true)}
                >
                  <Icon name="Clock" size={16} />
                </button>

                {showScheduleMobile && (
                  <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowScheduleMobile(false)}>
                    <div className="w-full max-w-sm bg-card rounded-t-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
                      <ScheduleMessagePicker
                        onSchedule={(date) => {
                          onScheduleMessage(date);
                          setShowScheduleMobile(false);
                        }}
                        onClose={() => setShowScheduleMobile(false)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              onClick={flushAndSend}
              className="w-8 h-8 rounded-lg bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-colors"
            >
              <Icon name="ArrowUp" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;