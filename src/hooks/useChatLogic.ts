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
  avatar?: string;
  availableSlots?: string[];
  educationDocs?: string[];
};

const loadUsersFromStorage = (): User[] => {
  const VERSION = 'v4-fix-dynamic-teachers';
  const storedVersion = localStorage.getItem('usersVersion');
  const stored = localStorage.getItem('allUsers');
  
  if (stored && storedVersion === VERSION) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored users', e);
    }
  }
  
  const teachers = teacherAccounts.map((teacher, index) => ({
    id: `teacher-${index}`,
    name: teacher.name,
    role: 'teacher' as const,
    phone: teacher.phone,
    email: teacher.email,
    password: teacher.password,
    avatar: 'https://cdn.poehali.dev/files/Педагог.jpg',
  }));
  
  const testUsers = testAccounts.map(account => ({
    id: account.id,
    name: account.name,
    role: account.role,
    phone: account.phone,
    email: account.email,
    password: account.password,
    avatar: account.avatar,
  }));
  
  const allUsers = [...teachers, ...testUsers];
  localStorage.setItem('allUsers', JSON.stringify(allUsers));
  localStorage.setItem('usersVersion', VERSION);
  
  // ВАЖНО: При смене версии пользователей очищаем чаты
  localStorage.removeItem('chats');
  localStorage.removeItem('chatsMigration');
  
  return allUsers;
};

