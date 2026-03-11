import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  onForward: (targetChatId: string, targetTopicId?: string) => void;
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

  if (!message) return null;

  const currentChat = chats.find(c => c.id === currentChatId);
  const currentTopics = currentChatId ? (topics[currentChatId] || []) : [];
  const hasTopics = currentChat?.type === 'group' && currentTopics.length > 0;

  const handleForwardToTopic = (topicId: string) => {
    if (currentChatId) {
      onForward(currentChatId, topicId);
    }
    onClose();
  };

  const handleForwardToChat = (chatId: string) => {
    onForward(chatId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
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
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {currentTopics.map(topic => (
                  <button
                    key={topic.id}
                    disabled={topic.id === currentTopicId}
                    onClick={() => handleForwardToTopic(topic.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon name={topic.icon} size={16} className="text-primary flex-shrink-0" />
                    <span className="font-medium truncate">{topic.name}</span>
                    {topic.id === currentTopicId && (
                      <span className="ml-auto text-[10px] text-muted-foreground">текущий</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Icon name="FolderOpen" size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Нет доступных разделов</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="chats">
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => handleForwardToChat(chat.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-accent"
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
                </button>
              ))}
              {chats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Icon name="MessageSquare" size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">Нет доступных чатов</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardMessageDialog;