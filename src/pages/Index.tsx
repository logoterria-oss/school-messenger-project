import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatArea } from '@/components/ChatArea';
import { MessageInput } from '@/components/MessageInput';
import { LoginScreen } from '@/components/LoginScreen';
import { ProfileSettings } from '@/components/ProfileSettings';
import { AppSettings } from '@/components/AppSettings';

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

type Topic = {
  id: string;
  name: string;
  icon: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
};

type GroupTopics = {
  [groupId: string]: Topic[];
};

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentView, setCurrentView] = useState<'chat' | 'profile' | 'settings'>('chat');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  
  const [groupTopics, setGroupTopics] = useState<GroupTopics>({
    '1': [
      { id: '1-important', name: 'Важное', icon: 'AlertCircle', lastMessage: 'Домашнее задание выполнено полностью', timestamp: '14:23', unread: 2 },
      { id: '1-zoom', name: 'Zoom', icon: 'Video', lastMessage: 'Ссылка на урок: zoom.us/j/123...', timestamp: '10:15', unread: 0 },
      { id: '1-homework', name: 'ДЗ', icon: 'BookOpen', lastMessage: 'Задание на завтра: страницы 45-50', timestamp: 'Вчера', unread: 1 },
      { id: '1-reports', name: 'Отчеты', icon: 'FileText', lastMessage: 'Отчет за неделю загружен', timestamp: '2 дня', unread: 0 },
      { id: '1-payment', name: 'Оплата', icon: 'CreditCard', lastMessage: 'Счет на месяц отправлен', timestamp: '3 дня', unread: 1 },
    ],
    '3': [
      { id: '3-important', name: 'Важное', icon: 'AlertCircle', lastMessage: 'Отличная работа на контрольной!', timestamp: 'Вчера', unread: 5 },
      { id: '3-zoom', name: 'Zoom', icon: 'Video', lastMessage: 'Занятие в 15:00', timestamp: 'Вчера', unread: 0 },
      { id: '3-homework', name: 'ДЗ', icon: 'BookOpen', lastMessage: 'Новое задание по математике', timestamp: '2 дня', unread: 0 },
      { id: '3-reports', name: 'Отчеты', icon: 'FileText', lastMessage: 'Отчет готов', timestamp: '3 дня', unread: 0 },
      { id: '3-payment', name: 'Оплата', icon: 'CreditCard', lastMessage: 'Оплачено', timestamp: '5 дней', unread: 0 },
    ],
  });
  
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({
    '1-important': [
      {
        id: '1',
        text: 'Внимание! Завтра контрольная работа по математике',
        sender: 'Учитель',
        timestamp: '14:20',
        isOwn: false,
      },
      {
        id: '2',
        text: 'Спасибо за напоминание! Петя готов.',
        sender: 'Вы',
        timestamp: '14:21',
        isOwn: true,
      },
      {
        id: '3',
        text: 'Домашнее задание выполнено полностью.',
        sender: 'Мама Иванова',
        timestamp: '14:23',
        isOwn: false,
        reactions: [
          { emoji: '👍', count: 2, users: ['Учитель', 'Администратор'] },
        ],
      },
    ],
    '1-zoom': [
      {
        id: '1',
        text: 'Ссылка на урок завтра в 10:00',
        sender: 'Учитель',
        timestamp: '10:15',
        isOwn: false,
      },
      {
        id: '2',
        text: 'https://zoom.us/j/123456789',
        sender: 'Учитель',
        timestamp: '10:15',
        isOwn: false,
      },
    ],
    '1-homework': [
      {
        id: '1',
        text: 'Задание на завтра: учебник страницы 45-50, упражнения 1-5',
        sender: 'Учитель',
        timestamp: 'Вчера',
        isOwn: false,
      },
      {
        id: '2',
        text: 'Понятно, спасибо!',
        sender: 'Вы',
        timestamp: 'Вчера',
        isOwn: true,
      },
    ],
    '1-reports': [
      {
        id: '1',
        text: 'Отчет за неделю: Петя активно участвует на уроках, все задания выполняет вовремя',
        sender: 'Учитель',
        timestamp: '2 дня',
        isOwn: false,
      },
    ],
    '1-payment': [
      {
        id: '1',
        text: 'Счет на декабрь: 15000 руб',
        sender: 'Администратор',
        timestamp: '3 дня',
        isOwn: false,
      },
      {
        id: '2',
        text: 'Когда нужно оплатить?',
        sender: 'Вы',
        timestamp: '3 дня',
        isOwn: true,
      },
      {
        id: '3',
        text: 'До 25 числа, пожалуйста',
        sender: 'Администратор',
        timestamp: '3 дня',
        isOwn: false,
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
    '3-important': [
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
    ],
    '3-zoom': [
      {
        id: '1',
        text: 'Ссылка на урок сегодня в 15:00',
        sender: 'Учитель',
        timestamp: 'Вчера',
        isOwn: false,
      },
      {
        id: '2',
        text: 'https://zoom.us/j/987654321',
        sender: 'Учитель',
        timestamp: 'Вчера',
        isOwn: false,
      },
    ],
    '3-homework': [
      {
        id: '1',
        text: 'Новое задание по математике: решить задачи №10-15 на стр. 67',
        sender: 'Учитель математики',
        timestamp: '2 дня',
        isOwn: false,
      },
    ],
    '3-reports': [
      {
        id: '1',
        text: 'Отчет готов. Мария показывает отличные результаты!',
        sender: 'Учитель',
        timestamp: '3 дня',
        isOwn: false,
      },
    ],
    '3-payment': [
      {
        id: '1',
        text: 'Оплата за ноябрь получена. Спасибо!',
        sender: 'Администратор',
        timestamp: '5 дней',
        isOwn: false,
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

  const messages = selectedTopic 
    ? (chatMessages[selectedTopic] || []) 
    : selectedChat 
    ? (chatMessages[selectedChat] || []) 
    : [];

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
    const chat = chats.find(c => c.id === chatId);
    setSelectedChat(chatId);
    
    if (chat && chat.type === 'group') {
      setSelectedGroup(chatId);
      const topics = groupTopics[chatId];
      if (topics && topics.length > 0) {
        setSelectedTopic(topics[0].id);
      }
    } else {
      setSelectedGroup(null);
      setSelectedTopic(null);
    }
    
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId ? { ...chat, unread: 0 } : chat
      )
    );
  };

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopic(topicId);
    
    if (selectedGroup) {
      setGroupTopics(prev => ({
        ...prev,
        [selectedGroup]: prev[selectedGroup].map(topic =>
          topic.id === topicId ? { ...topic, unread: 0 } : topic
        )
      }));
    }
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
    setCurrentView('chat');
    setSelectedChat(null);
    setSelectedGroup(null);
    setSelectedTopic(null);
    setMessageText('');
    setAttachments([]);
  };

  const handleOpenProfile = () => {
    setCurrentView('profile');
  };

  const handleOpenSettings = () => {
    setCurrentView('settings');
  };

  const handleBackToChat = () => {
    setCurrentView('chat');
    setSelectedGroup(null);
    setSelectedTopic(null);
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

  if (currentView === 'profile') {
    return (
      <div className="flex h-screen bg-background">
        <ProfileSettings userRole={userRole} onBack={handleBackToChat} />
      </div>
    );
  }

  if (currentView === 'settings') {
    return (
      <div className="flex h-screen bg-background">
        <AppSettings onBack={handleBackToChat} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        onLogout={handleLogout}
        onOpenProfile={handleOpenProfile}
        onOpenSettings={handleOpenSettings} 
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
              isGroup={selectedGroup !== null}
              topics={selectedGroup ? groupTopics[selectedGroup] : undefined}
              selectedTopic={selectedTopic || undefined}
              onTopicSelect={handleSelectTopic}
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