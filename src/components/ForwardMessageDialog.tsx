import { useState } from 'react';
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

type ForwardMessageDialogProps = {
  open: boolean;
  onClose: () => void;
  message: Message | null;
  chats: Array<{ id: string; name: string; type: 'group' | 'private' }>;
  topics: Record<string, Array<{ id: string; name: string; icon: string }>>;
  currentChatId: string | null;
  currentTopicId: string | null;
  onForward: (targetChatId: string, targetTopicId?: string, comment?: string) => void;
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
}: ForwardMessageDialogProps) => {
  const [activeTab, setActiveTab] = useState('topics');
  const [comment, setComment] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<{ chatId: string; topicId?: string; label: string } | null>(null);

  if (!message) return null;

  const currentChat = chats.find(c => c.id === currentChatId);
  const currentTopics = currentChatId ? (topics[currentChatId] || []) : [];
  const hasTopics = currentChat?.type === 'group' && currentTopics.length > 0;

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

        <div className="mt-1">
          <Textarea
            placeholder="Добавить подпись (необязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
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
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {chats.map(chat => {
                const isSelected = selectedTarget?.chatId === chat.id && !selectedTarget?.topicId;
                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedTarget({ chatId: chat.id, label: chat.name })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-accent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon
                        name={chat.type === 'group' ? 'Users' : 'User'}
                        size={16}
                        className="text-primary"
                      />
                    </div>
                    <span className="font-medium truncate">{chat.name}</span>
                    {chat.id === currentChatId && (
                      <span className="ml-auto text-[10px] text-muted-foreground">текущий</span>
                    )}
                    {isSelected && (
                      <Icon name="Check" size={16} className="ml-auto text-primary" />
                    )}
                  </button>
                );
              })}
              {chats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Icon name="MessageSquare" size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">Нет доступных чатов</p>
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
