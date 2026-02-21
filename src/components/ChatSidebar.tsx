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
