import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatArea } from '@/components/ChatArea';
import { MessageInput } from '@/components/MessageInput';
import { LoginScreen } from '@/components/LoginScreen';

type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

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

type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  type: 'group' | 'private';
};

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({
    '1': [
      {
        id: '1',
        text: 'Здравствуйте! Как успехи Пети?',
        sender: 'Мама Иванова',
        timestamp: '14:20',
        isOwn: false,
      },
      {
        id: '2',
        text: 'Добрый день! Петя хорошо справляется с программой.',
        sender: 'Вы',
        timestamp: '14:21',
        isOwn: true,
      },
      {
        id: '3',
        text: 'Вот фото с урока',
        attachments: [{
          type: 'image',
          fileUrl: 'https://cdn.poehali.dev/files/WhatsApp%20Image%202025-11-04%20at%2017.17.39.jpeg',
        }],
        sender: 'Мама Иванова',
        timestamp: '14:22',
        isOwn: false,
      },
      {
        id: '4',
        text: 'Домашнее задание выполнено полностью.',
        sender: 'Мама Иванова',
        timestamp: '14:23',
        isOwn: false,
        reactions: [
          { emoji: '👍', count: 2, users: ['Учитель', 'Администратор'] },
          { emoji: '❤️', count: 1, users: ['Вы'] },
        ],
      },
    ],
    '2': [
      {
        id: '1',
        text: 'Добрый день! Хотела уточнить по расписанию',
        sender: 'Мама Петрова Анна',
        timestamp: '13:40',
        isOwn: false,
      },
      {
        id: '2',
        text: 'Здравствуйте! Расписание не изменилось, всё по плану',
        sender: 'Вы',
        timestamp: '13:43',
        isOwn: true,
      },
      {
        id: '3',
        text: 'Спасибо за информацию',
        sender: 'Мама Петрова Анна',
        timestamp: '13:45',
        isOwn: false,
      },
    ],
    '3': [
      {
        id: '1',
        text: 'Отличная работа на контрольной!',
        sender: 'Учитель математики',
        timestamp: 'Вчера',
        isOwn: false,
      },
      {
        id: '2',
        text: 'Спасибо большое!',
        sender: 'Мама Смирнова',
        timestamp: 'Вчера',
        isOwn: false,
        reactions: [
          { emoji: '👍', count: 1, users: ['Учитель математики'] },
        ],
      },
      {
        id: '3',
        text: 'Привет! Это тестовое сообщение из нового диалога 👋',
        sender: 'Вы',
        timestamp: '16:20',
        isOwn: true,
      },
    ],
    '4': [
      {
        id: '1',
        text: 'Здравствуйте! Я новый родитель, хотел бы обсудить успеваемость моего ребёнка.',
        sender: 'Папа Ковалёв Дмитрий',
        timestamp: '16:25',
        isOwn: false,
      },
    ],
  });

  const messages = selectedChat ? (chatMessages[selectedChat] || []) : [];

  useEffect(() => {
    setChats([
      {
        id: '4',
        name: 'Папа Ковалёв Дмитрий',
        lastMessage: 'Здравствуйте! Я новый родитель...',
        timestamp: '16:25',
        unread: 1,
        type: 'private',
      },
      {
        id: '1',
        name: 'Группа: Иванов Пётр',
        lastMessage: 'Домашнее задание выполнено',
        timestamp: '14:23',
        unread: 2,
        type: 'group',
      },
      {
        id: '2',
        name: 'Мама Петрова Анна',
        lastMessage: 'Спасибо за информацию',
        timestamp: '13:45',
        unread: 0,
        type: 'private',
      },
      {
        id: '3',
        name: 'Группа: Смирнова Мария',
        lastMessage: 'Учитель математики: Отличная работа!',
        timestamp: 'Вчера',
        unread: 5,
        type: 'group',
      },
    ]);
  }, []);

  const handleSelectChat = (chatId: string) => {
    setSelectedChat(chatId);
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId ? { ...chat, unread: 0 } : chat
      )
    );
  };

  const handleSendMessage = () => {
    if (!selectedChat || (!messageText.trim() && attachments.length === 0)) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText || undefined,
      sender: 'Вы',
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    
    setChatMessages(prev => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), newMessage]
    }));
    setMessageText('');
    setAttachments([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newAttachments: AttachedFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        newAttachments.push({
          type: 'file',
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(0)} KB`,
        });
      }
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    if (event.target) event.target.value = '';
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newAttachment: AttachedFile = {
            type: 'image',
            fileUrl: e.target?.result as string,
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      });
    }
    if (event.target) event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setSelectedChat(null);
    setMessageText('');
    setAttachments([]);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!selectedChat) return;
    
    setChatMessages(prev => ({
      ...prev,
      [selectedChat]: (prev[selectedChat] || []).map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find(r => r.emoji === emoji);
          
          if (existingReaction) {
            if (existingReaction.users.includes('Вы')) {
              return {
                ...msg,
                reactions: reactions
                  .map(r => r.emoji === emoji 
                    ? { ...r, count: r.count - 1, users: r.users.filter(u => u !== 'Вы') }
                    : r
                  )
                  .filter(r => r.count > 0)
              };
            } else {
              return {
                ...msg,
                reactions: reactions.map(r => 
                  r.emoji === emoji 
                    ? { ...r, count: r.count + 1, users: [...r.users, 'Вы'] }
                    : r
                )
              };
            }
          } else {
            return {
              ...msg,
              reactions: [...reactions, { emoji, count: 1, users: ['Вы'] }]
            };
          }
        }
        return msg;
      })
    }));
  };

  if (!isAuthenticated || !userRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        onLogout={handleLogout} 
        userRole={userRole}
        chats={chats}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
      />

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <ChatArea 
              messages={messages}
              onReaction={handleReaction}
              chatName={chats.find(c => c.id === selectedChat)?.name || ''}
            />
            <MessageInput 
              messageText={messageText}
              attachments={attachments}
              onMessageChange={setMessageText}
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              onImageUpload={handleImageUpload}
              onRemoveAttachment={removeAttachment}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-accent/20">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Icon name="MessageSquare" size={36} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-medium mb-1">
                  Выберите чат
                </h2>
                <p className="text-sm text-muted-foreground">
                  Начните общение с педагогами и родителями
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;