import { useState, useEffect, useMemo } from 'react';
import { UserRole, AttachedFile, Message, Chat, GroupTopics } from '@/types/chat.types';
import { initialGroupTopics, initialChatMessages } from '@/data/mockChatData';
import { teacherAccounts } from '@/data/teacherAccounts';
import { testAccounts } from '@/data/testAccounts';
import { wsService } from '@/services/websocket';
import { getUsers, getChats, getMessages, createChat, markAsRead } from '@/services/api';
import type { Message as ApiMessage } from '@/services/api';
import { checkAndPlaySound, requestNotificationPermission } from '@/utils/notificationSound';
import { applyAdminDefaults } from '@/utils/notificationSettings';

const SUPERVISOR_ID = 'admin';

const mapApiMessages = (msgs: ApiMessage[]): Message[] =>
  msgs.map(m => ({
    id: m.id,
    text: m.text,
    sender: m.sender_name,
    senderId: m.sender_id,
    timestamp: new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    isOwn: false,
    attachments: m.attachments,
    reactions: m.reactions,
    status: 'delivered' as const,
  }));

type User = {
  id: string;
  name: string;
  role: 'teacher' | 'parent' | 'student' | 'admin';
  phone: string;
  email?: string;
  password: string;
  avatar?: string;
  availableSlots?: string[];
  educationDocs?: string[];
};

// Кэшируем данные в памяти для мгновенной загрузки
let cachedUsers: User[] | null = null;
let cachedChats: Chat[] | null = null;
let cachedGroupTopics: GroupTopics | null = null;

const loadChatsFromCache = (): Chat[] => {
  if (cachedChats) return cachedChats;
  const stored = localStorage.getItem('chats');
  cachedChats = stored ? JSON.parse(stored) : [];
  return cachedChats;
};

const loadGroupTopicsFromCache = (): GroupTopics => {
  if (cachedGroupTopics) return cachedGroupTopics;
  const stored = localStorage.getItem('groupTopics');
  cachedGroupTopics = stored ? JSON.parse(stored) : initialGroupTopics;
  return cachedGroupTopics;
};

