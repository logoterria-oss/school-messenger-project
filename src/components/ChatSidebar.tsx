import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  type: 'group' | 'private';
  leadTeachers?: string[];
};

type Topic = {
  id: string;
  name: string;
  icon: string;
  unread: number;
};

type ChatSidebarProps = {
  userRole: UserRole;
  userName?: string;
  userId?: string;
  chats: Chat[];
  allUsers?: Array<{id: string, name: string, role: string, avatar?: string}>;
  selectedChat: string | null;
  selectedTopic?: string | null;
  groupTopics?: Record<string, Topic[]>;
  onSelectChat: (chatId: string) => void;
  onTopicSelect?: (topicId: string) => void;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenUsers?: () => void;
  onAddStudent?: () => void;
  onAddParent?: () => void;
  onAddTeacher?: () => void;
  onCreateGroup?: () => void;
  onAddAdmin?: () => void;
};

const ChatItem = memo(({ chat, isSelected, onClick }: { chat: Chat & { avatar?: string; isPinned?: boolean }, isSelected: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full px-4 py-3 text-left transition-colors border-l-4 ${
      isSelected 
        ? 'bg-accent border-primary' 
        : 'border-transparent hover:bg-accent/50'
    }`}
  >
    <div className="flex items-center gap-3">
      <Avatar className="w-14 h-14">
        {chat.avatar && <AvatarImage src={chat.avatar} />}
        <AvatarFallback className="bg-primary text-white text-sm">
          {chat.type === 'group' ? (
            <Icon name="Users" size={20} />
          ) : (
            <Icon name="User" size={20} />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate text-foreground">{chat.name}</h3>
            {chat.isPinned && (
              <Icon name="Pin" size={14} className="text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
            {chat.timestamp}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground truncate flex-1">
            {chat.lastMessage}
          </p>
          {chat.unread > 0 && (
            <Badge className="bg-primary text-white text-xs px-2 py-0 h-5 min-w-5 rounded-full flex items-center justify-center">
              {chat.unread}
            </Badge>
          )}
        </div>
      </div>
    </div>
  </button>
));
ChatItem.displayName = 'ChatItem';

const isTeacherChat = (chat: Chat, allUsers: Array<{id: string, name: string, role: string, avatar?: string}>) => {
  if (chat.type !== 'private' || !chat.participants) return false;
  return chat.participants.some(id => {
    const user = allUsers.find(u => u.id === id);
    return user?.role === 'teacher';
  });
};

const FolderItem = ({ name, icon, chats, unread, isOpen, onToggle, selectedChat, onSelectChat, getDisplayChat }: {
  name: string;
  icon: string;
  chats: Chat[];
  unread: number;
  isOpen: boolean;
  onToggle: () => void;
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  getDisplayChat: (chat: Chat) => Chat;
}) => {
  const hasSelectedChat = chats.some(c => c.id === selectedChat);

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full px-4 py-2.5 text-left transition-colors hover:bg-accent/50 border-l-4 ${
          hasSelectedChat && !isOpen ? 'border-primary bg-accent/30' : 'border-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <Icon name={icon} size={22} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm text-foreground">{name}</h3>
                <Icon name="Pin" size={14} className="text-muted-foreground flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && !isOpen && (
                  <Badge className="bg-primary text-white text-xs px-2 py-0 h-5 min-w-5 rounded-full flex items-center justify-center">
                    {unread}
                  </Badge>
                )}
                <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {chats.length} {chats.length === 1 ? 'чат' : chats.length < 5 ? 'чата' : 'чатов'}
            </p>
          </div>
        </div>
      </button>

      {isOpen && chats.map((chat) => {
        const displayChat = getDisplayChat(chat);
        return (
          <div key={chat.id} className="pl-4">
            <ChatItem
              chat={displayChat}
              isSelected={selectedChat === chat.id}
              onClick={() => onSelectChat(chat.id)}
            />
          </div>
        );
      })}
    </div>
  );
};

const isNonLeadGroup = (chat: Chat, userId?: string) => {
  if (chat.type !== 'group' || chat.id === 'teachers-group') return false;
  if (!chat.leadTeachers || chat.leadTeachers.length === 0) return false;
  return !chat.leadTeachers.includes(userId || '');
};

const ChatList = ({ chats, allUsers, userRole, userId, selectedChat, onSelectChat, getDisplayChat, searchQuery = '' }: {
  chats: Chat[];
  allUsers: Array<{id: string, name: string, role: string, avatar?: string}>;
  userRole: UserRole;
  userId?: string;
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  getDisplayChat: (chat: Chat) => Chat;
  searchQuery?: string;
}) => {
  const [teacherFolderOpen, setTeacherFolderOpen] = useState(false);
  const [nonLeadFolderOpen, setNonLeadFolderOpen] = useState(false);

  const query = searchQuery.toLowerCase().trim();

  const filtered = [...chats].filter((chat) => {
    if (chat.type === 'private' && chat.participants) {
      const otherUserId = chat.participants.find(id => id !== userId);
      if (otherUserId === userId || (otherUserId === 'admin' && userId === 'admin')) {
        return false;
      }
    }
    if (query) {
      const display = getDisplayChat(chat);
      return display.name.toLowerCase().includes(query);
    }
    return true;
  });

  const isAdmin = userRole === 'admin';
  const isTeacher = userRole === 'teacher';
  const teacherChats = isAdmin ? filtered.filter(c => isTeacherChat(c, allUsers)) : [];
  const teacherUnread = teacherChats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const nonLeadChats = isTeacher ? filtered.filter(c => isNonLeadGroup(c, userId)) : [];
  const nonLeadUnread = nonLeadChats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const otherChats = filtered.filter(c => {
    if (isAdmin && isTeacherChat(c, allUsers)) return false;
    if (isTeacher && isNonLeadGroup(c, userId)) return false;
    return true;
  });

  const sorted = otherChats.sort((a, b) => {
    if (a.id === 'teachers-group') return -1;
    if (b.id === 'teachers-group') return 1;
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  if (isAdmin) {
    const teachersGroupIndex = sorted.findIndex(c => c.id === 'teachers-group');
    const beforeFolder = teachersGroupIndex >= 0 ? sorted.slice(0, teachersGroupIndex + 1) : sorted;
    const afterFolder = teachersGroupIndex >= 0 ? sorted.slice(teachersGroupIndex + 1) : [];

    return (
      <ScrollArea className="flex-1">
        {beforeFolder.map((chat) => {
          const displayChat = getDisplayChat(chat);
          return (
            <ChatItem
              key={chat.id}
              chat={displayChat}
              isSelected={selectedChat === chat.id}
              onClick={() => onSelectChat(chat.id)}
            />
          );
        })}

        {teacherChats.length > 0 && (
          <FolderItem
            name="ЛС с педагогами"
            icon="FolderOpen"
            chats={teacherChats}
            unread={teacherUnread}
            isOpen={teacherFolderOpen}
            onToggle={() => setTeacherFolderOpen(!teacherFolderOpen)}
            selectedChat={selectedChat}
            onSelectChat={onSelectChat}
            getDisplayChat={getDisplayChat}
          />
        )}

        {afterFolder.map((chat) => {
          const displayChat = getDisplayChat(chat);
          return (
            <ChatItem
              key={chat.id}
              chat={displayChat}
              isSelected={selectedChat === chat.id}
              onClick={() => onSelectChat(chat.id)}
            />
          );
        })}
      </ScrollArea>
    );
  }

  if (isTeacher) {
    const adminChatIndex = sorted.findIndex(c => c.type === 'private' && c.participants?.includes('admin'));
    const insertIndex = adminChatIndex >= 0 ? adminChatIndex + 1 : sorted.length;
    const beforeNonLead = sorted.slice(0, insertIndex);
    const afterNonLead = sorted.slice(insertIndex);

    return (
      <ScrollArea className="flex-1">
        {beforeNonLead.map((chat) => {
          const displayChat = getDisplayChat(chat);
          return (
            <ChatItem
              key={chat.id}
              chat={displayChat}
              isSelected={selectedChat === chat.id}
              onClick={() => onSelectChat(chat.id)}
            />
          );
        })}

        {nonLeadChats.length > 0 && (
          <FolderItem
            name="Чужие ученики"
            icon="FolderOpen"
            chats={nonLeadChats}
            unread={nonLeadUnread}
            isOpen={nonLeadFolderOpen}
            onToggle={() => setNonLeadFolderOpen(!nonLeadFolderOpen)}
            selectedChat={selectedChat}
            onSelectChat={onSelectChat}
            getDisplayChat={getDisplayChat}
          />
        )}

        {afterNonLead.map((chat) => {
          const displayChat = getDisplayChat(chat);
          return (
            <ChatItem
              key={chat.id}
              chat={displayChat}
              isSelected={selectedChat === chat.id}
              onClick={() => onSelectChat(chat.id)}
            />
          );
        })}
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1">
      {sorted.map((chat) => {
        const displayChat = getDisplayChat(chat);
        return (
          <ChatItem
            key={chat.id}
            chat={displayChat}
            isSelected={selectedChat === chat.id}
            onClick={() => onSelectChat(chat.id)}
          />
        );
      })}
    </ScrollArea>
  );
};

export const ChatSidebar = ({ userRole, userName, userId, chats, allUsers = [], selectedChat, selectedTopic, groupTopics, onSelectChat, onTopicSelect, onLogout, onOpenProfile, onOpenSettings, onOpenUsers, onAddStudent, onAddParent, onAddTeacher, onCreateGroup, onAddAdmin }: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getDisplayChat = (chat: Chat) => {
    if (chat.type === 'private' && chat.participants && chat.participants.length === 2) {
      const otherUserId = chat.participants.find(id => id !== userId && id !== 'current');
      if (otherUserId === 'admin' && userRole !== 'admin') {
        return { ...chat, name: 'Виктория Абраменко', avatar: 'https://cdn.poehali.dev/files/Админ.jpg' };
      }
      if (userRole === 'admin' && otherUserId) {
        const otherUser = allUsers.find(u => u.id === otherUserId);
        if (otherUser) {
          return { ...chat, name: otherUser.name, avatar: otherUser.avatar || chat.avatar };
        }
      }
    }
    return chat;
  };

  const isParentOrStudent = userRole === 'parent' || userRole === 'student';

  const parentGroup = isParentOrStudent ? chats.find(c =>
    c.type === 'group' &&
    c.id !== 'teachers-group' &&
    c.participants?.includes(userId || '')
  ) : null;
  const parentTopics = parentGroup && groupTopics ? (groupTopics[parentGroup.id] || []) : [];
  const studentAllowedSuffixes = ['-important', '-zoom', '-homework', '-reports', '-cancellation'];
  const filteredParentTopics = userRole === 'student'
    ? parentTopics.filter(t => studentAllowedSuffixes.some(s => t.id.endsWith(s)))
    : parentTopics;

  return (
    <div className="w-[420px] bg-card border-r border-border flex flex-col">
      <div className="p-4 bg-card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <img 
              src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg" 
              alt="LineaSchool" 
              className="w-10 h-10 rounded-lg flex-shrink-0"
              loading="lazy"
            />
            <div>
              <h1 className="text-base font-extrabold" style={{ color: '#3BA662' }}>LineaSchool</h1>
              <p className="text-xs text-muted-foreground">
                {userRole === 'admin' && 'Виктория Абраменко (админ)'}
                {userRole === 'teacher' && (userName ? `${userName} (педагог)` : 'Педагог')}
                {userRole === 'parent' && (userName ? `${userName} (родитель)` : 'Родитель')}
                {userRole === 'student' && (userName ? `${userName} (ученик)` : 'Ученик')}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Icon name="Menu" size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {userRole === 'admin' && (
                <>
                  <DropdownMenuItem onClick={onOpenUsers}>
                    <Icon name="Users" size={16} className="mr-2" />
                    Все пользователи
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onAddStudent}>
                    <Icon name="UserPlus" size={16} className="mr-2" />
                    Добавить ученика
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onAddParent}>
                    <Icon name="UserPlus" size={16} className="mr-2" />
                    Добавить родителя
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onAddTeacher}>
                    <Icon name="UserPlus" size={16} className="mr-2" />
                    Добавить педагога
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCreateGroup}>
                    <Icon name="Users" size={16} className="mr-2" />
                    Создать группу
                  </DropdownMenuItem>
                  {userId === 'admin' && (
                    <DropdownMenuItem onClick={onAddAdmin}>
                      <Icon name="Shield" size={16} className="mr-2" />
                      Добавить админа
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onOpenProfile}>
                <Icon name="User" size={16} className="mr-2" />
                Профиль
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenSettings}>
                <Icon name="Settings" size={16} className="mr-2" />
                Настройки
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive">
                <Icon name="LogOut" size={16} className="mr-2" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-accent border-0 text-sm"
          />
        </div>

        {isParentOrStudent && filteredParentTopics.length > 0 && (
          <div className="mt-4 space-y-1">
            {filteredParentTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => {
                  if (parentGroup) {
                    onSelectChat(parentGroup.id);
                  }
                  onTopicSelect?.(topic.id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selectedTopic === topic.id
                    ? 'bg-primary text-white'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <Icon name={topic.icon} size={18} />
                <span className="font-medium flex-1 text-left">{topic.name}</span>
                {topic.unread > 0 && selectedTopic !== topic.id && (
                  <Badge className="bg-primary text-white text-xs px-1.5 py-0 h-5 min-w-5 rounded-full">
                    {topic.unread}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isParentOrStudent && (
        <ChatList
          chats={chats}
          allUsers={allUsers}
          userRole={userRole}
          userId={userId}
          selectedChat={selectedChat}
          onSelectChat={onSelectChat}
          getDisplayChat={getDisplayChat}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
};