import { useState, useEffect, useMemo } from 'react';
import { UserRole, AttachedFile, Message, Chat, GroupTopics } from '@/types/chat.types';
import { initialGroupTopics, initialChatMessages } from '@/data/mockChatData';
import { teacherAccounts } from '@/data/teacherAccounts';
import { testAccounts } from '@/data/testAccounts';
import { wsService } from '@/services/websocket';
import { getUsers, getChats, getMessages, createChat, updateChat, deleteChat, markAsRead, sendMessage as apiSendMessage } from '@/services/api';
import type { Message as ApiMessage } from '@/services/api';
import { checkAndPlaySound, requestNotificationPermission, resetNotificationState } from '@/utils/notificationSound';
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
    replyTo: m.reply_to_id ? {
      id: m.reply_to_id,
      sender: m.reply_to_sender || '',
      text: m.reply_to_text || '',
    } : undefined,
    forwardedFrom: m.forwarded_from_id ? {
      id: m.forwarded_from_id,
      sender: m.forwarded_from_sender || '',
      text: m.forwarded_from_text || '',
      date: m.forwarded_from_date || '',
      chatName: m.forwarded_from_chat_name || '',
    } : undefined,
  }));

const mergeMessages = (existing: Message[], fromApi: Message[]): Message[] => {
  const merged = new Map<string, Message>();
  existing.forEach(msg => merged.set(msg.id, msg));
  fromApi.forEach(msg => merged.set(msg.id, msg));
  return Array.from(merged.values());
};

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

