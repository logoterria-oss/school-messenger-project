import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChatList } from './sidebar/ChatList';
import type { Chat, Topic, UserRole } from './sidebar/types';

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
    <div className="w-full md:w-[380px] h-screen bg-card/50 backdrop-blur-sm border-r border-border/60 flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <img 
              src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg" 
              alt="LineaSchool" 
              className="w-9 h-9 rounded-lg flex-shrink-0"
              loading="lazy"
            />
            <div>
              <h1 className="text-sm font-bold text-primary">LineaSchool</h1>
              <p className="text-[11px] text-muted-foreground/70 leading-tight">
                {userRole === 'admin' && 'Виктория Абраменко'}
                {userRole === 'teacher' && (userName || 'Педагог')}
                {userRole === 'parent' && (userName || 'Родитель')}
                {userRole === 'student' && (userName || 'Ученик')}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="h-10 w-10 flex items-center justify-center rounded-md text-foreground bg-muted/60 md:bg-transparent md:text-muted-foreground md:hover:bg-accent flex-shrink-0">
                <Icon name="Menu" size={22} />
              </button>
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
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 bg-accent/50 border-0 text-xs rounded-lg placeholder:text-muted-foreground/40"
          />
        </div>

        {isParentOrStudent && filteredParentTopics.length > 0 && (
          <div className="mt-3 space-y-0.5">
            {filteredParentTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => {
                  if (parentGroup) {
                    onSelectChat(parentGroup.id);
                  }
                  onTopicSelect?.(topic.id);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  selectedTopic === topic.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-accent/60'
                }`}
              >
                <Icon name={topic.icon} size={16} className={selectedTopic === topic.id ? 'text-primary' : 'text-muted-foreground'} />
                <span className={`flex-1 text-left text-[13px] ${selectedTopic === topic.id ? 'font-semibold' : 'font-medium'}`}>{topic.name}</span>
                {topic.unread > 0 && selectedTopic !== topic.id && (
                  <Badge className="bg-primary text-white text-[10px] px-1.5 py-0 h-[18px] min-w-[18px] rounded-md font-semibold">
                    {topic.unread}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isParentOrStudent && chats.length > 0 && (
        <div className="px-4 pb-2">
          <div className="h-px bg-border/40" />
        </div>
      )}

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