const loadChatsFromStorage = (): Chat[] => {
  const MIGRATION_VERSION = 'v5-fix-teacher-avatars';
  const migrationDone = localStorage.getItem('chatsMigration');
  
  // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА: удаляем все чаты при новой миграции
  if (migrationDone !== MIGRATION_VERSION) {
    localStorage.removeItem('chats');
    localStorage.setItem('chatsMigration', MIGRATION_VERSION);
    return [];
  }
  
  const stored = localStorage.getItem('chats');
  if (!stored) return [];
  
  return JSON.parse(stored);
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
  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem('userId') || '';
  });
  const [currentView, setCurrentView] = useState<'chat' | 'profile' | 'settings' | 'users'>('chat');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [chats, setChats] = useState<Chat[]>(() => {
    const storedChats = loadChatsFromStorage();
    const currentUserRole = localStorage.getItem('userRole');
    const currentUserName = localStorage.getItem('userName');
    
    // Фильтруем чаты сразу при загрузке для педагогов
    let filteredChats = storedChats;
    
    if (currentUserRole === 'teacher') {
      const allUsers = loadUsersFromStorage();
      
      filteredChats = storedChats.filter(chat => {
        // Оставляем все групповые чаты
        if (chat.type === 'group') return true;
        
        // Для приватных чатов
        if (chat.type === 'private') {
          // Проверяем по имени - если это другой педагог, удаляем
          const isOtherTeacher = allUsers.some(u => 
            u.role === 'teacher' && 
            u.name === chat.name && 
            u.name !== currentUserName
          );
          if (isOtherTeacher) return false;
          
          // Проверяем по participants
          const participants = chat.participants || [];
          if (participants.length > 0) {
            const hasAdmin = participants.includes('admin');
            const allAreTeachers = participants.every(id => 
              allUsers.find(u => u.id === id && u.role === 'teacher')
            );
            
            // Удаляем если все педагоги и нет админа
            if (allAreTeachers && !hasAdmin) return false;
          }
          
          // Оставляем чат только если это админ
          return chat.name === 'Виктория Абраменко' || chat.id.includes('admin');
        }
        
        return true;
      });
    }
    
    // Миграция: обновляем аватары
    const chatsWithAvatars = filteredChats.map(chat => {
      if (chat.id === 'teachers-group') {
        return { ...chat, avatar: 'https://cdn.poehali.dev/files/6c04fc1dc8efff47815dc84d1e41d67b_964f0b0a-ab13-4528-8458-3898a259a3ac.jpg' };
      }
      
      if (chat.avatar) return chat;
      
      if (chat.type === 'private' && chat.id.includes('admin')) {
        return { ...chat, avatar: 'https://cdn.poehali.dev/files/Админ.jpg' };
      }
      
      if (chat.type === 'group' && chat.id !== 'teachers-group') {
        return { ...chat, avatar: 'https://cdn.poehali.dev/files/Ученик.jpg' };
      }
      
      return chat;
    });
    
    // Сохраняем очищенные чаты
    if (currentUserRole === 'teacher' && chatsWithAvatars.length !== storedChats.length) {
      localStorage.setItem('chats', JSON.stringify(chatsWithAvatars));
    }
    
    return chatsWithAvatars;
  });
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

  // Автоматически выбираем чат для родителей и учеников при загрузке
  useEffect(() => {
    if (isAuthenticated && (userRole === 'parent' || userRole === 'student')) {
      const existingChats = loadChatsFromStorage();
      const testGroup = existingChats.find(chat => chat.id === 'test-group-1');
      
      if (testGroup && !selectedChat) {
        setSelectedChat('test-group-1');
        setSelectedGroup('test-group-1');
        const topics = loadGroupTopicsFromStorage()['test-group-1'];
        if (topics && topics.length > 0) {
          setSelectedTopic(topics[0].id);
        }
      }
    }
  }, [isAuthenticated, userRole, selectedChat]);

  // Миграция: сохраняем обновленные чаты при первой загрузке
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('chats', JSON.stringify(chats));
    }
  }, []);

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
    
    const currentUserId = role === 'admin' ? 'admin' : allUsers.find(u => u.name === name && u.role === role)?.id || '';
    setUserId(currentUserId);
    
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
    localStorage.setItem('userName', name || '');
    localStorage.setItem('userId', currentUserId);
    
    let existingChats = loadChatsFromStorage();
    
    // Создание закрепленных чатов для педагогов
    if (role === 'teacher') {
      const currentUserId = allUsers.find(u => u.name === name && u.role === 'teacher')?.id;
      
      // ВАЖНО: Удаляем старые неправильные чаты (педагог-педагог)
      existingChats = existingChats.filter(chat => {
        // Оставляем все групповые чаты
        if (chat.type === 'group') return true;
        
        // Для приватных чатов проверяем участников
        if (chat.type === 'private') {
          const participants = chat.participants || [];
          
          // Если нет поля participants - удаляем (старые чаты)
          if (participants.length === 0) {
            // Проверяем по имени чата - если это другой педагог, удаляем
            const isTeacherChat = teacherAccounts.some(t => t.name === chat.name);
            if (isTeacherChat) return false;
          }
          
          // Если есть participants - проверяем что это НЕ два педагога между собой
          if (participants.length > 0) {
            const isAdminInChat = participants.includes('admin');
            const allParticipantsAreTeachers = participants.every(id => 
              allUsers.find(u => u.id === id && u.role === 'teacher')
            );
            
            // Удаляем если все участники педагоги И нет админа
            if (allParticipantsAreTeachers && !isAdminInChat) {
              return false;
            }
          }
          
          return true;
        }
        
        return true;
      });
      
      // 1. Чат "Педагоги" (групповой чат всех педагогов)
      const teachersGroupId = 'teachers-group';
      const hasTeachersGroup = existingChats.some(chat => chat.id === teachersGroupId);
      
      if (!hasTeachersGroup) {
        const allTeacherIds = allUsers.filter(u => u.role === 'teacher').map(u => u.id);
        const teachersGroupChat: Chat = {
          id: teachersGroupId,
          name: 'Педагоги',
          type: 'group',
          lastMessage: 'Общий чат педагогов',
          timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          participants: [...allTeacherIds, 'admin'],
          isPinned: true,
          avatar: 'https://cdn.poehali.dev/files/6c04fc1dc8efff47815dc84d1e41d67b_964f0b0a-ab13-4528-8458-3898a259a3ac.jpg',
        };
        existingChats.unshift(teachersGroupChat);
      }
      
      // 2. Личный чат с админом (у педагога чат называется "Виктория Абраменко")
      const adminChatId = `private-${currentUserId}-admin`;
      let adminChatExists = false;
      
      // Обновляем существующий чат или создаем новый
      existingChats = existingChats.map(chat => {
        if (chat.id === adminChatId) {
          adminChatExists = true;
          return {
            ...chat,
            name: 'Виктория Абраменко', // Исправляем имя
            avatar: 'https://cdn.poehali.dev/files/Админ.jpg', // Исправляем аватар
            participants: [currentUserId, 'admin'],
          };
        }
        return chat;
      });
      
      if (!adminChatExists && currentUserId) {
        const adminChat: Chat = {
          id: adminChatId,
          name: 'Виктория Абраменко',
          type: 'private',
          lastMessage: '',
          timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          participants: [currentUserId, 'admin'],
          isPinned: true,
          avatar: 'https://cdn.poehali.dev/files/Админ.jpg',
        };
        existingChats.unshift(adminChat);
      }
      
      setChats(existingChats);
      localStorage.setItem('chats', JSON.stringify(existingChats));
    }
    
    // Создание закрепленных чатов для админа
    if (role === 'admin') {
      // 1. Чат "Педагоги" (групповой чат всех педагогов + админ)
      const teachersGroupId = 'teachers-group';
      const hasTeachersGroup = existingChats.some(chat => chat.id === teachersGroupId);
      
      if (!hasTeachersGroup) {
        const allTeacherIds = allUsers.filter(u => u.role === 'teacher').map(u => u.id);
        const teachersGroupChat: Chat = {
          id: teachersGroupId,
          name: 'Педагоги',
          type: 'group',
          lastMessage: 'Общий чат педагогов',
          timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          participants: [...allTeacherIds, 'admin'],
          isPinned: true,
          avatar: 'https://cdn.poehali.dev/files/6c04fc1dc8efff47815dc84d1e41d67b_964f0b0a-ab13-4528-8458-3898a259a3ac.jpg',
        };
        existingChats.unshift(teachersGroupChat);
      }
      
      // 2. Личные чаты с каждым педагогом (для админа чат называется по имени педагога)
      const teachers = allUsers.filter(u => u.role === 'teacher');
      teachers.forEach(teacher => {
        const privateChatId = `private-${teacher.id}-admin`;
        const hasPrivateChat = existingChats.some(chat => chat.id === privateChatId);
        
        if (!hasPrivateChat) {
          const privateChat: Chat = {
            id: privateChatId,
            name: teacher.name, // У админа чат называется по имени педагога
            type: 'private',
            lastMessage: '',
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            participants: [teacher.id, 'admin'],
            isPinned: true,
            avatar: teacher.avatar || 'https://cdn.poehali.dev/files/Педагог.jpg', // Аватар педагога
          };
          existingChats.unshift(privateChat);
        }
      });
      
      setChats(existingChats);
      localStorage.setItem('chats', JSON.stringify(existingChats));
    }
    
    // Инициализация тестовых групп для родителя и ученика
    if (role === 'parent' || role === 'student') {
      const existingChats = loadChatsFromStorage();
      const hasTestGroup = existingChats.some(chat => chat.id === 'test-group-1');
      
      if (!hasTestGroup) {
        // Название чата зависит от роли
        const chatName = role === 'student' 
          ? `${name || 'Ученик'}` 
          : role === 'parent'
          ? `Группа: ${name || 'Родитель'}`
          : 'Тестовая группа';
        
        // Находим ID текущего пользователя по имени и роли
        const currentUserId = allUsers.find(u => u.name === name && u.role === role)?.id;
        
        // Для родителя находим связанного ученика, для ученика — родителя
        const linkedUser = allUsers.find(u => {
          if (role === 'parent' && u.role === 'student') {
            // Ищем ученика, связанного с этим родителем
            return testAccounts.find(acc => acc.id === currentUserId)?.linkedTo?.includes(u.id);
          } else if (role === 'student' && u.role === 'parent') {
            // Ищем родителя, связанного с этим учеником
            return testAccounts.find(acc => acc.id === currentUserId)?.linkedTo?.includes(u.id);
          }
          return false;
        });
        
        // Собираем участников: текущий пользователь + связанный + все учителя + админ
        const teachers = allUsers.filter(u => u.role === 'teacher').map(u => u.id);
        const participantIds = [
          currentUserId,
          linkedUser?.id,
          ...teachers,
          'admin'
        ].filter(Boolean) as string[];
        
        const testGroupChat: Chat = {
          id: 'test-group-1',
          name: chatName,
          type: 'group',
          lastMessage: 'Добро пожаловать в тестовую группу!',
          lastTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          avatar: 'https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg',
          participants: participantIds,
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
        
        // Автоматически выбираем группу для родителей и учеников
        setSelectedChat('test-group-1');
        setSelectedGroup('test-group-1');
        setSelectedTopic('test-topic-1');
      } else {
        // Если группа уже есть, обновляем participants для текущего пользователя
        const currentUserId = allUsers.find(u => u.name === name && u.role === role)?.id;
        
        const linkedUser = allUsers.find(u => {
          if (role === 'parent' && u.role === 'student') {
            return testAccounts.find(acc => acc.id === currentUserId)?.linkedTo?.includes(u.id);
          } else if (role === 'student' && u.role === 'parent') {
            return testAccounts.find(acc => acc.id === currentUserId)?.linkedTo?.includes(u.id);
          }
          return false;
        });
        
        const teachers = allUsers.filter(u => u.role === 'teacher').map(u => u.id);
        const participantIds = [
          currentUserId,
          linkedUser?.id,
          ...teachers,
          'admin'
        ].filter(Boolean) as string[];
        
        // Обновляем существующий чат с новыми participants
        const updatedChats = existingChats.map(chat => 
          chat.id === 'test-group-1' 
            ? { ...chat, participants: participantIds }
            : chat
        );
        setChats(updatedChats);
        localStorage.setItem('chats', JSON.stringify(updatedChats));
        
        setSelectedChat('test-group-1');
        setSelectedGroup('test-group-1');
        const existingTopics = loadGroupTopicsFromStorage()['test-group-1'];
        if (existingTopics && existingTopics.length > 0) {
          setSelectedTopic(existingTopics[0].id);
        }
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

  const handleAddTeacher = (name: string, phone: string, email: string, password: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      phone,
      email,
      password,
      role: 'teacher',
      avatar: 'https://cdn.poehali.dev/files/Педагог.jpg',
    };
    setAllUsers(prev => [...prev, newUser]);
    
    // Автоматически добавляем нового педагога во все существующие группы
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.type === 'group' && chat.participants) {
          return {
            ...chat,
            participants: [...chat.participants, newUser.id]
          };
        }
        return chat;
      });
      
      // Создаем личный чат нового педагога с админом (если мы админ)
      if (userRole === 'admin') {
        const privateChatId = `private-${newUser.id}-admin`;
        const hasPrivateChat = updatedChats.some(chat => chat.id === privateChatId);
        
        if (!hasPrivateChat) {
          const privateChat: Chat = {
            id: privateChatId,
            name: newUser.name,
            type: 'private',
            lastMessage: '',
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            participants: [newUser.id, 'admin'],
            isPinned: true,
            avatar: newUser.avatar || 'https://cdn.poehali.dev/files/Педагог.jpg',
          };
          updatedChats.unshift(privateChat);
        }
      }
      
      return updatedChats;
    });
  };

  const handleCreateGroup = (groupName: string, selectedUserIds: string[], schedule: string, conclusionLink: string) => {
    // Автоматически добавляем всех педагогов и админа
    const teachersAndAdmins = allUsers
      .filter(user => user.role === 'teacher')
      .map(user => user.id);
    
    // Добавляем ID админа (Виктория Абраменко всегда с ID 'admin')
    const adminId = 'admin';
    
    // Объединяем выбранных пользователей с педагогами и админом
    const allParticipants = [...new Set([...selectedUserIds, ...teachersAndAdmins, adminId])];
    
    const newGroup: Chat = {
      id: Date.now().toString(),
      name: groupName,
      lastMessage: '',
      timestamp: 'Сейчас',
      unread: 0,
      type: 'group',
      participants: allParticipants,
      schedule: schedule || undefined,
      conclusionLink: conclusionLink || undefined,
      avatar: 'https://cdn.poehali.dev/files/Ученик.jpg',
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
    console.log('Создана группа с участниками:', allParticipants);
  };

  const handleTyping = (text: string) => {
    setMessageText(text);
    
    // TODO: Отправить событие на сервер о том, что текущий пользователь печатает
    // Пример: socket.emit('typing', { chatId: selectedChat, userName: userName });
    // Сервер должен рассылать это событие другим участникам чата
    // Другие участники получат событие и добавят userName в свой список typingUsers
  };

  const handleDeleteGroup = (chatId: string) => {
    // Удаляем чат из списка
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    
    // Удаляем топики группы
    setGroupTopics(prev => {
      const newTopics = { ...prev };
      delete newTopics[chatId];
      return newTopics;
    });
    
    // Удаляем сообщения группы
    setChatMessages(prev => {
      const newMessages = { ...prev };
      delete newMessages[chatId];
      // Также удаляем сообщения из топиков этой группы
      Object.keys(newMessages).forEach(key => {
        if (key.startsWith(chatId)) {
          delete newMessages[key];
        }
      });
      return newMessages;
    });
    
    // Если удаляемый чат был выбран, сбрасываем выбор
    if (selectedChat === chatId) {
      setSelectedChat(null);
      setSelectedGroup(null);
      setSelectedTopic(null);
    }
  };

  const handleUpdateTeacher = (teacherId: string, updates: Partial<User>) => {
    console.log('📝 Updating teacher:', teacherId, updates);
    setAllUsers(prev => {
      const updated = prev.map(user => 
        user.id === teacherId ? { ...user, ...updates } : user
      );
      console.log('✅ Users updated:', updated.find(u => u.id === teacherId));
      return updated;
    });
  };

  return {
    isAuthenticated,
    userRole,
    userName,
    userId,
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
    handleAddTeacher,
    handleCreateGroup,
    handleDeleteGroup,
    handleUpdateTeacher,
  };
};