const deduplicatePrivateChats = (chats: Chat[]): Chat[] => {
  const seen = new Set<string>();
  return chats.filter(chat => {
    if (chat.type === 'private' && chat.participants && chat.participants.length === 2) {
      const key = [...chat.participants].sort().join('-');
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  });
};

const loadChatsFromCache = (): Chat[] => {
  if (cachedChats) return cachedChats;
  const stored = localStorage.getItem('chats');
  let chats: Chat[] = stored ? JSON.parse(stored) : [];
  chats = deduplicatePrivateChats(chats).map(c =>
    c.type === 'private' ? { ...c, isPinned: false } : c
  );
  cachedChats = chats;
  if (stored) localStorage.setItem('chats', JSON.stringify(chats));
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
  
  const VERSION = 'v9-clean-private-pins';
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
  const [replyTo, setReplyTo] = useState<{ id: string; sender: string; text: string } | null>(null);
  
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

  const roleLabels: Record<string, string> = {
    admin: 'руководитель',
    teacher: 'педагог',
    parent: 'родитель',
    student: 'ученик',
  };

  const messages = useMemo(() => {
    const raw = selectedTopic 
      ? (chatMessages[selectedTopic] || []) 
      : selectedChat 
      ? (chatMessages[selectedChat] || []) 
      : [];
    return raw.map(msg => {
      const user = msg.senderId ? allUsers.find(u => u.id === msg.senderId) : undefined;
      const roleLabel = user?.role ? roleLabels[user.role] : undefined;
      const displayName = roleLabel ? `${msg.sender} (${roleLabel})` : msg.sender;
      return {
        ...msg,
        sender: displayName,
        isOwn: msg.senderId ? msg.senderId === userId : msg.isOwn,
      };
    });
  }, [selectedTopic, selectedChat, chatMessages, userId, allUsers]);

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
            setChatMessages(prev => ({ ...prev, [autoTopicId]: mergeMessages(prev[autoTopicId] || [], mapApiMessages(msgs)) }));
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
        isPinned: (c.type === 'private' ? false : c.is_pinned) as boolean | undefined,
        isArchived: c.is_archived as boolean | undefined,
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
            const deduped = deduplicatePrivateChats(mappedChats);
            const withStaff = ensureStaffChats(userRole!, userId, deduped, allUsers);
            setChats(withStaff);
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
        
        const resolvedUsers = users.length > 0 ? users : allUsers;
        if (users.length > 0) setAllUsers(users);
        if (chatsData.chats.length > 0) {
          const { mappedChats, mappedTopics } = mapChatsData(chatsData as { chats: Record<string, unknown>[]; topics: Record<string, unknown[]> });
          const deduped = deduplicatePrivateChats(mappedChats);
          const withStaff = ensureStaffChats(userRole!, userId, deduped, resolvedUsers);
          setChats(withStaff);
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
          [targetId]: mergeMessages(prev[targetId] || [], mapApiMessages(msgs))
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
          const deduped = deduplicatePrivateChats(mappedChats);
          const topicItems = Object.values(mappedTopics).flat().map(t => ({ id: t.id, name: t.name, unread: t.unread }));
          checkAndPlaySound(deduped.map(c => ({ id: c.id, name: c.name, unread: c.unread })), topicItems);
          setChats(deduped);
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
          setChatMessages(prev => ({ ...prev, [firstTopicId!]: mergeMessages(prev[firstTopicId!] || [], mapApiMessages(msgs)) }));
        }).catch(() => {});
      } else {
        markAsRead(userId, chatId).catch(() => {});
        getMessages(chatId).then(msgs => {
          setChatMessages(prev => ({ ...prev, [chatId]: mergeMessages(prev[chatId] || [], mapApiMessages(msgs)) }));
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
        setChatMessages(prev => ({ ...prev, [topicId]: mergeMessages(prev[topicId] || [], mapApiMessages(msgs)) }));
      }).catch(() => {});
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChat || (!messageText.trim() && attachments.length === 0)) return;
    
    const targetId = selectedTopic || selectedChat;
    const messageId = Date.now().toString();
    
    const senderName = userName || (userRole === 'admin' ? 'Администратор' : 'Пользователь');
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
      replyTo: replyTo || undefined,
    };
    const currentReplyTo = replyTo;
    
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
    setReplyTo(null);

    try {
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
        replyToId: currentReplyTo?.id,
        replyToSender: currentReplyTo?.sender,
        replyToText: currentReplyTo?.text,
      });

      // Уведомляем через WebSocket
      wsService.notifyNewMessage(messageId, selectedChat, selectedTopic || undefined);

      setChatMessages(prev => ({
        ...prev,
        [targetId]: (prev[targetId] || []).map(msg => 
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        )
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      setChatMessages(prev => ({
        ...prev,
        [targetId]: (prev[targetId] || []).map(msg => 
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        )
      }));
    }

    setTimeout(() => {
      setChatMessages(prev => ({
        ...prev,
        [targetId]: (prev[targetId] || []).map(msg => 
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        )
      }));
    }, 500);

    setTimeout(() => {
      setChatMessages(prev => ({
        ...prev,
        [targetId]: (prev[targetId] || []).map(msg => 
          msg.id === messageId ? { ...msg, status: 'delivered' } : msg
        )
      }));
    }, 1000);

    setTimeout(() => {
      setChatMessages(prev => ({
        ...prev,
        [targetId]: (prev[targetId] || []).map(msg => 
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

  const handleLogin = (role: UserRole, name?: string, apiUserId?: string) => {
    setUserRole(role);
    setUserName(name || '');
    
    const currentUserId = apiUserId || allUsers.find(u => u.name === name && u.role === role)?.id || (role === 'admin' ? 'admin' : '');
    setUserId(currentUserId);
    
    setIsAuthenticated(true);
    requestNotificationPermission();
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
    localStorage.setItem('userName', name || '');
    localStorage.setItem('userId', currentUserId);
    
    localStorage.removeItem('chats');
    cachedChats = null;
    setChats([]);
    resetNotificationState();

    const ensureTeachersGroup = (role: UserRole) => {
      if (role !== 'teacher' && role !== 'admin') return;
      const teachersGroupId = 'teachers-group';
      const allTeacherIds = allUsers.filter(u => u.role === 'teacher').map(u => u.id);
      createChat({
        id: teachersGroupId,
        name: 'Педагоги',
        type: 'group',
        participants: [...allTeacherIds, 'admin'],
        isPinned: true,
        avatar: 'https://cdn.poehali.dev/files/6c04fc1dc8efff47815dc84d1e41d67b_964f0b0a-ab13-4528-8458-3898a259a3ac.jpg',
        topics: [
          { id: 'teachers-group-important', name: 'Важное', icon: 'AlertCircle' },
          { id: 'teachers-group-general', name: 'Общее', icon: 'MessageSquare' },
          { id: 'teachers-group-flood', name: 'Флудилка', icon: 'Coffee' },
          { id: 'teachers-group-new-students', name: 'Новые ученики', icon: 'UserPlus' },
          { id: 'teachers-group-parent-reviews', name: 'Отзывы родителей', icon: 'Star' },
          { id: 'teachers-group-support', name: 'Техподдержка', icon: 'Headphones' },
        ],
      }).catch(() => {});

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
    };

    ensureTeachersGroup(role);
    
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

  const ensureStaffChats = (
    role: UserRole,
    currentUserId: string,
    currentChats: Chat[],
    users: User[]
  ): Chat[] => {
    if (role !== 'teacher' && role !== 'admin') return currentChats;

    const isLocalFallbackId = (id: string) => /^teacher-\d+$/.test(id);
    const apiUsers = users.filter(u => !isLocalFallbackId(u.id));

    const hasPrivateChatWith = (otherId: string): boolean =>
      currentChats.some(chat =>
        chat.type === 'private' &&
        chat.participants &&
        chat.participants.length === 2 &&
        chat.participants.includes(currentUserId) &&
        chat.participants.includes(otherId)
      );

    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const newChats: Chat[] = [];

    if (role === 'teacher') {
      // LS with supervisor
      if (!hasPrivateChatWith(SUPERVISOR_ID)) {
        const supervisorUser = apiUsers.find(u => u.id === SUPERVISOR_ID);
        const chatId = `private-${[currentUserId, SUPERVISOR_ID].sort().join('-')}`;
        const chat: Chat = {
          id: chatId,
          name: (supervisorUser?.name || 'Виктория Абраменко') + ' (руководитель)',
          type: 'private',
          lastMessage: '',
          timestamp: now,
          unread: 0,
          participants: [currentUserId, SUPERVISOR_ID],
          isPinned: false,
          avatar: supervisorUser?.avatar || 'https://cdn.poehali.dev/files/Админ.jpg',
        };
        newChats.push(chat);
        createChat({ id: chatId, name: chat.name, type: 'private', participants: [currentUserId, SUPERVISOR_ID], avatar: chat.avatar }).catch(() => {});
      }

      // LS with other teachers
      const otherTeachers = apiUsers.filter(u => u.role === 'teacher' && u.id !== currentUserId);
      otherTeachers.forEach(teacher => {
        if (!hasPrivateChatWith(teacher.id)) {
          const ids = [teacher.id, currentUserId].sort();
          const chatId = `private-teacher-${ids[0]}-${ids[1]}`;
          const chat: Chat = {
            id: chatId,
            name: teacher.name,
            type: 'private',
            lastMessage: '',
            timestamp: now,
            unread: 0,
            participants: [teacher.id, currentUserId],
            isPinned: false,
            avatar: teacher.avatar || 'https://cdn.poehali.dev/files/Педагог.jpg',
          };
          newChats.push(chat);
          createChat({ id: chatId, name: teacher.name, type: 'private', participants: [teacher.id, currentUserId], avatar: chat.avatar }).catch(() => {});
        }
      });

      // LS with admins (non-supervisor)
      const admins = apiUsers.filter(u => u.role === 'admin' && u.id !== SUPERVISOR_ID);
      admins.forEach(adm => {
        if (!hasPrivateChatWith(adm.id)) {
          const ids = [adm.id, currentUserId].sort();
          const chatId = `private-${ids[0]}-${ids[1]}`;
          const chat: Chat = {
            id: chatId,
            name: adm.name,
            type: 'private',
            lastMessage: '',
            timestamp: now,
            unread: 0,
            participants: [adm.id, currentUserId],
            isPinned: false,
            avatar: adm.avatar || 'https://cdn.poehali.dev/files/Админ.jpg',
          };
          newChats.push(chat);
          createChat({ id: chatId, name: adm.name, type: 'private', participants: [adm.id, currentUserId], avatar: chat.avatar }).catch(() => {});
        }
      });
    }

    if (role === 'admin') {
      const isSupervisor = currentUserId === SUPERVISOR_ID;

      // LS with all teachers
      const teachers = apiUsers.filter(u => u.role === 'teacher');
      teachers.forEach(teacher => {
        if (!hasPrivateChatWith(teacher.id)) {
          const chatId = `private-${[teacher.id, currentUserId].sort().join('-')}`;
          const chat: Chat = {
            id: chatId,
            name: teacher.name,
            type: 'private',
            lastMessage: '',
            timestamp: now,
            unread: 0,
            participants: [teacher.id, currentUserId],
            isPinned: false,
            avatar: teacher.avatar || 'https://cdn.poehali.dev/files/Педагог.jpg',
          };
          newChats.push(chat);
          createChat({ id: chatId, name: teacher.name, type: 'private', participants: [teacher.id, currentUserId], avatar: chat.avatar }).catch(() => {});
        }
      });

      // LS with supervisor (for non-supervisor admins)
      if (!isSupervisor && !hasPrivateChatWith(SUPERVISOR_ID)) {
        const supervisorUser = apiUsers.find(u => u.id === SUPERVISOR_ID);
        const chatId = `private-${[currentUserId, SUPERVISOR_ID].sort().join('-')}`;
        const chat: Chat = {
          id: chatId,
          name: (supervisorUser?.name || 'Виктория Абраменко') + ' (руководитель)',
          type: 'private',
          lastMessage: '',
          timestamp: now,
          unread: 0,
          participants: [currentUserId, SUPERVISOR_ID],
          isPinned: false,
          avatar: supervisorUser?.avatar || 'https://cdn.poehali.dev/files/Админ.jpg',
        };
        newChats.push(chat);
        createChat({ id: chatId, name: chat.name, type: 'private', participants: [currentUserId, SUPERVISOR_ID], avatar: chat.avatar }).catch(() => {});
      }

      // LS with other admins
      const otherAdmins = apiUsers.filter(u => u.role === 'admin' && u.id !== currentUserId && u.id !== SUPERVISOR_ID);
      otherAdmins.forEach(adm => {
        if (!hasPrivateChatWith(adm.id)) {
          const ids = [adm.id, currentUserId].sort();
          const chatId = `private-admin-${ids[0]}-${ids[1]}`;
          const chat: Chat = {
            id: chatId,
            name: adm.name,
            type: 'private',
            lastMessage: '',
            timestamp: now,
            unread: 0,
            participants: [adm.id, currentUserId],
            isPinned: false,
            avatar: adm.avatar || 'https://cdn.poehali.dev/files/Админ.jpg',
          };
          newChats.push(chat);
          createChat({ id: chatId, name: adm.name, type: 'private', participants: [adm.id, currentUserId], avatar: chat.avatar }).catch(() => {});
        }
      });
    }

    if (newChats.length === 0) return currentChats;

    return deduplicatePrivateChats([...currentChats, ...newChats]);
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
    
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.type === 'group' && chat.participants) {
          const newParticipants = [...chat.participants, newUser.id];
          updateChat(chat.id, { participants: newParticipants }).catch(() => {});
          return { ...chat, participants: newParticipants };
        }
        return chat;
      });
      
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
          createChat({ id: privateChatId, name: newUser.name, type: 'private', participants: [newUser.id, 'admin'], isPinned: true, avatar: privateChat.avatar }).catch(() => {});
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
          const newParticipants = [...chat.participants, newAdminId];
          updateChat(chat.id, { participants: newParticipants }).catch(() => {});
          return { ...chat, participants: newParticipants };
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
    
    const allParticipants = [...new Set([...selectedUserIds, ...teachersAndAdmins, SUPERVISOR_ID])];
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

    const welcomeMsg = {
      id: `welcome-${groupId}`,
      text: welcomeText,
      sender: 'Виктория Абраменко',
      senderId: 'admin',
      senderAvatar: 'https://cdn.poehali.dev/files/Админ.jpg',
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };
    setChatMessages(prev => ({
      ...prev,
      [`${groupId}-important`]: [welcomeMsg]
    }));
    apiSendMessage({ id: welcomeMsg.id, chatId: groupId, topicId: `${groupId}-important`, senderId: 'admin', senderName: 'Виктория Абраменко', text: welcomeText }).catch(() => {});
  };

  const handleTyping = (text: string) => {
    setMessageText(text);
    
    // TODO: Отправить событие на сервер о том, что текущий пользователь печатает
    // Пример: socket.emit('typing', { chatId: selectedChat, userName: userName });
    // Сервер должен рассылать это событие другим участникам чата
    // Другие участники получат событие и добавят userName в свой список typingUsers
  };

  const handleArchiveChat = (chatId: string, archive: boolean) => {
    setChats(prev => {
      const updated = prev.map(chat =>
        chat.id === chatId ? { ...chat, isArchived: archive } : chat
      );
      localStorage.setItem('chats', JSON.stringify(updated));
      return updated;
    });
    updateChat(chatId, { is_archived: archive }).catch(() => {});
    if (archive && selectedChat === chatId) {
      setSelectedChat(null);
      setSelectedGroup(null);
      setSelectedTopic(null);
    }
  };

  const handleDeleteGroup = (chatId: string) => {
    deleteChat(chatId).catch(() => {});
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

  const handleDeleteUser = async (deletedUserId: string) => {
    setAllUsers(prev => prev.filter(u => u.id !== deletedUserId));
    setChats(prev => {
      const updated = prev
        .map(chat => {
          if (chat.participants?.includes(deletedUserId)) {
            const newParticipants = chat.participants.filter(id => id !== deletedUserId);
            updateChat(chat.id, { participants: newParticipants }).catch(() => {});
            return { ...chat, participants: newParticipants };
          }
          return chat;
        })
        .filter(chat => {
          if (chat.type === 'private' && chat.participants) {
            if (chat.participants.length < 2) {
              deleteChat(chat.id).catch(() => {});
              return false;
            }
          }
          return true;
        });
      return updated;
    });
    try {
      const { deleteUser } = await import('@/services/api');
      await deleteUser(deletedUserId);
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
    updateChat(chatId, { leadTeachers }).catch(() => {});
  };

  const handleUpdateParticipants = (chatId: string, participantIds: string[]) => {
    const chat = chats.find(c => c.id === chatId);
    let finalParticipants = participantIds;
    if (chat?.type === 'group') {
      const teacherAndAdminIds = allUsers
        .filter(u => u.role === 'teacher' || u.role === 'admin')
        .map(u => u.id);
      finalParticipants = [...new Set([...participantIds, ...teacherAndAdminIds, SUPERVISOR_ID])];
    }
    setChats(prev => {
      const updated = prev.map(c =>
        c.id === chatId
          ? { ...c, participants: finalParticipants }
          : c
      );
      localStorage.setItem('chats', JSON.stringify(updated));
      return updated;
    });
    updateChat(chatId, { participants: finalParticipants }).catch(() => {});
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
    updateChat(chatId, { leadAdmin: leadAdmin || null }).catch(() => {});
  };

  const handleReply = (message: Message) => {
    setReplyTo({
      id: message.id,
      sender: message.sender,
      text: message.text || 'Вложение',
    });
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleForwardMessage = async (message: Message, targetChatId: string, targetTopicId?: string, comment?: string) => {
    const messageId = Date.now().toString();
    const senderName = userName || (userRole === 'admin' ? 'Администратор' : 'Пользователь');
    const targetId = targetTopicId || targetChatId;

    const sourceChatName = chats.find(c => c.id === selectedChat)?.name || '';
    const sourceTopicName = selectedTopic && selectedGroup
      ? groupTopics[selectedGroup]?.find(t => t.id === selectedTopic)?.name
      : undefined;
    const fullSourceName = sourceTopicName ? `${sourceChatName} → ${sourceTopicName}` : sourceChatName;

    const forwardedMsg: Message = {
      id: messageId,
      text: comment || undefined,
      sender: senderName,
      senderId: userId,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      attachments: message.attachments,
      status: 'sending',
      forwardedFrom: {
        id: message.id,
        sender: message.sender,
        text: message.text || 'Вложение',
        date: message.timestamp,
        chatName: fullSourceName,
      },
    };

    setChatMessages(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), forwardedMsg],
    }));

    try {
      await apiSendMessage({
        id: messageId,
        chatId: targetChatId,
        topicId: targetTopicId,
        senderId: userId,
        senderName,
        text: comment || undefined,
        attachments: message.attachments?.map(att => ({
          type: att.type,
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          fileSize: att.fileSize,
        })),
        forwardedFromId: message.id,
        forwardedFromSender: message.sender,
        forwardedFromText: message.text || 'Вложение',
        forwardedFromDate: message.timestamp,
        forwardedFromChatName: fullSourceName,
      });

      wsService.notifyNewMessage(messageId, targetChatId, targetTopicId);

      setChatMessages(prev => ({
        ...prev,
        [targetId]: (prev[targetId] || []).map(msg =>
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        ),
      }));
    } catch (error) {
      console.error('Failed to forward message:', error);
    }
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
    updateChat(chatId, updates).catch(() => {});
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
    handleArchiveChat,
    handleDeleteUser,
    handleUpdateTeacher,
    handleUpdateLeadTeachers,
    handleUpdateLeadAdmin,
    handleUpdateParticipants,
    handleUpdateGroupInfo,
    handleAddAdmin,
    replyTo,
    handleReply,
    handleCancelReply,
    handleForwardMessage,
  };
};