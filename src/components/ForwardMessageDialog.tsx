import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Message } from '@/types/chat.types';
import { MentionableUser } from '@/components/MessageInput';

type ForwardMessageDialogProps = {
  open: boolean;
  onClose: () => void;
  message: Message | null;
  chats: Array<{ id: string; name: string; type: 'group' | 'private' }>;
  topics: Record<string, Array<{ id: string; name: string; icon: string }>>;
  currentChatId: string | null;
  currentTopicId: string | null;
  onForward: (targetChatId: string, targetTopicId?: string, comment?: string) => void;
  mentionableUsers?: MentionableUser[];
};

const ForwardMessageDialog = ({
  open,
  onClose,
  message,
  chats,
  topics,
  currentChatId,
  currentTopicId,
  onForward,
  mentionableUsers,
}: ForwardMessageDialogProps) => {
  const [activeTab, setActiveTab] = useState('topics');
  const [comment, setComment] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<{ chatId: string; topicId?: string; label: string } | null>(null);
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  if (!message) return null;

  const currentChat = chats.find(c => c.id === currentChatId);
  const currentTopics = currentChatId ? (topics[currentChatId] || []) : [];
  const hasTopics = currentChat?.type === 'group' && currentTopics.length > 0;

  const q = searchQuery.toLowerCase().trim();
  const filteredChats = q
    ? chats.filter(chat => {
        if (chat.name.toLowerCase().includes(q)) return true;
        const chatTopics = topics[chat.id] || [];
        return chatTopics.some(t => t.name.toLowerCase().includes(q));
      })
    : chats;

  const filteredMentionUsers = (mentionableUsers || []).filter(u =>
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleCommentChange = (value: string) => {
    setComment(value);
    if (!mentionableUsers || mentionableUsers.length === 0) return;
    const textarea = commentRef.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const textBefore = value.slice(0, cursorPos);
    const atMatch = textBefore.match(/@([^\s@]*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
      setMentionStartPos(cursorPos - atMatch[0].length);
      setSelectedMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery('');
      setMentionStartPos(-1);
    }
  };

  const insertMention = (user: MentionableUser) => {
    const before = comment.slice(0, mentionStartPos);
    const after = comment.slice(commentRef.current?.selectionStart || comment.length);
    const newText = `${before}@${user.name} ${after}`;
    setComment(newText);
    setShowMentions(false);
    setMentionQuery('');
    setMentionStartPos(-1);
    setTimeout(() => {
      if (commentRef.current) {
        const pos = before.length + user.name.length + 2;
        commentRef.current.selectionStart = pos;
        commentRef.current.selectionEnd = pos;
        commentRef.current.focus();
      }
    }, 0);
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => Math.min(prev + 1, filteredMentionUsers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentionUsers[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }
  };

  const handleSend = () => {
    if (!selectedTarget) return;
    onForward(selectedTarget.chatId, selectedTarget.topicId, comment.trim() || undefined);
    setComment('');
    setSelectedTarget(null);
    onClose();
  };

  const handleClose = () => {
    setComment('');
    setSelectedTarget(null);
    setExpandedChatId(null);
    setSearchQuery('');
    setShowMentions(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Переслать сообщение</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 px-3 py-2 bg-accent/50 rounded-lg border-l-2 border-primary">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-primary block">{message.sender}</span>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {message.text || 'Вложение'}
            </p>
            <span className="text-[10px] text-muted-foreground/60">{message.timestamp}</span>
          </div>
        </div>

        <div className="mt-1 relative">
          {showMentions && filteredMentionUsers.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-xl shadow-lg max-h-36 overflow-y-auto z-50">
              {filteredMentionUsers.map((user, idx) => (
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
                  <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">{user.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="font-medium truncate text-sm">{user.name}</span>
                </button>
              ))}
            </div>
          )}
          <Textarea
            ref={commentRef}
            placeholder={mentionableUsers?.length ? "Добавить подпись... (@ — упомянуть)" : "Добавить подпись (необязательно)"}
            value={comment}
            onChange={(e) => handleCommentChange(e.target.value)}
            onKeyDown={handleCommentKeyDown}
            className="min-h-[60px] max-h-[100px] resize-none text-sm"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-1">
          <TabsList className="w-full">
            <TabsTrigger value="topics" className="flex-1" disabled={!hasTopics}>
              В раздел
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex-1">
              В другой чат
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topics">
            {hasTopics ? (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {currentTopics.map(topic => {
                  const isCurrent = topic.id === currentTopicId;
                  const isSelected = selectedTarget?.topicId === topic.id;
                  return (
                    <button
                      key={topic.id}
                      disabled={isCurrent}
                      onClick={() => setSelectedTarget({ chatId: currentChatId!, topicId: topic.id, label: topic.name })}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-accent'
                      }`}
                    >
                      <Icon name={topic.icon} size={16} className="text-primary flex-shrink-0" />
                      <span className="font-medium truncate">{topic.name}</span>
                      {isCurrent && (
                        <span className="ml-auto text-[10px] text-muted-foreground">текущий</span>
                      )}
                      {isSelected && (
                        <Icon name="Check" size={16} className="ml-auto text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Icon name="FolderOpen" size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Нет доступных разделов</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="chats">
            <div className="relative mb-2">
              <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск по имени или группе..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {filteredChats.map(chat => {
                const isGroup = chat.type === 'group';
                const chatTopics = topics[chat.id] || [];
                const hasGroupTopics = isGroup && chatTopics.length > 0;
                const isExpanded = expandedChatId === chat.id;
                const isChatSelected = selectedTarget?.chatId === chat.id;
                const isDirectSelected = isChatSelected && !selectedTarget?.topicId;

                return (
                  <div key={chat.id}>
                    <button
                      onClick={() => {
                        if (hasGroupTopics) {
                          setExpandedChatId(isExpanded ? null : chat.id);
                        } else {
                          setSelectedTarget({ chatId: chat.id, label: chat.name });
                          setExpandedChatId(null);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isDirectSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon
                          name={isGroup ? 'Users' : 'User'}
                          size={16}
                          className="text-primary"
                        />
                      </div>
                      <span className="font-medium truncate">{chat.name}</span>
                      {chat.id === currentChatId && (
                        <span className="ml-auto text-[10px] text-muted-foreground">текущий</span>
                      )}
                      {isDirectSelected && (
                        <Icon name="Check" size={16} className="ml-auto text-primary" />
                      )}
                      {hasGroupTopics && (
                        <Icon
                          name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                          size={14}
                          className="ml-auto text-muted-foreground"
                        />
                      )}
                    </button>
                    {hasGroupTopics && isExpanded && (
                      <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-primary/20 pl-3">
                        {chatTopics.map(topic => {
                          const isTopicSelected = isChatSelected && selectedTarget?.topicId === topic.id;
                          return (
                            <button
                              key={topic.id}
                              onClick={() => setSelectedTarget({ chatId: chat.id, topicId: topic.id, label: `${chat.name} → ${topic.name}` })}
                              className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${
                                isTopicSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-accent'
                              }`}
                            >
                              <Icon name={topic.icon} size={14} className="text-primary flex-shrink-0" />
                              <span className="text-sm truncate">{topic.name}</span>
                              {isTopicSelected && (
                                <Icon name="Check" size={14} className="ml-auto text-primary" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredChats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Icon name={q ? 'SearchX' : 'MessageSquare'} size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">{q ? 'Ничего не найдено' : 'Нет доступных чатов'}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleSend}
          disabled={!selectedTarget}
          className="w-full mt-2 text-white"
          style={{ backgroundColor: '#3BA662' }}
        >
          <Icon name="Forward" size={16} className="mr-2" />
          {selectedTarget
            ? `Переслать в «${selectedTarget.label}»`
            : 'Выберите куда переслать'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardMessageDialog;
