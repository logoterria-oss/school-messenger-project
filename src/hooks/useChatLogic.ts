import { useState, useEffect } from 'react';
import { UserRole, AttachedFile, Message, Chat, GroupTopics } from '@/types/chat.types';
import { initialGroupTopics, initialChatMessages } from '@/data/mockChatData';
import { teacherAccounts } from '@/data/teacherAccounts';
import { testAccounts } from '@/data/testAccounts';

type User = {
  id: string;
  name: string;
  role: 'teacher' | 'parent' | 'student';
  phone: string;
  email?: string;
  password: string;
};

const loadUsersFromStorage = (): User[] => {
  // Принудительно очищаем кеш и пересобираем список пользователей
  localStorage.removeItem('allUsers');
  
  const teachers = teacherAccounts.map((teacher, index) => ({
    id: `teacher-${index}`,
    name: teacher.name,
    role: 'teacher' as const,
    phone: teacher.phone,
    email: teacher.email,
    password: teacher.password,
  }));
  
  const testUsers = testAccounts.map(account => ({
    id: account.id,
    name: account.name,
    role: account.role,
    phone: account.phone,
    email: account.email,
    password: account.password,
  }));
  
  const allUsers = [...teachers, ...testUsers];
  localStorage.setItem('allUsers', JSON.stringify(allUsers));
  return allUsers;
};

const loadChatsFromStorage = (): Chat[] => {
  const stored = localStorage.getItem('chats');
  return stored ? JSON.parse(stored) : [];
};

const loadGroupTopicsFromStorage = (): GroupTopics => {
  const stored = localStorage.getItem('groupTopics');
  return stored ? JSON.parse(stored) : initialGroupTopics;
};

