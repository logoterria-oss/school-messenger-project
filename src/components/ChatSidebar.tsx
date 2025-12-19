import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  chats: Chat[];
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
};

export const ChatSidebar = ({ userRole, userName, chats, selectedChat, onSelectChat, onLogout, onOpenProfile, onOpenSettings }: ChatSidebarProps) => {
  return (
    <div className="w-[420px] bg-card border-r border-border flex flex-col">
      <div className="p-4 bg-card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <img 
              src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg" 
              alt="LineaSchool" 
              className="w-10 h-10 rounded-lg flex-shrink-0" 
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
      </div>

      <ScrollArea className="flex-1">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full px-4 py-3 text-left transition-colors border-l-4 ${
              selectedChat === chat.id 
                ? 'bg-accent border-primary' 
                : 'border-transparent hover:bg-accent/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
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
                  <h3 className="font-medium text-sm truncate text-foreground">{chat.name}</h3>
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
        ))}
      </ScrollArea>
    </div>
  );
};