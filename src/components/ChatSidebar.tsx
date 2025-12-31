import { useState, memo } from 'react';
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
};

type ChatSidebarProps = {
  userRole: UserRole;
  userName?: string;
  userId?: string;
  chats: Chat[];
  allUsers?: Array<{id: string, name: string, role: string, avatar?: string}>;
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenUsers?: () => void;
  onAddStudent?: () => void;
  onAddParent?: () => void;
  onAddTeacher?: () => void;
  onCreateGroup?: () => void;
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

export const ChatSidebar = ({ userRole, userName, userId, chats, allUsers = [], selectedChat, onSelectChat, onLogout, onOpenProfile, onOpenSettings, onOpenUsers, onAddStudent, onAddParent, onAddTeacher, onCreateGroup }: ChatSidebarProps) => {
  
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
  const [selectedTag, setSelectedTag] = useState<string | null>('all');

  const parentTags = [
    { id: 'all', label: 'Все', icon: 'Inbox' },
    { id: 'important', label: 'Важное', icon: 'CircleAlert' },
    { id: 'zoom', label: 'Zoom', icon: 'Video' },
    { id: 'homework', label: 'ДЗ', icon: 'BookOpen' },
    { id: 'reports', label: 'Отчеты', icon: 'FileText' },
    { id: 'payment', label: 'Оплата', icon: 'CreditCard' },
    { id: 'cancellation', label: 'Отмена занятий', icon: 'Ban' },
  ];

  const studentTags = [
    { id: 'all', label: 'Все', icon: 'Inbox' },
    { id: 'important', label: 'Важное', icon: 'CircleAlert' },
    { id: 'zoom', label: 'Zoom', icon: 'Video' },
    { id: 'homework', label: 'ДЗ', icon: 'BookOpen' },
    { id: 'cancellation', label: 'Отмена занятий', icon: 'Ban' },
  ];

  const isParentOrStudent = userRole === 'parent' || userRole === 'student';
  const tags = userRole === 'parent' ? parentTags : userRole === 'student' ? studentTags : [];

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
            className="pl-9 h-9 bg-accent border-0 text-sm"
          />
        </div>

        {isParentOrStudent && (
          <div className="mt-4 space-y-1">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(tag.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selectedTag === tag.id
                    ? 'bg-primary text-white'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <Icon name={tag.icon as any} size={18} />
                <span className="font-medium">{tag.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!isParentOrStudent && (
        <ScrollArea className="flex-1">
          {[...chats]
            .filter((chat) => {
              // Убираем чаты с самим собой
              if (chat.type === 'private' && chat.participants) {
                const otherUserId = chat.participants.find(id => id !== userId);
                // Если другой участник это тоже текущий пользователь - пропускаем
                if (otherUserId === userId || otherUserId === 'admin' && userId === 'admin') {
                  return false;
                }
              }
              return true;
            })
            .sort((a, b) => {
              if (a.id === 'teachers-group') return -1;
              if (b.id === 'teachers-group') return 1;
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return 0;
            })
            .map((chat) => {
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
      )}
    </div>
  );
};