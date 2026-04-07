import { useState, useEffect, useMemo, useRef } from 'react';
import { UserRole, AttachedFile, Message, Chat, GroupTopics, isAdminRole } from '@/types/chat.types';
import { initialGroupTopics, initialChatMessages } from '@/data/mockChatData';
import { teacherAccounts } from '@/data/teacherAccounts';
import { testAccounts } from '@/data/testAccounts';
import { wsService } from '@/services/websocket';
import { getUsers, getChats, getMessages, createChat, updateChat, deleteChat, markAsRead, sendMessage as apiSendMessage, toggleReaction, addConclusion, updateConclusion, deleteConclusion, deleteMessage as apiDeleteMessage, sendTyping, stopTyping, getTypingUsers, uploadFile } from '@/services/api';
import type { Message as ApiMessage } from '@/services/api';
import { checkAndPlaySound, requestNotificationPermission, resetNotificationState, updateAppBadge, updateDocumentTitle, ensurePushSubscription, playNotificationSound, markSoundPlayed } from '@/utils/notificationSound';
import { applyAdminDefaults, applyNonLeadDefaults, getChatSettings, syncMutedSettingsToSW, initNotificationSettingsForUser, shouldPlaySound } from '@/utils/notificationSettings';

const SUPERVISOR_ID = 'admin';

const parseServerDate = (dateStr: string): Date => {
  let s = dateStr;
  if (!s.endsWith('Z') && !s.includes('+')) s += 'Z';
  return new Date(s);
};