export const useChatLogic = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    const stored = localStorage.getItem('userRole');
    return stored as UserRole | null;
  });
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('userName') || '';
  });
  const [currentView, setCurrentView] = useState<'chat' | 'profile' | 'settings' | 'users'>('chat');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [chats, setChats] = useState<Chat[]>(loadChatsFromStorage);
  const [groupTopics, setGroupTopics] = useState<GroupTopics>(loadGroupTopicsFromStorage);
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>(initialChatMessages);
  const [allUsers, setAllUsers] = useState<User[]>(loadUsersFromStorage);
  // Список пользователей, которые сейчас печатают (кроме текущего)
  // TODO: Интеграция с WebSocket/сервером для получения данных о печатающих пользователях
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messages = selectedTopic 
    ? (chatMessages[selectedTopic] || []) 
    : selectedChat 
    ? (chatMessages[selectedChat] || []) 
    : [];

  useEffect(() => {
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('groupTopics', JSON.stringify(groupTopics));
  }, [groupTopics]);

  useEffect(() => {
    setChats(prevChats =>
      prevChats.map(chat => {
        if (chat.type === 'group' && groupTopics[chat.id]) {
          const totalUnread = groupTopics[chat.id].reduce(
            (sum, topic) => sum + topic.unread,
            0
          );
          return { ...chat, unread: totalUnread };
        }
        return chat;
      })
    );
  }, [groupTopics]);

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
    
    const targetId = selectedTopic || selectedChat;
    const messageId = Date.now().toString();
    
    const newMessage: Message = {
      id: messageId,
      text: messageText || undefined,
      sender: 'Вы',
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      attachments: attachments.length > 0 ? attachments : undefined,
      status: 'sending',
    };
    
    setChatMessages(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), newMessage]
    }));
    setMessageText('');
    setAttachments([]);

    setTimeout(() => {
      setChatMessages(prev => ({
        ...prev,
        [targetId]: prev[targetId].map(msg => 
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        )
      }));
    }, 500);

    setTimeout(() => {
      setChatMessages(prev => ({
        ...prev,
        [targetId]: prev[targetId].map(msg => 
          msg.id === messageId ? { ...msg, status: 'delivered' } : msg
        )
      }));
    }, 1000);

    setTimeout(() => {
      setChatMessages(prev => ({
        ...prev,
        [targetId]: prev[targetId].map(msg => 
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        )
      }));
    }, 2000);
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

  const handleLogin = (role: UserRole, name?: string) => {
    setUserRole(role);
    setUserName(name || '');
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
    localStorage.setItem('userName', name || '');
    
    // Инициализация тестовых групп для родителя и ученика
    if (role === 'parent' || role === 'student') {
      const existingChats = loadChatsFromStorage();
      const hasTestGroup = existingChats.some(chat => chat.id === 'test-group-1');
      
      if (!hasTestGroup) {
        const testGroupChat: Chat = {
          id: 'test-group-1',
          name: 'Тестовая группа',
          type: 'group',
          lastMessage: 'Добро пожаловать в тестовую группу!',
          lastTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          avatar: 'https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg',
        };
        
        const newChats = [...existingChats, testGroupChat];
        setChats(newChats);
        localStorage.setItem('chats', JSON.stringify(newChats));
        
        // Создаем топики для группы
        const testTopics = [
          {
            id: 'test-topic-1',
            name: 'Общие вопросы',
            icon: 'MessageCircle',
            unread: 0,
          },
          {
            id: 'test-topic-2',
            name: 'Домашние задания',
            icon: 'BookOpen',
            unread: 0,
          }
        ];
        
        const newGroupTopics = {
          ...loadGroupTopicsFromStorage(),
          'test-group-1': testTopics
        };
        setGroupTopics(newGroupTopics);
        localStorage.setItem('groupTopics', JSON.stringify(newGroupTopics));
        
        // Создаем приветственные сообщения
        const welcomeMessages: Message[] = [
          {
            id: 'welcome-1',
            text: 'Добро пожаловать в тестовую группу! Здесь собраны педагог, админ, родители и ученики.',
            sender: 'Виктория Абрамова',
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            isOwn: false,
          },
          {
            id: 'welcome-2',
            text: 'Здесь мы можем обсуждать учебные вопросы и делиться новостями.',
            sender: 'Анна Ковалева',
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            isOwn: false,
          }
        ];
        
        setChatMessages(prev => ({
          ...prev,
          'test-topic-1': welcomeMessages
        }));
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName('');
    setCurrentView('chat');
    setSelectedChat(null);
    setSelectedGroup(null);
    setSelectedTopic(null);
    setMessageText('');
    setAttachments([]);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
  };

  const handleOpenProfile = () => {
    setCurrentView('profile');
  };

  const handleOpenSettings = () => {
    setCurrentView('settings');
  };

  const handleOpenUsers = () => {
    setCurrentView('users');
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

  const handleAddStudent = (name: string, phone: string, password: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      phone,
      password,
      role: 'student',
    };
    setAllUsers(prev => [...prev, newUser]);
  };

  const handleAddParent = (name: string, phone: string, email: string, password: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      phone,
      email,
      password,
      role: 'parent',
    };
    setAllUsers(prev => [...prev, newUser]);
  };

  const handleCreateGroup = (groupName: string, selectedUserIds: string[]) => {
    const newGroup: Chat = {
      id: Date.now().toString(),
      name: groupName,
      lastMessage: '',
      timestamp: 'Сейчас',
      unread: 0,
      type: 'group',
    };
    setChats(prev => [newGroup, ...prev]);
    setGroupTopics(prev => ({
      ...prev,
      [newGroup.id]: [
        { id: `${newGroup.id}-important`, name: 'Важное', icon: 'AlertCircle', lastMessage: '', timestamp: '', unread: 0 },
        { id: `${newGroup.id}-zoom`, name: 'Zoom', icon: 'Video', lastMessage: '', timestamp: '', unread: 0 },
        { id: `${newGroup.id}-homework`, name: 'ДЗ', icon: 'BookOpen', lastMessage: '', timestamp: '', unread: 0 },
        { id: `${newGroup.id}-reports`, name: 'Отчеты', icon: 'FileText', lastMessage: '', timestamp: '', unread: 0 },
        { id: `${newGroup.id}-payment`, name: 'Оплата', icon: 'CreditCard', lastMessage: '', timestamp: '', unread: 0 },
        { id: `${newGroup.id}-cancellation`, name: 'Отмена занятий', icon: 'XCircle', lastMessage: '', timestamp: '', unread: 0 },
      ]
    }));
    console.log('Создана группа с участниками:', selectedUserIds);
  };

  const handleTyping = (text: string) => {
    setMessageText(text);
    
    // TODO: Отправить событие на сервер о том, что текущий пользователь печатает
    // Пример: socket.emit('typing', { chatId: selectedChat, userName: userName });
    // Сервер должен рассылать это событие другим участникам чата
    // Другие участники получат событие и добавят userName в свой список typingUsers
  };

  return {
    isAuthenticated,
    userRole,
    userName,
    currentView,
    selectedChat,
    selectedGroup,
    selectedTopic,
    messageText,
    attachments,
    chats,
    groupTopics,
    messages,
    allUsers,
    typingUsers,
    setMessageText,
    handleTyping,
    handleSelectChat,
    handleSelectTopic,
    handleSendMessage,
    handleFileUpload,
    handleImageUpload,
    removeAttachment,
    handleLogin,
    handleLogout,
    handleOpenProfile,
    handleOpenSettings,
    handleOpenUsers,
    handleBackToChat,
    handleReaction,
    handleAddStudent,
    handleAddParent,
    handleCreateGroup,
  };
};