const loadUsersFromStorage = (): User[] => {
  // Если есть кэш в памяти - возвращаем мгновенно
  if (cachedUsers) return cachedUsers;
  
  const VERSION = 'v4-fix-dynamic-teachers';
  const storedVersion = localStorage.getItem('usersVersion');
  const stored = localStorage.getItem('allUsers');
  
  if (stored && storedVersion === VERSION) {
    try {
      cachedUsers = JSON.parse(stored);
      return cachedUsers;
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
  
  cachedUsers = [...teachers, ...testUsers];
  localStorage.setItem('allUsers', JSON.stringify(cachedUsers));
  localStorage.setItem('usersVersion', VERSION);
  
  // ВАЖНО: При смене версии пользователей очищаем чаты
  localStorage.removeItem('chats');
  localStorage.removeItem('chatsMigration');
  
  return cachedUsers;
};

// Удалены дублирующие функции - используем inline в useState

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
  
  // МИГРАЦИЯ V6: убираем закрепления педагог↔педагог СРАЗУ при инициализации
  const [chats, setChats] = useState<Chat[]>(() => {
    const migrationKey = 'chats_migration_v6_final';
    const migrated = localStorage.getItem(migrationKey);
    
    if (!migrated) {
      console.log('🔧 МИГРАЦИЯ V6: Убираю закрепления педагог↔педагог...');
      const stored = localStorage.getItem('chats');
      let chats: Chat[] = stored ? JSON.parse(stored) : [];
      
      chats = chats.map(chat => {
        if (!chat.isPinned) return chat;
        
        // Оставляем только:
        // 1. Группу "Педагоги"
        if (chat.id === 'teachers-group') {
          console.log(`  ✅ "${chat.name}" — группа педагогов`);
          return chat;
        }
        
        // 2. Приватные чаты с админом
        if (chat.type === 'private' && chat.participants?.includes('admin')) {
          console.log(`  ✅ "${chat.name}" — чат с админом`);
          return chat;
        }
        
        // Все остальные — открепляем
        console.log(`  ❌ "${chat.name}" — УБИРАЮ ЗАКРЕПЛЕНИЕ`);
        return { ...chat, isPinned: false };
      });
      
      localStorage.setItem('chats', JSON.stringify(chats));
      localStorage.setItem(migrationKey, 'true');
      console.log('✅ МИГРАЦИЯ V6 ЗАВЕРШЕНА! Закрепления убраны.');
      
      return chats;
    }
    
    return loadChatsFromCache();
  });
  
  const [groupTopics, setGroupTopics] = useState<GroupTopics>(() => {
    const topics = loadGroupTopicsFromCache();
    const migrationKey = 'topics_migration_standard_v2';
    if (localStorage.getItem(migrationKey)) return topics;

    let changed = false;
    const updated = { ...topics };
    for (const groupId of Object.keys(updated)) {
      const standardTopics = [
        { suffix: '-important', name: 'Важное', icon: 'AlertCircle' },
        { suffix: '-zoom', name: 'Zoom', icon: 'Video' },
        { suffix: '-homework', name: 'ДЗ', icon: 'BookOpen' },
        { suffix: '-reports', name: 'Отчеты', icon: 'FileText' },
        { suffix: '-payment', name: 'Оплата', icon: 'CreditCard' },
        { suffix: '-cancellation', name: 'Отмена занятий', icon: 'XCircle' },
        { suffix: '-admin-contact', name: 'Связь с админом', icon: 'Headphones' },
      ];
      for (const st of standardTopics) {
        const has = updated[groupId].some(t => t.id.endsWith(st.suffix));
        if (!has) {
          updated[groupId] = [
            ...updated[groupId].filter(t => !t.id.endsWith(st.suffix)),
            { id: `${groupId}${st.suffix}`, name: st.name, icon: st.icon, lastMessage: '', timestamp: '', unread: 0 },
          ];
          changed = true;
        }
      }
      const oldTestTopics = updated[groupId].filter(t => t.id === 'test-topic-1' || t.id === 'test-topic-2' || t.id === 'test-topic-admin-contact');
      if (oldTestTopics.length > 0) {
        updated[groupId] = updated[groupId].filter(t => t.id !== 'test-topic-1' && t.id !== 'test-topic-2' && t.id !== 'test-topic-admin-contact');
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem('groupTopics', JSON.stringify(updated));
    }
    localStorage.setItem(migrationKey, 'true');
    return updated;
  });
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>(() => {
    const stored = localStorage.getItem('chatMessages');
    if (stored) {
      try { return JSON.parse(stored); } catch { /* ignore */ }
    }
    return initialChatMessages;
  });
  const [allUsers, setAllUsers] = useState<User[]>(loadUsersFromStorage);
  // Список пользователей, которые сейчас печатают (кроме текущего)
  // TODO: Интеграция с WebSocket/сервером для получения данных о печатающих пользователях
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messages = useMemo(() => {
    const raw = selectedTopic 
      ? (chatMessages[selectedTopic] || []) 
      : selectedChat 
      ? (chatMessages[selectedChat] || []) 
      : [];
    return raw.map(msg => ({
      ...msg,
      isOwn: msg.senderId ? msg.senderId === userId : msg.isOwn,
    }));
  }, [selectedTopic, selectedChat, chatMessages, userId]);

  useEffect(() => {
    if (isAuthenticated && (userRole === 'parent' || userRole === 'student') && !selectedChat && userId) {
      const myGroup = chats.find(chat =>
        chat.type === 'group' &&
        chat.id !== 'teachers-group' &&
        chat.participants?.includes(userId)
      );
      
      if (myGroup) {
        setSelectedChat(myGroup.id);
        setSelectedGroup(myGroup.id);
        const topics = groupTopics[myGroup.id];
        if (topics && topics.length > 0) {
          const importantTopic = topics.find(t => t.id.endsWith('-important'));
          const autoTopicId = importantTopic ? importantTopic.id : topics[0].id;
          setSelectedTopic(autoTopicId);
          markAsRead(userId, myGroup.id, autoTopicId).catch(() => {});
          getMessages(myGroup.id, autoTopicId).then(msgs => {
            setChatMessages(prev => ({ ...prev, [autoTopicId]: mapApiMessages(msgs) }));
          }).catch(() => {});
        }
      }
    }
  }, [isAuthenticated, userRole, userId]);

  // Подключение WebSocket и загрузка данных из API
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    requestNotificationPermission();

    // Временно отключаем WebSocket для ускорения загрузки
    // wsService.connect(userId);

    const mapChatsData = (chatsData: { chats: Record<string, unknown>[]; topics: Record<string, unknown[]> }) => {
      const mappedChats = chatsData.chats.map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        type: c.type as 'group' | 'private',
        avatar: c.avatar as string | undefined,
        lastMessage: (c.last_message || '') as string,
        timestamp: (c.timestamp || '') as string,
        unread: (c.unread || 0) as number,
        participants: c.participants as string[] | undefined,
        leadTeachers: (c.lead_teachers && (c.lead_teachers as string[]).length > 0) ? c.lead_teachers as string[] : undefined,
        leadAdmin: (c.lead_admin || undefined) as string | undefined,
        isPinned: c.is_pinned as boolean | undefined,
        schedule: c.schedule as string | undefined,
        conclusionLink: c.conclusion_link as string | undefined,
      }));
      const mappedTopics: GroupTopics = {};
      for (const [chatId, topics] of Object.entries(chatsData.topics)) {
        mappedTopics[chatId] = (topics as Array<Record<string, unknown>>).map(t => ({
          id: t.id as string,
          name: t.name as string,
          icon: t.icon as string,
          lastMessage: '',
          timestamp: '',
          unread: (t.unread || 0) as number,
        }));
      }
      return { mappedChats, mappedTopics };
    };

    const loadData = async () => {
      const hasLocalData = allUsers.length > 0 && chats.length > 0;
      
      if (hasLocalData) {
        getUsers().then(users => {
          if (users.length > 0) setAllUsers(users);
        }).catch(() => {});
        getChats(userId).then(chatsData => {
          if (chatsData.chats.length > 0) {
            const { mappedChats, mappedTopics } = mapChatsData(chatsData as { chats: Record<string, unknown>[]; topics: Record<string, unknown[]> });
            setChats(mappedChats);
            setGroupTopics(mappedTopics);
            if (userRole === 'admin') {
              const allTopicIds = Object.values(mappedTopics).flat().map(t => t.id);
              applyAdminDefaults(allTopicIds);
            }
          }
        }).catch(() => {});
        return;
      }
      
      try {
        const [users, chatsData] = await Promise.all([
          getUsers().catch(() => []),
          getChats(userId).catch(() => ({ chats: [], topics: {} }))
        ]);
        
        if (users.length > 0) setAllUsers(users);
        if (chatsData.chats.length > 0) {
          const { mappedChats, mappedTopics } = mapChatsData(chatsData as { chats: Record<string, unknown>[]; topics: Record<string, unknown[]> });
          setChats(mappedChats);
          setGroupTopics(mappedTopics);
          if (userRole === 'admin') {
            const allTopicIds = Object.values(mappedTopics).flat().map(t => t.id);
            applyAdminDefaults(allTopicIds);
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };

    loadData();

    // Обработчики WebSocket событий
    const handleUserUpdate = async (data: { userId: string }) => {
      console.log('🔄 User updated:', data.userId);
      try {
        const users = await getUsers();
        setAllUsers(users);
      } catch (err) {
        console.error('Failed to reload users:', err);
      }
    };

    const handleNewMessage = async (data: { chatId: string; topicId?: string }) => {
      try {
        const msgs = await getMessages(data.chatId, data.topicId);
        const targetId = data.topicId || data.chatId;
        setChatMessages(prev => ({
          ...prev,
          [targetId]: mapApiMessages(msgs)
        }));

        const isCurrentChat = data.chatId === selectedChat && (!data.topicId || data.topicId === selectedTopic);
        if (!isCurrentChat) {
          if (data.topicId) {
            setGroupTopics(prev => {
              const groupTopicsList = prev[data.chatId];
              if (!groupTopicsList) return prev;
              return {
                ...prev,
                [data.chatId]: groupTopicsList.map(t =>
                  t.id === data.topicId ? { ...t, unread: t.unread + 1 } : t
                )
              };
            });
          } else {
            setChats(prev => {
              const updated = prev.map(c =>
                c.id === data.chatId ? { ...c, unread: c.unread + 1 } : c
              );
              const idx = updated.findIndex(c => c.id === data.chatId);
              if (idx > 0) {
                const [moved] = updated.splice(idx, 1);
                const pinnedCount = updated.filter(c => c.isPinned || c.id === 'teachers-group').length;
                updated.splice(pinnedCount, 0, moved);
              }
              return updated;
            });
          }
        }
      } catch (err) {
        console.error('Failed to reload messages:', err);
      }
    };

    wsService.on('user_update', handleUserUpdate);
    wsService.on('message_new', handleNewMessage);

    const pollInterval = setInterval(() => {
      getChats(userId).then(chatsData => {
        if (chatsData.chats.length > 0) {
          const { mappedChats, mappedTopics } = mapChatsData(chatsData as { chats: Record<string, unknown>[]; topics: Record<string, unknown[]> });
          const topicItems = Object.values(mappedTopics).flat().map(t => ({ id: t.id, name: t.name, unread: t.unread }));
          checkAndPlaySound(mappedChats.map(c => ({ id: c.id, name: c.name, unread: c.unread })), topicItems);
          setChats(mappedChats);
          setGroupTopics(mappedTopics);
        }
      }).catch(() => {});
    }, 15000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [isAuthenticated, userId]);

  // Сохраняем данные в localStorage с debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('allUsers', JSON.stringify(allUsers));
      localStorage.setItem('chats', JSON.stringify(chats));
      localStorage.setItem('groupTopics', JSON.stringify(groupTopics));
      localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
    }, 500);
    
    return () => clearTimeout(timer);
  }, [allUsers, chats, groupTopics, chatMessages]);

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
    
    let firstTopicId: string | null = null;
    if (chat && chat.type === 'group') {
      setSelectedGroup(chatId);
      const topics = groupTopics[chatId];
      if (topics && topics.length > 0) {
        if (userRole === 'teacher' || userRole === 'student') {
          const firstNonAdmin = topics.find(t => !t.id.endsWith('-admin-contact'));
          firstTopicId = firstNonAdmin ? firstNonAdmin.id : topics[0].id;
        } else {
          firstTopicId = topics[0].id;
        }
        setSelectedTopic(firstTopicId);
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

    if (userId) {
      if (firstTopicId) {
        markAsRead(userId, chatId, firstTopicId).catch(() => {});
        setGroupTopics(prev => {
          if (!prev[chatId]) return prev;
          return {
            ...prev,
            [chatId]: prev[chatId].map(t =>
              t.id === firstTopicId ? { ...t, unread: 0 } : t
            )
          };
        });
        getMessages(chatId, firstTopicId).then(msgs => {
          setChatMessages(prev => ({ ...prev, [firstTopicId!]: mapApiMessages(msgs) }));
        }).catch(() => {});
      } else {
        markAsRead(userId, chatId).catch(() => {});
        getMessages(chatId).then(msgs => {
          setChatMessages(prev => ({ ...prev, [chatId]: mapApiMessages(msgs) }));
        }).catch(() => {});
      }
    }
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

      if (userId) {
        markAsRead(userId, selectedGroup, topicId).catch(() => {});
      }

      getMessages(selectedGroup, topicId).then(msgs => {
        setChatMessages(prev => ({ ...prev, [topicId]: mapApiMessages(msgs) }));
      }).catch(() => {});
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChat || (!messageText.trim() && attachments.length === 0)) return;
    
    const targetId = selectedTopic || selectedChat;
    const messageId = Date.now().toString();
    
    const senderName = userRole === 'admin' ? 'Виктория Абраменко' : userName;
    const defaultAvatars: Record<string, string> = {
      admin: 'https://cdn.poehali.dev/files/Админ.jpg',
      teacher: 'https://cdn.poehali.dev/files/Педагог.jpg',
      parent: 'https://cdn.poehali.dev/files/Родитель.jpg',
      student: 'https://cdn.poehali.dev/files/Ученик.jpg',
    };
    const senderAvatar = userRole === 'admin'
      ? defaultAvatars.admin
      : allUsers.find(u => u.id === userId)?.avatar || defaultAvatars[userRole || ''];
    const newMessage: Message = {
      id: messageId,
      text: messageText || undefined,
      sender: senderName,
      senderId: userId,
      senderAvatar: senderAvatar,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      attachments: attachments.length > 0 ? attachments : undefined,
      status: 'sending',
    };
    
    setChatMessages(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), newMessage]
    }));

    const msgPreview = messageText ? (messageText.length > 40 ? messageText.slice(0, 40) + '...' : messageText) : 'Вложение';
    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    setChats(prev => {
      const updated = prev.map(chat =>
        chat.id === selectedChat
          ? { ...chat, lastMessage: `${senderName}: ${msgPreview}`, timestamp: now }
          : chat
      );
      const idx = updated.findIndex(c => c.id === selectedChat);
      if (idx > 0) {
        const [moved] = updated.splice(idx, 1);
        const pinnedCount = updated.filter(c => c.isPinned || c.id === 'teachers-group').length;
        updated.splice(pinnedCount, 0, moved);
      }
      return updated;
    });

    if (selectedTopic && selectedGroup) {
      setGroupTopics(prev => ({
        ...prev,
        [selectedGroup]: prev[selectedGroup]?.map(topic =>
          topic.id === selectedTopic
            ? { ...topic, lastMessage: msgPreview, timestamp: now }
            : topic
        ) || []
      }));
    }

    setMessageText('');
    setAttachments([]);

    try {
      // Отправляем сообщение в API
      const { sendMessage } = await import('@/services/api');
      await sendMessage({
        id: messageId,
        chatId: selectedChat,
        topicId: selectedTopic || undefined,
        senderId: userId,
        senderName: userName,
        text: messageText || undefined,
        attachments: attachments.map(att => ({
          type: att.type,
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          fileSize: att.fileSize,
        })),
      });

      // Уведомляем через WebSocket
      wsService.notifyNewMessage(messageId, selectedChat, selectedTopic || undefined);

      setChatMessages(prev => ({
        ...prev,
        [targetId]: prev[targetId].map(msg => 
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        )
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      setChatMessages(prev => ({
        ...prev,
        [targetId]: prev[targetId].map(msg => 
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        )
      }));
    }

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
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newAttachment: AttachedFile = {
            type: 'file',
            fileUrl: e.target?.result as string,
            fileName: file.name,
            fileSize: `${(file.size / 1024).toFixed(0)} KB`,
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      });
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
    
    const currentUserId = allUsers.find(u => u.name === name && u.role === role)?.id || (role === 'admin' ? 'admin' : '');
    setUserId(currentUserId);
    
    setIsAuthenticated(true);
    requestNotificationPermission();
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
    localStorage.setItem('userName', name || '');
    localStorage.setItem('userId', currentUserId);
    
    let existingChats = chats;
    
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

      if (!groupTopics['teachers-group'] || groupTopics['teachers-group'].length === 0) {
        setGroupTopics(prev => ({
          ...prev,
          'teachers-group': [
            { id: 'teachers-group-important', name: 'Важное', icon: 'AlertCircle', lastMessage: '', timestamp: '', unread: 0 },
            { id: 'teachers-group-general', name: 'Общее', icon: 'MessageSquare', lastMessage: '', timestamp: '', unread: 0 },
            { id: 'teachers-group-flood', name: 'Флудилка', icon: 'Coffee', lastMessage: '', timestamp: '', unread: 0 },
            { id: 'teachers-group-new-students', name: 'Новые ученики', icon: 'UserPlus', lastMessage: '', timestamp: '', unread: 0 },
            { id: 'teachers-group-parent-reviews', name: 'Отзывы родителей', icon: 'Star', lastMessage: '', timestamp: '', unread: 0 },
            { id: 'teachers-group-support', name: 'Техподдержка', icon: 'Headphones', lastMessage: '', timestamp: '', unread: 0 },
          ]
        }));
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
      existingChats = existingChats.filter(chat => {
        if (chat.type === 'private' && chat.participants) {
          const isWithSelf = chat.participants.every(id => id === currentUserId);
          if (isWithSelf) return false;
        }
        return true;
      });
      
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

      if (!groupTopics['teachers-group'] || groupTopics['teachers-group'].length === 0) {
        setGroupTopics(prev => ({
          ...prev,
          'teachers-group': [
            { id: 'teachers-group-important', name: 'Важное', icon: 'AlertCircle', lastMessage: '', timestamp: '', unread: 0 },
            { id: 'teachers-group-general', name: 'Общее', icon: 'MessageSquare', lastMessage: '', timestamp: '', unread: 0 },
            { id: 'teachers-group-flood', name: 'Флудилка', icon: 'Coffee', lastMessage: '', timestamp: '', unread: 0 },
            { id: 'teachers-group-new-students', name: 'Новые ученики', icon: 'UserPlus', lastMessage: '', timestamp: '', unread: 0 },
            { id: 'teachers-group-parent-reviews', name: 'Отзывы родителей', icon: 'Star', lastMessage: '', timestamp: '', unread: 0 },
            { id: 'teachers-group-support', name: 'Техподдержка', icon: 'Headphones', lastMessage: '', timestamp: '', unread: 0 },
          ]
        }));
      }
      
      // 2. Личные чаты с каждым педагогом
      const teachers = allUsers.filter(u => u.role === 'teacher');
      teachers.forEach(teacher => {
        const privateChatId = `private-${teacher.id}-${currentUserId}`;
        const legacyChatId = `private-${teacher.id}-admin`;
        const hasPrivateChat = existingChats.some(chat => chat.id === privateChatId || chat.id === legacyChatId);
        
        if (!hasPrivateChat) {
          const privateChat: Chat = {
            id: privateChatId,
            name: teacher.name,
            type: 'private',
            lastMessage: '',
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            participants: [teacher.id, currentUserId],
            isPinned: true,
            avatar: teacher.avatar || 'https://cdn.poehali.dev/files/Педагог.jpg',
          };
          existingChats.unshift(privateChat);
        }
      });

      // 3. ЛС с Абраменко (супервизор) для не-supervisor админов
      if (currentUserId !== SUPERVISOR_ID) {
        const supervisorChatId = `private-${currentUserId}-${SUPERVISOR_ID}`;
        const hasSupervisorChat = existingChats.some(chat => chat.id === supervisorChatId);
        if (!hasSupervisorChat) {
          const supervisorUser = allUsers.find(u => u.id === SUPERVISOR_ID);
          const supervisorChat: Chat = {
            id: supervisorChatId,
            name: supervisorUser?.name || 'Виктория Абраменко',
            type: 'private',
            lastMessage: '',
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            participants: [currentUserId, SUPERVISOR_ID],
            isPinned: true,
            avatar: supervisorUser?.avatar || 'https://cdn.poehali.dev/files/Админ.jpg',
          };
          existingChats.unshift(supervisorChat);
        }
      }

      // 4. Личные чаты с другими админами (кроме себя и супервизора)
      const otherAdmins = allUsers.filter(u => u.role === 'admin' && u.id !== currentUserId && u.id !== SUPERVISOR_ID);
      otherAdmins.forEach(adm => {
        const ids = [adm.id, currentUserId].sort();
        const privateChatId = `private-admin-${ids[0]}-${ids[1]}`;
        const hasPrivateChat = existingChats.some(chat =>
          chat.id === privateChatId ||
          (chat.type === 'private' && chat.participants &&
           chat.participants.length === 2 &&
           chat.participants.includes(adm.id) &&
           chat.participants.includes(currentUserId))
        );
        
        if (!hasPrivateChat) {
          const privateChat: Chat = {
            id: privateChatId,
            name: adm.name,
            type: 'private',
            lastMessage: '',
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            participants: [adm.id, currentUserId],
            isPinned: false,
            avatar: adm.avatar || 'https://cdn.poehali.dev/files/Админ.jpg',
          };
          existingChats.push(privateChat);
        }
      });

      const seen = new Set<string>();
      existingChats = existingChats.filter(chat => {
        if (chat.type === 'private' && chat.participants && chat.participants.length === 2) {
          const key = [...chat.participants].sort().join('-');
          if (seen.has(key)) return false;
          seen.add(key);
        }
        return true;
      });
      
      setChats(existingChats);
      localStorage.setItem('chats', JSON.stringify(existingChats));
    }
    
    if (role === 'parent' || role === 'student') {
      const myGroup = chats.find(chat =>
        chat.type === 'group' &&
        chat.id !== 'teachers-group' &&
        chat.participants?.includes(currentUserId)
      );

      if (myGroup) {
        setSelectedChat(myGroup.id);
        setSelectedGroup(myGroup.id);
        const topics = groupTopics[myGroup.id];
        if (topics && topics.length > 0) {
          const importantTopic = topics.find(t => t.id.endsWith('-important'));
          setSelectedTopic(importantTopic ? importantTopic.id : topics[0].id);
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
    const targetId = selectedTopic || selectedChat;
    
    setChatMessages(prev => ({
      ...prev,
      [targetId]: (prev[targetId] || []).map(msg => {
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

  const handleAddStudent = async (name: string, phone: string, password: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      phone,
      password,
      role: 'student',
      avatar: 'https://cdn.poehali.dev/files/Ученик.jpg',
    };
    setAllUsers(prev => [...prev, newUser]);
    try {
      const { createUser } = await import('@/services/api');
      await createUser({ id: newUser.id, name, phone, email: '', role: 'student', password });
    } catch (e) {
      console.error('Failed to save student to DB:', e);
    }
  };

  const handleAddParent = async (name: string, phone: string, email: string, password: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      phone,
      email,
      password,
      role: 'parent',
      avatar: 'https://cdn.poehali.dev/files/Родитель.jpg',
    };
    setAllUsers(prev => [...prev, newUser]);
    try {
      const { createUser } = await import('@/services/api');
      await createUser({ id: newUser.id, name, phone, email, role: 'parent', password });
    } catch (e) {
      console.error('Failed to save parent to DB:', e);
    }
  };

  const handleAddTeacher = async (name: string, phone: string, email: string, password: string) => {
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

    try {
      const { createUser } = await import('@/services/api');
      await createUser({ id: newUser.id, name, phone, email, role: 'teacher', password, avatar: newUser.avatar });
    } catch (e) {
      console.error('Failed to save teacher to DB:', e);
    }
    
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

  const handleAddAdmin = async (name: string, phone: string, email: string, password: string) => {
    const newAdminId = `admin-${Date.now()}`;
    const newUser: User = {
      id: newAdminId,
      name,
      phone,
      email,
      password,
      role: 'admin',
      avatar: 'https://cdn.poehali.dev/files/Админ.jpg',
    };
    setAllUsers(prev => [...prev, newUser]);

    try {
      const { createUser } = await import('@/services/api');
      await createUser({ id: newAdminId, name, phone, email, role: 'admin', password, avatar: newUser.avatar });
    } catch (e) {
      console.error('Failed to save admin to DB:', e);
    }

    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.type === 'group' && chat.participants) {
          return { ...chat, participants: [...chat.participants, newAdminId] };
        }
        return chat;
      });
      return updatedChats;
    });
  };

  const handleCreateGroup = async (groupName: string, selectedUserIds: string[], schedule: string, conclusionLink: string, leadTeachers: string[] = [], leadAdmin?: string) => {
    const teachersAndAdmins = allUsers
      .filter(user => user.role === 'teacher' || user.role === 'admin')
      .map(user => user.id);
    
    const supervisorId = 'admin';
    
    const allParticipants = [...new Set([...selectedUserIds, ...teachersAndAdmins, supervisorId])];
    const groupId = Date.now().toString();

    const topics = [
      { id: `${groupId}-important`, name: 'Важное', icon: 'AlertCircle' },
      { id: `${groupId}-zoom`, name: 'Zoom', icon: 'Video' },
      { id: `${groupId}-homework`, name: 'ДЗ', icon: 'BookOpen' },
      { id: `${groupId}-reports`, name: 'Отчеты', icon: 'FileText' },
      { id: `${groupId}-payment`, name: 'Оплата', icon: 'CreditCard' },
      { id: `${groupId}-cancellation`, name: 'Отмена занятий', icon: 'XCircle' },
      { id: `${groupId}-admin-contact`, name: 'Связь с админом', icon: 'Headphones' },
    ];

    try {
      await createChat({
        id: groupId,
        name: groupName,
        type: 'group',
        participants: allParticipants,
        avatar: 'https://cdn.poehali.dev/files/Ученик.jpg',
        schedule: schedule || undefined,
        conclusionLink: conclusionLink || undefined,
        topics,
        leadTeachers: leadTeachers.length > 0 ? leadTeachers : undefined,
        leadAdmin: leadAdmin || undefined,
      });
    } catch (err) {
      console.error('Failed to create group in DB:', err);
    }
    
    const newGroup: Chat = {
      id: groupId,
      name: groupName,
      lastMessage: '',
      timestamp: 'Сейчас',
      unread: 0,
      type: 'group',
      participants: allParticipants,
      leadTeachers: leadTeachers.length > 0 ? leadTeachers : undefined,
      leadAdmin: leadAdmin || undefined,
      schedule: schedule || undefined,
      conclusionLink: conclusionLink || undefined,
      avatar: 'https://cdn.poehali.dev/files/Ученик.jpg',
    };
    setChats(prev => [newGroup, ...prev]);
    setGroupTopics(prev => ({
      ...prev,
      [groupId]: topics.map(t => ({ ...t, lastMessage: '', timestamp: '', unread: 0 })),
    }));
    const welcomeText = `Добро пожаловать в ЛинеяСкул!

Чтобы мы все получили максимум пользы от нашего взаимодействия, а негативный опыт свели к нулю, ознакомьтесь с нашими правилами и рекомендациями:
📖 Чтобы снизить уровень стресса и увеличить эффективность нашей работы, рекомендуем "вписать" домашние задания в ежедневную рутину (например, каждый день 10 мин перед завтраком). Если встречаем сопротивление ребенка, подключаем таймер и снижаем время активного выполнения до 5 мин, увеличивая его каждую неделю на минуту. Регулярное выполнение ДЗ - база для создания устойчивых компенсаторных нейронных связей. 
📷 Фотографии домашних и "классных" заданий обязательно отправлять в чат "Отчеты". Это поможет педагогам оценивать успехи и более точечно работать над нарушенными функциями.
‼️ Об отмене/переносе  занятия нужно предупредить не позднее, чем за 4 часа до его начала. В противном случае урок будет списан. Если пропуск без предупреждения связан с болезнью, вы можете предоставить справку от педиатра, и тогда мы перенесем занятие на конец абонемента.`;

    setChatMessages(prev => ({
      ...prev,
      [`${groupId}-important`]: [{
        id: `welcome-${groupId}`,
        text: welcomeText,
        sender: 'Виктория Абраменко',
        senderId: 'admin',
        senderAvatar: 'https://cdn.poehali.dev/files/Админ.jpg',
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
      }]
    }));
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

  const handleDeleteUser = async (userId: string) => {
    setAllUsers(prev => prev.filter(u => u.id !== userId));
    setChats(prev => prev
      .map(chat => ({
        ...chat,
        participants: chat.participants?.filter(id => id !== userId),
      }))
      .filter(chat => {
        if (chat.type === 'private' && chat.participants) {
          return chat.participants.length >= 2;
        }
        return true;
      })
    );
    try {
      const { deleteUser } = await import('@/services/api');
      await deleteUser(userId);
    } catch (e) {
      console.error('Failed to delete user from DB:', e);
    }
  };

  const handleUpdateTeacher = async (teacherId: string, updates: Partial<User>) => {
    try {
      // Отправляем обновление в API
      const { updateUser } = await import('@/services/api');
      await updateUser(teacherId, updates);
      
      // Обновляем локальное состояние
      setAllUsers(prev => 
        prev.map(user => 
          user.id === teacherId ? { ...user, ...updates } : user
        )
      );

      // Уведомляем через WebSocket
      wsService.notifyUserUpdate(teacherId);
      
    } catch (error) {
      console.error('Failed to update teacher:', error);
    }
  };

  const handleUpdateLeadTeachers = (chatId: string, leadTeachers: string[]) => {
    setChats(prev => {
      const updated = prev.map(chat =>
        chat.id === chatId
          ? { ...chat, leadTeachers: leadTeachers.length > 0 ? leadTeachers : undefined }
          : chat
      );
      localStorage.setItem('chats', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateParticipants = (chatId: string, participantIds: string[]) => {
    const teacherAndAdminIds = allUsers
      .filter(u => u.role === 'teacher' || u.role === 'admin')
      .map(u => u.id);
    const finalParticipants = [...new Set([...participantIds, ...teacherAndAdminIds, 'admin'])];
    setChats(prev => {
      const updated = prev.map(chat =>
        chat.id === chatId
          ? { ...chat, participants: finalParticipants }
          : chat
      );
      localStorage.setItem('chats', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateLeadAdmin = (chatId: string, leadAdmin: string | undefined) => {
    setChats(prev => {
      const updated = prev.map(chat =>
        chat.id === chatId
          ? { ...chat, leadAdmin }
          : chat
      );
      localStorage.setItem('chats', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateGroupInfo = (chatId: string, updates: { schedule?: string; conclusionLink?: string; name?: string }) => {
    setChats(prev => {
      const updated = prev.map(chat =>
        chat.id === chatId
          ? { ...chat, ...updates }
          : chat
      );
      localStorage.setItem('chats', JSON.stringify(updated));
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
    handleDeleteUser,
    handleUpdateTeacher,
    handleUpdateLeadTeachers,
    handleUpdateLeadAdmin,
    handleUpdateParticipants,
    handleUpdateGroupInfo,
    handleAddAdmin,
  };
};