const mapApiMessages = (msgs: ApiMessage[], currentUserId?: string): Message[] =>
  msgs.map(m => ({
    id: m.id,
    text: m.text,
    sender: m.sender_name,
    senderId: m.sender_id,
    timestamp: parseServerDate(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    date: m.created_at,
    isOwn: currentUserId ? m.sender_id === currentUserId : false,
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
  const apiIds = new Set(fromApi.map(m => m.id));
  const merged = new Map<string, Message>();
  existing.forEach(msg => {
    // Keep: sending, error, scheduled, or already confirmed by API
    // Also keep 'delivered' own messages that haven't appeared in API yet (race condition)
    if (msg.status === 'sending' || msg.status === 'error' || msg.scheduledAt || apiIds.has(msg.id) || (msg.isOwn && msg.status === 'delivered')) {
      merged.set(msg.id, msg);
    }
  });
  fromApi.forEach(msg => {
    const ex = merged.get(msg.id);
    if (ex && ex.scheduledAt) {
      return;
    }
    if (ex && ex.isOwn) {
      const resolvedStatus = ex.status === 'sending' ? 'delivered' : ex.status;
      merged.set(msg.id, { ...msg, timestamp: ex.timestamp, date: ex.date, isOwn: true, status: resolvedStatus });
    } else {
      merged.set(msg.id, { ...ex, ...msg });
    }
  });
  const arr = Array.from(merged.values());
  arr.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return da - db;
  });
  return arr;
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
  lessonForms?: 'individual' | 'group' | 'both';
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

const runCacheCleanup = () => {
  const key = 'cache_cleanup_v1';
  if (localStorage.getItem(key)) return;
  localStorage.removeItem('chats');
  localStorage.removeItem('chatMessages');
  localStorage.removeItem('groupTopics');
  localStorage.removeItem('allUsers');
  localStorage.removeItem('usersVersion');
  localStorage.removeItem('chats_migration_v6_final');
  localStorage.removeItem('topics_migration_standard_v2');
  localStorage.removeItem('scheduledMessages');
  localStorage.setItem(key, 'true');
};
runCacheCleanup();

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
  
  const VERSION = 'v11-original-avatars';
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
  const [muteVersion, setMuteVersion] = useState(0);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; sender: string; text: string } | null>(null);
  const messageTextRef = useRef('');
  const attachmentsRef = useRef(attachments);
  const replyToRef = useRef(replyTo);
  const selectedChatRef = useRef(selectedChat);
  const selectedTopicRef = useRef(selectedTopic);
  const selectedGroupRef = useRef(selectedGroup);
  attachmentsRef.current = attachments;
  replyToRef.current = replyTo;
  selectedChatRef.current = selectedChat;
  selectedTopicRef.current = selectedTopic;
  selectedGroupRef.current = selectedGroup;
  
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
        { suffix: '-cancellation', name: 'Перенос/отмена', icon: 'XCircle' },
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
      try {
        const parsed = JSON.parse(stored);
        const trimmed: Record<string, Message[]> = {};
        for (const [key, msgs] of Object.entries(parsed)) {
          const arr = msgs as Message[];
          trimmed[key] = arr.length > 50 ? arr.slice(-50) : arr;
        }
        return trimmed;
      } catch {
        localStorage.removeItem('chatMessages');
      }
    }
    return initialChatMessages;
  });
  const [allUsers, setAllUsers] = useState<User[]>(loadUsersFromStorage);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTypingRef = useRef(false);

  type ScheduledMessage = {
    id: string;
    chatId: string;
    topicId?: string;
    targetId: string;
    message: Message;
    scheduledAt: string;
    timerId?: ReturnType<typeof setTimeout>;
  };
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>(() => {
    const stored = localStorage.getItem('scheduledMessages');
    if (stored) {
      try { return JSON.parse(stored); } catch { /* ignore */ }
    }
    return [];
  });
  const executedScheduledIds = useRef<Set<string>>(new Set());
  const activeSendsRef = useRef(0);
  const [isSending, setIsSending] = useState(false);
  const pendingPayloads = useRef<Map<string, { targetId: string; payload: Parameters<typeof apiSendMessage>[0] }>>(new Map());

  const sendWithRetry = (msgId: string, targetId: string, payload: Parameters<typeof apiSendMessage>[0], attempt = 0) => {
    if (attempt === 0) pendingPayloads.current.set(msgId, { targetId, payload });
    activeSendsRef.current++;
    if (attempt === 0) setIsSending(true);
    const controller = new AbortController();
    const hasAttachments = (payload.attachments?.length ?? 0) > 0;
    const timeout = setTimeout(() => controller.abort(), hasAttachments ? 60000 : 20000);

    apiSendMessage(payload, controller.signal).then(() => {
      clearTimeout(timeout);
      pendingPayloads.current.delete(msgId);
      setChatMessages(prev => ({
        ...prev,
        [targetId]: (prev[targetId] || []).map(msg =>
          msg.id === msgId ? { ...msg, status: 'delivered' } : msg
        )
      }));
    }).catch(() => {
      clearTimeout(timeout);
      if (attempt < 2) {
        setTimeout(() => sendWithRetry(msgId, targetId, payload, attempt + 1), 1000 * (attempt + 1));
        return;
      }
      setChatMessages(prev => ({
        ...prev,
        [targetId]: (prev[targetId] || []).map(msg =>
          msg.id === msgId ? { ...msg, status: 'error' } : msg
        )
      }));
    }).finally(() => {
      activeSendsRef.current = Math.max(0, activeSendsRef.current - 1);
      if (activeSendsRef.current === 0) setIsSending(false);
    });
  };

  const roleLabels: Record<string, string> = {
    admin: 'админ',
    teacher: 'педагог',
    parent: 'родитель',
    student: 'ученик',
    tech_specialist: 'технический специалист',
  };

  const getRoleLabel = (role: string, uid?: string) => {
    if (role === 'admin' && uid === SUPERVISOR_ID) return 'руководитель';
    return roleLabels[role] || role;
  };

  const compressedAvatars: Record<string, string> = {
    'https://cdn.poehali.dev/files/Админ.jpg': 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/bucket/e57b1e03-89ea-4d34-867f-424c328ebc3a.png',
    'https://cdn.poehali.dev/files/Педагог.jpg': 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/bucket/0f4a037b-6f5b-471d-8d66-d95961978d35.png',
    'https://cdn.poehali.dev/files/Родитель.jpg': 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/bucket/7736a262-53fd-443f-b073-6c8e3ab5611a.png',
    'https://cdn.poehali.dev/files/Ученик.jpg': 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/bucket/e1203105-ee3a-498d-8b65-0319a091b368.png',
  };
  const getCompressedAvatar = (url?: string) => url ? (compressedAvatars[url] || url) : undefined;

  const allUsersMap = useMemo(() => {
    const m = new Map<string, typeof allUsers[0]>();
    allUsers.forEach(u => m.set(u.id, u));
    return m;
  }, [allUsers]);

  const messages = useMemo(() => {
    const raw = selectedTopic 
      ? (chatMessages[selectedTopic] || []) 
      : selectedChat 
      ? (chatMessages[selectedChat] || []) 
      : [];
    return raw.map(msg => {
      const user = msg.senderId ? allUsersMap.get(msg.senderId) : undefined;
      const roleLabel = user?.role ? getRoleLabel(user.role, user.id) : undefined;
      return {
        ...msg,
        sender: msg.sender,
        senderRoleLabel: roleLabel,
        senderAvatar: getCompressedAvatar(msg.senderAvatar) || getCompressedAvatar(user?.avatar) || undefined,
        isOwn: msg.senderId ? msg.senderId === userId : msg.isOwn,
      };
    });
  }, [selectedTopic, selectedChat, chatMessages, userId, allUsersMap]);

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
      }
    }
  }, [isAuthenticated, userRole, userId]);

  // Подключение WebSocket и загрузка данных из API
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    // ⚠️ CRITICAL: initNotificationSettingsForUser ДОЛЖЕН быть первым!
    // Привязывает localStorage/IndexedDB мьюты к userId.
    // Без этого мьюты админа блокируют пуши родителю на том же устройстве.
    initNotificationSettingsForUser(userId);
    requestNotificationPermission();
    // Задержка нужна чтобы SW успел активироваться после загрузки страницы (особенно на iOS)
    const pushTimer = setTimeout(() => { ensurePushSubscription(userId); }, 2000);

    const STUDENT_ALLOWED_SUFFIXES = ['-important', '-zoom', '-homework', '-reports', '-cancellation'];
    const isTopicAccessible = (topicId: string | undefined) => {
      if (!topicId) return true;
      if (userRole === 'teacher' && topicId.endsWith('-admin-contact')) return false;
      if (userRole === 'student' && !STUDENT_ALLOWED_SUFFIXES.some(s => topicId.endsWith(s))) return false;
      return true;
    };

    const recalcGroupUnread = (chat: Chat, topics: { id: string; name: string; unread: number; unreadMentions?: number }[]) => {
      const accessible = topics.filter(t => {
        if (userRole === 'teacher' && t.id.endsWith('-admin-contact')) return false;
        if (userRole === 'student' && !STUDENT_ALLOWED_SUFFIXES.some(s => t.id.endsWith(s))) return false;
        return true;
      });
      let unmutedUnread = 0;
      let allMentions = 0;
      let mutedHasUnread = false;
      let mutedMentions = 0;
      for (const topic of accessible) {
        const s = getChatSettings(topic.id);
        const isMuted = !s.sound && !s.push;
        allMentions += topic.unreadMentions || 0;
        if (isMuted) {
          if (topic.unread > 0) mutedHasUnread = true;
          mutedMentions += topic.unreadMentions || 0;
        } else {
          unmutedUnread += topic.unread;
        }
      }
      return { ...chat, unread: unmutedUnread + mutedMentions, unreadMentions: allMentions, hasMutedUnread: mutedHasUnread };
    };

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
        conclusionPdf: c.conclusion_pdf as string | undefined,
        conclusions: (c.conclusions as Array<{ id: number; conclusionLink?: string; conclusionPdf?: string; createdDate: string }>) || [],
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
          unreadMentions: (t.unread_mentions || 0) as number,
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
            setGroupTopics(mappedTopics);
            setChats(withStaff.map(c => c.type === 'group' && mappedTopics[c.id] ? recalcGroupUnread(c, mappedTopics[c.id]) : c));
            if (isAdminRole(userRole)) {
              const allTopicIds = Object.values(mappedTopics).flat().map(t => t.id);
              applyAdminDefaults(allTopicIds);
              setMuteVersion(v => v + 1);
            }
            if (userRole === 'teacher' || isAdminRole(userRole)) {
              const nonLeadIds: string[] = [];
              for (const c of withStaff) {
                if (c.type !== 'group' || c.id === 'teachers-group') continue;
                const isNonLead = userRole === 'teacher'
                  ? (!c.leadTeachers || c.leadTeachers.length === 0 || !c.leadTeachers.includes(userId))
                  : (isAdminRole(userRole) && userId !== SUPERVISOR_ID && c.leadAdmin && c.leadAdmin !== userId);
                if (isNonLead) {
                  nonLeadIds.push(c.id);
                  if (mappedTopics[c.id]) {
                    nonLeadIds.push(...mappedTopics[c.id].map(t => t.id));
                  }
                }
              }
              if (nonLeadIds.length > 0) {
                applyNonLeadDefaults(nonLeadIds);
                setMuteVersion(v => v + 1);
              }
            }
            syncMutedSettingsToSW();
            const topicItems = Object.values(mappedTopics).flat().filter(t => isTopicAccessible(t.id)).map(t => ({ id: t.id, name: t.name, unread: t.unread, unreadMentions: t.unreadMentions }));
            checkAndPlaySound(withStaff.map(c => ({ id: c.id, name: c.name, unread: c.unread, unreadMentions: c.unreadMentions })), topicItems);
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
          setGroupTopics(mappedTopics);
          setChats(withStaff.map(c => c.type === 'group' && mappedTopics[c.id] ? recalcGroupUnread(c, mappedTopics[c.id]) : c));
          if (isAdminRole(userRole)) {
            const allTopicIds = Object.values(mappedTopics).flat().map(t => t.id);
            applyAdminDefaults(allTopicIds);
            setMuteVersion(v => v + 1);
          }
          if (userRole === 'teacher' || isAdminRole(userRole)) {
            const nonLeadTopicIds: string[] = [];
            for (const c of withStaff) {
              if (c.type !== 'group' || c.id === 'teachers-group') continue;
              const isNonLead = userRole === 'teacher'
                ? (!c.leadTeachers || c.leadTeachers.length === 0 || !c.leadTeachers.includes(userId))
                : (isAdminRole(userRole) && userId !== SUPERVISOR_ID && c.leadAdmin && c.leadAdmin !== userId);
              if (isNonLead) {
                nonLeadTopicIds.push(c.id);
                if (mappedTopics[c.id]) {
                  nonLeadTopicIds.push(...mappedTopics[c.id].map(t => t.id));
                }
              }
            }
            if (nonLeadTopicIds.length > 0) {
              applyNonLeadDefaults(nonLeadTopicIds);
              setMuteVersion(v => v + 1);
            }
          }
          syncMutedSettingsToSW();
          const topicItems = Object.values(mappedTopics).flat().filter(t => isTopicAccessible(t.id)).map(t => ({ id: t.id, name: t.name, unread: t.unread, unreadMentions: t.unreadMentions }));
          const chatsNoGroups = withStaff.filter(c => !mappedTopics[c.id] || mappedTopics[c.id].length === 0);
          checkAndPlaySound(chatsNoGroups.map(c => ({ id: c.id, name: c.name, unread: c.unread, unreadMentions: c.unreadMentions })), topicItems);
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
      if (!isTopicAccessible(data.topicId)) return;

      try {
        const msgs = await getMessages(data.chatId, data.topicId);
        const targetId = data.topicId || data.chatId;
        const prevMsgs = chatMessages[targetId] || [];
        const newMsgs = mapApiMessages(msgs, userId);
        setChatMessages(prev => ({
          ...prev,
          [targetId]: mergeMessages(prev[targetId] || [], newMsgs)
        }));

        const isCurrentChat = data.chatId === selectedChat && (!data.topicId || data.topicId === selectedTopic);
        if (!isCurrentChat) {
          const mentionTag = userName ? `@[${userName}` : null;
          const adminMentionTag = isAdminRole(userRole) ? '@[админ' : null;
          const addedMsgs = newMsgs.filter(m => !prevMsgs.some(pm => pm.id === m.id) && !m.isOwn);
          const hasMention = addedMsgs.some(m => {
            if (!m.text) return false;
            if (mentionTag && m.text.includes(mentionTag)) return true;
            if (adminMentionTag && m.text.includes(adminMentionTag)) return true;
            return false;
          });

          const soundTarget = data.topicId || data.chatId;
          if (addedMsgs.length > 0 && (hasMention || shouldPlaySound(soundTarget))) {
            playNotificationSound();
          }

          if (data.topicId) {
            setGroupTopics(prev => {
              const groupTopicsList = prev[data.chatId];
              if (!groupTopicsList) return prev;
              const updatedTopics = groupTopicsList.map(t =>
                t.id === data.topicId ? {
                  ...t,
                  unread: t.unread + 1,
                  unreadMentions: (t.unreadMentions || 0) + (hasMention ? 1 : 0)
                } : t
              );
              const targetTopic = updatedTopics.find(t => t.id === data.topicId);
              if (targetTopic) {
                markSoundPlayed(data.topicId, targetTopic.unread, targetTopic.unreadMentions || 0);
              }
              setChats(prevChats => {
                const chat = prevChats.find(c => c.id === data.chatId);
                if (!chat) return prevChats;
                const recalced = recalcGroupUnread(chat, updatedTopics);
                const updated = prevChats.map(c => c.id === data.chatId ? recalced : c);
                const totalUnread = updated.reduce((sum, c) => sum + c.unread, 0);
                updateAppBadge(totalUnread);
                updateDocumentTitle(totalUnread);
                return updated;
              });
              return { ...prev, [data.chatId]: updatedTopics };
            });
          } else {
            setChats(prev => {
              const updated = prev.map(c => {
                if (c.id !== data.chatId) return c;
                const newUnread = c.unread + 1;
                const newMentions = (c.unreadMentions || 0) + (hasMention ? 1 : 0);
                markSoundPlayed(data.chatId, newUnread, newMentions);
                return { ...c, unread: newUnread, unreadMentions: newMentions };
              });
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

    const pollChats = () => {
      getChats(userId).then(chatsData => {
        if (chatsData.chats.length > 0) {
          const { mappedChats, mappedTopics } = mapChatsData(chatsData as { chats: Record<string, unknown>[]; topics: Record<string, unknown[]> });
          const deduped = deduplicatePrivateChats(mappedChats);
          const withStaff = (userRole === 'teacher' || isAdminRole(userRole)) ? ensureStaffChats(userRole, userId, deduped, allUsers) : deduped;
          const topicItems = Object.values(mappedTopics).flat().filter(t => isTopicAccessible(t.id)).map(t => ({ id: t.id, name: t.name, unread: t.unread, unreadMentions: t.unreadMentions }));
          const chatsWithoutGroups = withStaff.filter(c => !mappedTopics[c.id] || mappedTopics[c.id].length === 0);
          checkAndPlaySound(chatsWithoutGroups.map(c => ({ id: c.id, name: c.name, unread: c.unread, unreadMentions: c.unreadMentions })), topicItems);
          const openChatId = selectedChatRef.current;
          const openTopicId = selectedTopicRef.current;
          const isTabVisible = !document.hidden;
          if (isTabVisible && openChatId && openTopicId && mappedTopics[openChatId]) {
            mappedTopics[openChatId] = mappedTopics[openChatId].map(t =>
              t.id === openTopicId ? { ...t, unread: 0, unreadMentions: 0 } : t
            );
          }
          setGroupTopics(mappedTopics);
          setChats(prev => {
            const result = withStaff.map(fresh => {
              if (fresh.id === openChatId && isTabVisible) {
                const old = prev.find(c => c.id === openChatId);
                fresh = { ...fresh, unread: old ? old.unread : 0, unreadMentions: old ? old.unreadMentions : 0 };
              }
              if (fresh.type === 'group' && mappedTopics[fresh.id]) {
                return recalcGroupUnread(fresh, mappedTopics[fresh.id]);
              }
              return fresh;
            });
            const totalUnread = result.reduce((sum, c) => sum + c.unread, 0);
            updateAppBadge(totalUnread);
            updateDocumentTitle(totalUnread);
            return result;
          });
        }
      }).catch(() => {});
    };
    let pollInterval = setInterval(pollChats, document.hidden ? 15000 : 3000);

    const onVisibilityChange = () => {
      clearInterval(pollInterval);
      if (!document.hidden) {
        pollChats();
        pollInterval = setInterval(pollChats, 3000);
      } else {
        pollInterval = setInterval(pollChats, 15000);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(pushTimer);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const chatId = selectedChat;
    const topicId = selectedTopic;
    if (!chatId) return;

    const targetId = topicId || chatId;
    const hasCached = (chatMessages[targetId] || []).length > 0;
    if (!hasCached) setMessagesLoading(true);
    let firstLoad = true;

    const pollMessages = () => {
      if (!firstLoad && (document.hidden || activeSendsRef.current > 0)) return;
      getMessages(chatId, topicId || undefined).then(msgs => {
        const mapped = mapApiMessages(msgs, userId);
        setChatMessages(prev => {
          const old = prev[targetId] || [];
          const merged = mergeMessages(old, mapped);
          if (merged.length > old.length) {
            markAsRead(userId, chatId, topicId || undefined).catch(() => {});
          }
          return { ...prev, [targetId]: merged };
        });
        if (firstLoad) {
          setMessagesLoading(false);
          firstLoad = false;
        }
      }).catch(() => {
        if (firstLoad) {
          setMessagesLoading(false);
          firstLoad = false;
        }
      });
    };
    pollMessages();
    let poll = setInterval(pollMessages, document.hidden ? 15000 : 2000);

    const onVisibilityChangeMsgs = () => {
      clearInterval(poll);
      if (!document.hidden) {
        pollMessages();
        poll = setInterval(pollMessages, 2000);
      } else {
        poll = setInterval(pollMessages, 15000);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChangeMsgs);

    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisibilityChangeMsgs);
    };
  }, [isAuthenticated, userId, selectedChat, selectedTopic]);

  // Polling индикатора "печатает..." для групповых чатов
  useEffect(() => {
    if (!isAuthenticated || !userId || !selectedChat) {
      setTypingUsers([]);
      return;
    }
    // Только для групповых чатов — проверяем по selectedGroup
    if (!selectedGroup) {
      setTypingUsers([]);
      return;
    }

    const pollTyping = () => {
      if (document.hidden) return;
      getTypingUsers(userId, selectedChat, selectedTopic || undefined).then(users => {
        setTypingUsers(users);
      }).catch(() => {});
    };

    pollTyping();
    if (typingPollRef.current) clearInterval(typingPollRef.current);
    typingPollRef.current = setInterval(pollTyping, 2000);

    return () => {
      if (typingPollRef.current) {
        clearInterval(typingPollRef.current);
        typingPollRef.current = null;
      }
      setTypingUsers([]);
    };
  }, [isAuthenticated, userId, selectedChat, selectedTopic, selectedGroup]);

  // Сохраняем данные в localStorage с debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('allUsers', JSON.stringify(allUsers));
        localStorage.setItem('chats', JSON.stringify(chats));
        localStorage.setItem('groupTopics', JSON.stringify(groupTopics));
        const trimmedMessages: Record<string, Message[]> = {};
        for (const [key, msgs] of Object.entries(chatMessages)) {
          trimmedMessages[key] = msgs.length > 50 ? msgs.slice(-50) : msgs;
        }
        localStorage.setItem('chatMessages', JSON.stringify(trimmedMessages));
      } catch {
        localStorage.removeItem('chatMessages');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [allUsers, chats, groupTopics, chatMessages]);

  useEffect(() => {
    setChats(prevChats => {
      const updated = prevChats.map(chat => {
        if (chat.type === 'group' && groupTopics[chat.id]) {
          const topics = groupTopics[chat.id].filter(t => {
            if (userRole === 'teacher' && t.id.endsWith('-admin-contact')) return false;
            if (userRole === 'student' && !['-important', '-zoom', '-homework', '-reports', '-cancellation'].some(s => t.id.endsWith(s))) return false;
            return true;
          });
          let unmutedUnread = 0;
          let allMentions = 0;
          let mutedHasUnread = false;
          let mutedMentions = 0;
          for (const topic of topics) {
            const s = getChatSettings(topic.id);
            const isMuted = !s.sound && !s.push;
            allMentions += topic.unreadMentions || 0;
            if (isMuted) {
              if (topic.unread > 0) mutedHasUnread = true;
              mutedMentions += topic.unreadMentions || 0;
            } else {
              unmutedUnread += topic.unread;
            }
          }
          return {
            ...chat,
            unread: unmutedUnread + mutedMentions,
            unreadMentions: allMentions,
            hasMutedUnread: mutedHasUnread,
          };
        }
        return chat;
      });
      const totalUnread = updated.reduce((sum, c) => sum + c.unread, 0);
      updateAppBadge(totalUnread);
      updateDocumentTitle(totalUnread);
      return updated;
    });
  }, [muteVersion]);

  const handleSelectChat = (chatId: string | null) => {
    if (!chatId) {
      setSelectedChat(null);
      setSelectedGroup(null);
      setSelectedTopic(null);
      selectedChatRef.current = null;
      selectedGroupRef.current = null;
      selectedTopicRef.current = null;
      return;
    }
    const chat = chats.find(c => c.id === chatId);
    setSelectedChat(chatId);
    selectedChatRef.current = chatId;
    
    let firstTopicId: string | null = null;
    if (chat && chat.type === 'group') {
      setSelectedGroup(chatId);
      selectedGroupRef.current = chatId;
      const topics = groupTopics[chatId];
      if (topics && topics.length > 0) {
        if (userRole === 'teacher' || userRole === 'student') {
          const firstNonAdmin = topics.find(t => !t.id.endsWith('-admin-contact'));
          firstTopicId = firstNonAdmin ? firstNonAdmin.id : topics[0].id;
        } else {
          firstTopicId = topics[0].id;
        }
        setSelectedTopic(firstTopicId);
        selectedTopicRef.current = firstTopicId;
      }
    } else {
      setSelectedGroup(null);
      setSelectedTopic(null);
      selectedGroupRef.current = null;
      selectedTopicRef.current = null;
    }
    
    setChats(prevChats => {
      const updated = prevChats.map(c => 
        c.id === chatId ? { ...c, unread: 0, unreadMentions: 0 } : c
      );
      const totalUnread = updated.reduce((sum, c) => sum + c.unread, 0);
      updateAppBadge(totalUnread);
      updateDocumentTitle(totalUnread);
      return updated;
    });

    if (userId) {
      if (firstTopicId) {
        markAsRead(userId, chatId, firstTopicId).catch(() => {});
        setGroupTopics(prev => {
          if (!prev[chatId]) return prev;
          return {
            ...prev,
            [chatId]: prev[chatId].map(t =>
              t.id === firstTopicId ? { ...t, unread: 0, unreadMentions: 0 } : t
            )
          };
        });
      } else {
        markAsRead(userId, chatId).catch(() => {});
      }
    }
  };

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopic(topicId);
    selectedTopicRef.current = topicId;
    
    if (selectedGroup) {
      setGroupTopics(prev => {
        const updatedTopics = {
          ...prev,
          [selectedGroup]: prev[selectedGroup].map(topic =>
            topic.id === topicId ? { ...topic, unread: 0, unreadMentions: 0 } : topic
          )
        };
        let topicUnread = 0;
        let topicMutedHasUnread = false;
        let topicAllMentions = 0;
        let topicMutedMentions = 0;
        for (const t of updatedTopics[selectedGroup]) {
          const ts = getChatSettings(t.id);
          topicAllMentions += t.unreadMentions || 0;
          if (!ts.sound && !ts.push) {
            if (t.unread > 0) topicMutedHasUnread = true;
            topicMutedMentions += t.unreadMentions || 0;
          } else {
            topicUnread += t.unread;
          }
        }
        setChats(prevChats => {
          const updated = prevChats.map(c =>
            c.id === selectedGroup ? { ...c, unread: topicUnread + topicMutedMentions, unreadMentions: topicAllMentions, hasMutedUnread: topicMutedHasUnread } : c
          );
          const totalUnread = updated.reduce((sum, c) => sum + c.unread, 0);
          updateAppBadge(totalUnread);
          updateDocumentTitle(totalUnread);
          return updated;
        });
        return updatedTopics;
      });

      if (userId) {
        markAsRead(userId, selectedGroup, topicId).catch(() => {});
      }

      getMessages(selectedGroup, topicId).then(msgs => {
        setChatMessages(prev => ({ ...prev, [topicId]: mergeMessages(prev[topicId] || [], mapApiMessages(msgs, userId)) }));
      }).catch(() => {});
    }
  };

  const handleSendMessage = () => {
    const currentText = messageTextRef.current;
    const currentAttachments = [...attachmentsRef.current];
    const currentReplyTo = replyToRef.current;
    const currentChat = selectedChatRef.current;
    const currentTopic = selectedTopicRef.current;
    const currentGroup = selectedGroupRef.current;

    if (!currentChat || (!currentText.trim() && currentAttachments.length === 0)) return;

    // Останавливаем typing-индикатор при отправке сообщения
    if (isTypingRef.current && userId) {
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      stopTyping(userId, currentChat, selectedTopic || undefined);
    }

    messageTextRef.current = '';
    setAttachments([]);
    setReplyTo(null);
    attachmentsRef.current = [];
    replyToRef.current = null;

    const targetId = currentTopic || currentChat;
    const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const senderName = userName || (isAdminRole(userRole) ? 'Администратор' : 'Пользователь');
    const defaultAvatars: Record<string, string> = {
      admin: 'https://cdn.poehali.dev/files/Админ.jpg',
      teacher: 'https://cdn.poehali.dev/files/Педагог.jpg',
      parent: 'https://cdn.poehali.dev/files/Родитель.jpg',
      student: 'https://cdn.poehali.dev/files/Ученик.jpg',
    };
    const senderAvatar = allUsers.find(u => u.id === userId)?.avatar || defaultAvatars[userRole || ''];
    const now = new Date();
    const nowISO = now.toISOString();
    const newMessage: Message = {
      id: messageId,
      text: currentText || undefined,
      sender: senderName,
      senderId: userId,
      senderRole: userRole || undefined,
      senderAvatar: senderAvatar,
      timestamp: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      date: nowISO,
      isOwn: true,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      status: 'sending',
      replyTo: currentReplyTo || undefined,
    };
    
    setChatMessages(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), newMessage]
    }));

    const msgPreview = currentText ? (currentText.length > 40 ? currentText.slice(0, 40) + '...' : currentText) : 'Вложение';
    const nowTime = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    setChats(prev => {
      const updated = prev.map(chat =>
        chat.id === currentChat
          ? { ...chat, lastMessage: `${senderName}: ${msgPreview}`, timestamp: nowTime }
          : chat
      );
      const idx = updated.findIndex(c => c.id === currentChat);
      if (idx > 0) {
        const [moved] = updated.splice(idx, 1);
        const pinnedCount = updated.filter(c => c.isPinned || c.id === 'teachers-group').length;
        updated.splice(pinnedCount, 0, moved);
      }
      return updated;
    });

    if (currentTopic && currentGroup) {
      setGroupTopics(prev => ({
        ...prev,
        [currentGroup]: prev[currentGroup]?.map(topic =>
          topic.id === currentTopic
            ? { ...topic, lastMessage: msgPreview, timestamp: nowTime }
            : topic
        ) || []
      }));
    }

    // Загружаем base64-вложения в S3 перед отправкой, чтобы не слать тяжёлый base64 в тело запроса
    const uploadAttachments = async () => {
      const uploaded = await Promise.all(
        currentAttachments.map(async (att) => {
          if (att.fileUrl && att.fileUrl.startsWith('data:')) {
            try {
              const cdnUrl = await uploadFile(att.fileUrl, att.fileName || 'file');
              return { ...att, fileUrl: cdnUrl };
            } catch {
              return att;
            }
          }
          return att;
        })
      );
      sendWithRetry(messageId, targetId, {
        id: messageId,
        chatId: currentChat,
        topicId: currentTopic || undefined,
        senderId: userId,
        senderName: userName,
        text: currentText || undefined,
        createdAt: nowISO,
        attachments: uploaded.map(att => ({
          type: att.type,
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          fileSize: att.fileSize,
        })),
        replyToId: currentReplyTo?.id,
        replyToSender: currentReplyTo?.sender,
        replyToText: currentReplyTo?.text,
      });
    };
    uploadAttachments();
  };

  // Обработчик набора текста — отправляет typing-статус на сервер
  const handleTyping = (text: string) => {
    messageTextRef.current = text;
    if (!userId || !selectedChat || !userName) return;
    // Только для групповых чатов
    if (!selectedGroup) return;

    if (text.trim().length > 0) {
      // Отправить typing-событие
      sendTyping(userId, selectedChat, selectedTopic || undefined, userName);
      isTypingRef.current = true;

      // Сбросить таймер автоматической остановки
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        stopTyping(userId, selectedChat, selectedTopic || undefined);
      }, 3000);
    } else {
      // Поле очищено — сразу останавливаем
      if (isTypingRef.current) {
        isTypingRef.current = false;
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        stopTyping(userId, selectedChat, selectedTopic || undefined);
      }
    }
  };

  const handleBroadcast = (groupIds: string[], topicSuffix: string, text: string) => {
    const now = new Date();
    const nowISO = now.toISOString();
    const senderName = userName || (userRole === 'admin' ? 'Администратор' : 'Педагог');
    const defaultAvatars: Record<string, string> = {
      admin: 'https://cdn.poehali.dev/files/Админ.jpg',
      teacher: 'https://cdn.poehali.dev/files/Педагог.jpg',
    };
    const senderAvatar = allUsers.find(u => u.id === userId)?.avatar || defaultAvatars[userRole || ''];
    const timestamp = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    groupIds.forEach((groupId) => {
      const topicId = `${groupId}-${topicSuffix}`;
      const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${groupId}`;

      const newMsg: Message = {
        id: messageId,
        text,
        sender: senderName,
        senderId: userId,
        senderRole: userRole || undefined,
        senderAvatar,
        timestamp,
        date: nowISO,
        isOwn: true,
        status: 'sending',
      };

      setChatMessages(prev => ({
        ...prev,
        [topicId]: [...(prev[topicId] || []), newMsg],
      }));

      setChats(prev => prev.map(chat =>
        chat.id === groupId
          ? { ...chat, lastMessage: `${senderName}: ${text.slice(0, 40)}${text.length > 40 ? '...' : ''}`, timestamp }
          : chat
      ));

      const payload = {
        id: messageId,
        chatId: groupId,
        topicId,
        senderId: userId,
        senderName: userName,
        text,
        createdAt: nowISO,
        attachments: [],
      };

      sendWithRetry(messageId, topicId, payload);
    });
  };

  const executeScheduledMessage = (scheduled: ScheduledMessage) => {
    if (executedScheduledIds.current.has(scheduled.id)) return;
    executedScheduledIds.current.add(scheduled.id);

    const msg = {
      ...scheduled.message,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString(),
      status: 'sending' as const,
      scheduledAt: undefined,
    };

    setChatMessages(prev => {
      const existing = prev[scheduled.targetId] || [];
      const found = existing.some(m => m.id === scheduled.id);
      return {
        ...prev,
        [scheduled.targetId]: found
          ? existing.map(m => m.id === scheduled.id ? msg : m)
          : [...existing, msg]
      };
    });

    const senderName = msg.sender;
    const msgPreview = msg.text ? (msg.text.length > 40 ? msg.text.slice(0, 40) + '...' : msg.text) : 'Вложение';
    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    setChats(prev => prev.map(chat =>
      chat.id === scheduled.chatId
        ? { ...chat, lastMessage: `${senderName}: ${msgPreview}`, timestamp: now }
        : chat
    ));

    setScheduledMessages(prev => {
      const updated = prev.filter(s => s.id !== scheduled.id);
      localStorage.setItem('scheduledMessages', JSON.stringify(updated));
      return updated;
    });

    apiSendMessage({
      id: scheduled.id,
      chatId: scheduled.chatId,
      topicId: scheduled.topicId,
      senderId: userId,
      senderName: userName,
      text: msg.text,
      createdAt: new Date().toISOString(),
      attachments: msg.attachments?.map(att => ({
        type: att.type,
        fileUrl: att.fileUrl,
        fileName: att.fileName,
        fileSize: att.fileSize,
      })),
    }).then(() => {
      wsService.notifyNewMessage(scheduled.id, scheduled.chatId, scheduled.topicId);
      setChatMessages(prev => ({
        ...prev,
        [scheduled.targetId]: (prev[scheduled.targetId] || []).map(m =>
          m.id === scheduled.id ? { ...m, status: 'sent' } : m
        )
      }));
    }).catch(() => {
      setChatMessages(prev => ({
        ...prev,
        [scheduled.targetId]: (prev[scheduled.targetId] || []).map(m =>
          m.id === scheduled.id ? { ...m, status: 'sent' } : m
        )
      }));
    });
  };

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    scheduledMessages.forEach(scheduled => {
      const delay = new Date(scheduled.scheduledAt).getTime() - Date.now();
      if (delay <= 0) {
        executeScheduledMessage(scheduled);
      } else {
        const timer = setTimeout(() => executeScheduledMessage(scheduled), delay);
        timers.push(timer);
      }
    });
    return () => timers.forEach(t => clearTimeout(t));
  }, [scheduledMessages.length]);

  const handleScheduleMessage = (scheduledDate: Date) => {
    if (!selectedChat || (!messageTextRef.current.trim() && attachments.length === 0)) return;

    const targetId = selectedTopic || selectedChat;
    const messageId = `scheduled-${Date.now()}`;
    const senderName = userName || (isAdminRole(userRole) ? 'Администратор' : 'Пользователь');
    const defaultAvatars: Record<string, string> = {
      admin: 'https://cdn.poehali.dev/files/Админ.jpg',
      teacher: 'https://cdn.poehali.dev/files/Педагог.jpg',
      parent: 'https://cdn.poehali.dev/files/Родитель.jpg',
      student: 'https://cdn.poehali.dev/files/Ученик.jpg',
    };
    const senderAvatar = allUsers.find(u => u.id === userId)?.avatar || defaultAvatars[userRole || ''];

    const msg: Message = {
      id: messageId,
      text: messageTextRef.current || undefined,
      sender: senderName,
      senderId: userId,
      senderRole: userRole || undefined,
      senderAvatar: senderAvatar,
      timestamp: scheduledDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      date: scheduledDate.toISOString(),
      isOwn: true,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      status: 'sending',
      replyTo: replyTo || undefined,
      scheduledAt: scheduledDate.toISOString(),
    };

    const scheduled: ScheduledMessage = {
      id: messageId,
      chatId: selectedChat,
      topicId: selectedTopic || undefined,
      targetId,
      message: msg,
      scheduledAt: scheduledDate.toISOString(),
    };

    setScheduledMessages(prev => {
      const updated = [...prev, scheduled];
      localStorage.setItem('scheduledMessages', JSON.stringify(updated));
      return updated;
    });

    setChatMessages(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), msg]
    }));

    messageTextRef.current = '';
    setAttachments([]);
    setReplyTo(null);
    attachmentsRef.current = [];
    replyToRef.current = null;
  };

  const handleCancelScheduledMessage = (messageId: string) => {
    executedScheduledIds.current.delete(messageId);
    setScheduledMessages(prev => {
      const updated = prev.filter(s => s.id !== messageId);
      localStorage.setItem('scheduledMessages', JSON.stringify(updated));
      return updated;
    });

    setChatMessages(prev => {
      const newMessages: Record<string, Message[]> = {};
      for (const [key, msgs] of Object.entries(prev)) {
        newMessages[key] = msgs.filter(m => m.id !== messageId);
      }
      return newMessages;
    });
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
          const img = new Image();
          img.onload = () => {
            const MAX = 1600;
            let { width, height } = img;
            if (width > MAX || height > MAX) {
              if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
              else { width = Math.round(width * MAX / height); height = MAX; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            setAttachments(prev => [...prev, { type: 'image', fileUrl: compressed }]);
          };
          img.src = e.target?.result as string;
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
    
    const currentUserId = apiUserId || allUsers.find(u => u.name === name && u.role === role)?.id || (isAdminRole(role) ? 'admin' : '');
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
      if (role !== 'teacher' && !isAdminRole(role)) return;
      const teachersGroupId = 'teachers-group';
      const allTeacherIds = allUsers.filter(u => u.role === 'teacher').map(u => u.id);
      const allAdminIds = allUsers.filter(u => isAdminRole(u.role)).map(u => u.id);
      const allStaffIds = [...new Set([...allTeacherIds, ...allAdminIds])];
      createChat({
        id: teachersGroupId,
        name: 'Педагоги',
        type: 'group',
        participants: allStaffIds,
        isPinned: true,
        avatar: undefined,
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
    if (role !== 'teacher' && !isAdminRole(role)) return currentChats;

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
      const admins = apiUsers.filter(u => isAdminRole(u.role) && u.id !== SUPERVISOR_ID);
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

    if (isAdminRole(role)) {
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
      const otherAdmins = apiUsers.filter(u => isAdminRole(u.role) && u.id !== currentUserId && u.id !== SUPERVISOR_ID);
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
    messageTextRef.current = '';
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
    if (!selectedChat || !userId) return;
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

    toggleReaction(userId, messageId, emoji).catch(() => {});
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!selectedChat || !userId) return;
    const targetId = selectedTopic || selectedChat;
    setChatMessages(prev => ({
      ...prev,
      [targetId]: (prev[targetId] || []).filter(msg => msg.id !== messageId)
    }));
    apiDeleteMessage(userId, messageId).catch(() => {});
  };

  const handleRetryMessage = (message: Message) => {
    const pending = pendingPayloads.current.get(message.id);
    if (!pending) return;
    const { targetId, payload } = pending;
    setChatMessages(prev => ({
      ...prev,
      [targetId]: (prev[targetId] || []).map(msg =>
        msg.id === message.id ? { ...msg, status: 'sending' } : msg
      )
    }));
    sendWithRetry(message.id, targetId, payload, 0);
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
    const { createUser } = await import('@/services/api');
    await createUser({ id: newUser.id, name, phone, email: '', role: 'student', password, avatar: newUser.avatar });
    setAllUsers(prev => [...prev, newUser]);
  };

  const handleAddParent = async (name: string, phone: string, password: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      phone,
      password,
      role: 'parent',
      avatar: 'https://cdn.poehali.dev/files/Родитель.jpg',
    };
    const { createUser } = await import('@/services/api');
    await createUser({ id: newUser.id, name, phone, role: 'parent', password, avatar: newUser.avatar });
    setAllUsers(prev => [...prev, newUser]);
  };

  const handleAddTeacher = async (name: string, phone: string, password: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      phone,
      password,
      role: 'teacher',
      avatar: 'https://cdn.poehali.dev/files/Педагог.jpg',
    };
    const { createUser } = await import('@/services/api');
    await createUser({ id: newUser.id, name, phone, role: 'teacher', password, avatar: newUser.avatar });

    const updatedUsers = [...allUsers, newUser];
    setAllUsers(updatedUsers);
    
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.type === 'group' && chat.participants) {
          const newParticipants = [...chat.participants, newUser.id];
          updateChat(chat.id, { participants: newParticipants }).catch(() => {});
          return { ...chat, participants: newParticipants };
        }
        return chat;
      });
      
      if (userRole && userId) {
        return ensureStaffChats(userRole, userId, updatedChats, updatedUsers);
      }
      return updatedChats;
    });
  };

  const handleAddAdmin = async (name: string, phone: string, password: string) => {
    const newAdminId = `admin-${Date.now()}`;
    const newUser: User = {
      id: newAdminId,
      name,
      phone,
      password,
      role: 'admin',
      avatar: 'https://cdn.poehali.dev/files/Админ.jpg',
    };

    const { createUser } = await import('@/services/api');
    await createUser({ id: newAdminId, name, phone, role: 'admin', password, avatar: newUser.avatar });

    const updatedUsers = [...allUsers, newUser];
    setAllUsers(updatedUsers);

    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.type === 'group' && chat.participants) {
          const newParticipants = [...chat.participants, newAdminId];
          updateChat(chat.id, { participants: newParticipants }).catch(() => {});
          return { ...chat, participants: newParticipants };
        }
        return chat;
      });
      
      if (userRole && userId) {
        return ensureStaffChats(userRole, userId, updatedChats, updatedUsers);
      }
      return updatedChats;
    });
  };

  const handleCreateGroup = async (groupName: string, selectedUserIds: string[], schedule: string, conclusionLink: string, leadTeachers: string[] = [], leadAdmin?: string, conclusionPdfBase64?: string, conclusions?: Array<{ diagnosisDate?: string; conclusionLink?: string; conclusionPdfBase64?: string }>) => {
    const allTeachers = allUsers
      .filter(user => user.role === 'teacher')
      .map(user => user.id);
    const allTechSpecialists = allUsers
      .filter(user => user.role === 'tech_specialist')
      .map(user => user.id);
    const allParticipants = [...new Set([...selectedUserIds, ...allTeachers, ...allTechSpecialists, SUPERVISOR_ID, ...(leadAdmin ? [leadAdmin] : [])])];
    const groupId = Date.now().toString();

    const topics = [
      { id: `${groupId}-important`, name: 'Важное', icon: 'AlertCircle' },
      { id: `${groupId}-zoom`, name: 'Zoom', icon: 'Video' },
      { id: `${groupId}-homework`, name: 'ДЗ', icon: 'BookOpen' },
      { id: `${groupId}-reports`, name: 'Отчеты', icon: 'FileText' },
      { id: `${groupId}-payment`, name: 'Оплата', icon: 'CreditCard' },
      { id: `${groupId}-cancellation`, name: 'Перенос/отмена', icon: 'XCircle' },
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
        conclusionPdfBase64: conclusionPdfBase64 || undefined,
        topics,
        leadTeachers: leadTeachers.length > 0 ? leadTeachers : undefined,
        leadAdmin: leadAdmin || undefined,
      });
    } catch (err) {
      console.error('Failed to create group in DB:', err);
      alert('Не удалось создать группу. Попробуйте ещё раз.');
      return;
    }

    const createdConclusions: Array<{ id: number; conclusionLink?: string; conclusionPdf?: string; createdDate: string; diagnosisDate?: string }> = [];
    if (conclusions && conclusions.length > 0) {
      for (const c of conclusions) {
        try {
          const result = await addConclusion(groupId, {
            conclusionLink: c.conclusionLink,
            conclusionPdfBase64: c.conclusionPdfBase64,
            diagnosisDate: c.diagnosisDate,
          });
          createdConclusions.push(result);
        } catch (err) {
          console.error('Failed to add conclusion:', err);
        }
      }
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
      conclusions: createdConclusions.length > 0 ? createdConclusions : undefined,
      avatar: 'https://cdn.poehali.dev/files/Ученик.jpg',
    };
    setChats(prev => [newGroup, ...prev]);
    setGroupTopics(prev => ({
      ...prev,
      [groupId]: topics.map(t => ({ ...t, lastMessage: '', timestamp: '', unread: 0 })),
    }));
    if (isAdminRole(userRole)) {
      applyAdminDefaults(topics.map(t => t.id));
      setMuteVersion(v => v + 1);
      const isNonLeadAdmin = userId !== SUPERVISOR_ID && leadAdmin && leadAdmin !== userId;
      if (isNonLeadAdmin) {
        applyNonLeadDefaults([groupId, ...topics.map(t => t.id)]);
        setMuteVersion(v => v + 1);
      }
    } else if (userRole === 'teacher') {
      const isNonLeadTeacher = leadTeachers.length === 0 || !leadTeachers.includes(userId!);
      if (isNonLeadTeacher) {
        applyNonLeadDefaults([groupId, ...topics.map(t => t.id)]);
        setMuteVersion(v => v + 1);
      }
    }
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
      senderRole: 'admin' as const,
      senderAvatar: 'https://cdn.poehali.dev/files/Админ.jpg',
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString(),
      isOwn: true,
    };
    setChatMessages(prev => ({
      ...prev,
      [`${groupId}-important`]: [welcomeMsg]
    }));
    apiSendMessage({ id: welcomeMsg.id, chatId: groupId, topicId: `${groupId}-important`, senderId: 'admin', senderName: 'Виктория Абраменко', text: welcomeText }).catch(() => {});
  };

  const handleArchiveChat = (chatId: string, archive: boolean) => {
    if (archive && selectedChat === chatId) {
      setSelectedChat(null);
      setSelectedGroup(null);
      setSelectedTopic(null);
    }
    setTimeout(() => {
      setChats(prev => {
        const updated = prev.map(chat =>
          chat.id === chatId ? { ...chat, isArchived: archive } : chat
        );
        try { localStorage.setItem('chats', JSON.stringify(updated)); } catch { /* quota */ }
        return updated;
      });
      updateChat(chatId, { is_archived: archive }).catch(() => {});
    }, 0);
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
      const { updateUser } = await import('@/services/api');
      await updateUser(teacherId, updates);
      
      setAllUsers(prev => 
        prev.map(user => 
          user.id === teacherId ? { ...user, ...updates } : user
        )
      );

      wsService.notifyUserUpdate(teacherId);
      
    } catch (error) {
      console.error('Failed to update teacher:', error);
    }
  };

  const handleEditUser = async (userId: string, updates: { name?: string; phone?: string; password?: string }) => {
    const { updateUser } = await import('@/services/api');
    await updateUser(userId, updates);

    setAllUsers(prev => {
      const updated = prev.map(user =>
        user.id === userId ? { ...user, ...updates } : user
      );
      localStorage.setItem('allUsers', JSON.stringify(updated));
      return updated;
    });

    if (updates.name) {
      setChats(prev => {
        const updated = prev.map(chat => {
          if (chat.type === 'private' && chat.participants?.includes(userId)) {
            const otherName = updates.name!;
            return { ...chat, name: otherName };
          }
          return chat;
        });
        localStorage.setItem('chats', JSON.stringify(updated));
        return updated;
      });
    }

    wsService.notifyUserUpdate(userId);
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
        .filter(u => u.role === 'teacher' || isAdminRole(u.role))
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

  const handleForwardMessage = async (message: Message, targetChatId: string, targetTopicId?: string, comment?: string): Promise<string> => {
    const messageId = Date.now().toString();
    const senderName = userName || (isAdminRole(userRole) ? 'Администратор' : 'Пользователь');
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
      senderRole: userRole || undefined,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString(),
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
    return messageId;
  };

  const handleAddConclusion = async (chatId: string, data: { conclusionLink?: string; conclusionPdfBase64?: string; diagnosisDate?: string }) => {
    try {
      const conclusion = await addConclusion(chatId, data);
      setChats(prev => {
        const updated = prev.map(chat =>
          chat.id === chatId
            ? { ...chat, conclusions: [...(chat.conclusions || []), conclusion] }
            : chat
        );
        localStorage.setItem('chats', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error('Failed to add conclusion:', e);
    }
  };

  const handleUpdateConclusion = async (chatId: string, conclusionId: number, data: { conclusionLink?: string; conclusionPdfBase64?: string; diagnosisDate?: string }) => {
    try {
      const conclusion = await updateConclusion(chatId, conclusionId, data);
      setChats(prev => {
        const updated = prev.map(chat =>
          chat.id === chatId
            ? { ...chat, conclusions: (chat.conclusions || []).map(c => c.id === conclusionId ? conclusion : c) }
            : chat
        );
        localStorage.setItem('chats', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error('Failed to update conclusion:', e);
    }
  };

  const handleDeleteConclusion = async (chatId: string, conclusionId: number) => {
    try {
      await deleteConclusion(chatId, conclusionId);
      setChats(prev => {
        const updated = prev.map(chat =>
          chat.id === chatId
            ? { ...chat, conclusions: (chat.conclusions || []).filter(c => c.id !== conclusionId) }
            : chat
        );
        localStorage.setItem('chats', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error('Failed to delete conclusion:', e);
    }
  };

  const handleUpdateGroupInfo = async (chatId: string, updates: { schedule?: string; conclusionLink?: string; name?: string; conclusionPdfBase64?: string }) => {
    const localUpdates = { ...updates };
    delete (localUpdates as Record<string, unknown>).conclusionPdfBase64;
    setChats(prev => {
      const updated = prev.map(chat =>
        chat.id === chatId
          ? { ...chat, ...localUpdates }
          : chat
      );
      localStorage.setItem('chats', JSON.stringify(updated));
      return updated;
    });
    try {
      const resp = await updateChat(chatId, updates);
      if (resp.conclusionPdf) {
        setChats(prev => {
          const updated = prev.map(chat =>
            chat.id === chatId
              ? { ...chat, conclusionPdf: resp.conclusionPdf as string }
              : chat
          );
          localStorage.setItem('chats', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e) {
      console.error('Failed to update group info:', e);
    }
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
    attachments,
    chats,
    groupTopics,
    messages,
    allUsers,
    typingUsers,
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
    handleDeleteMessage,
    handleRetryMessage,
    handleAddStudent,
    handleAddParent,
    handleAddTeacher,
    handleCreateGroup,
    handleDeleteGroup,
    handleArchiveChat,
    handleDeleteUser,
    handleUpdateTeacher,
    handleEditUser,
    handleUpdateLeadTeachers,
    handleUpdateLeadAdmin,
    handleUpdateParticipants,
    handleUpdateGroupInfo,
    handleAddConclusion,
    handleUpdateConclusion,
    handleDeleteConclusion,
    handleAddAdmin,
    replyTo,
    handleReply,
    handleCancelReply,
    handleForwardMessage,
    handleScheduleMessage,
    handleCancelScheduledMessage,
    handleBroadcast,
    muteVersion,
    messagesLoading,
    isSending,
  };
};