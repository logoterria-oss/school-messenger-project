import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';

type User = {
  id: string;
  name: string;
  role: 'teacher' | 'parent' | 'student';
  phone: string;
  email?: string;
  password: string;
};

type AllUsersViewProps = {
  users: User[];
  onBack: () => void;
};

const roleLabels = {
  teacher: 'Педагог',
  parent: 'Родитель',
  student: 'Ученик',
};

const roleColors = {
  teacher: 'bg-blue-500',
  parent: 'bg-green-500',
  student: 'bg-orange-500',
};

const UserCard = ({ user }: { user: User }) => (
  <div className="bg-card border border-border rounded-lg p-4 space-y-3">
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">{user.name}</h3>
          <Badge className={`${roleColors[user.role]} text-white text-xs`}>
            {roleLabels[user.role]}
          </Badge>
        </div>
      </div>
    </div>

    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon name="Phone" size={16} className="flex-shrink-0" />
        <span>{user.phone}</span>
      </div>
      
      {user.email && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon name="Mail" size={16} className="flex-shrink-0" />
          <span>{user.email}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon name="Lock" size={16} className="flex-shrink-0" />
        <span className="font-mono">{user.password}</span>
      </div>
    </div>
  </div>
);

export const AllUsersView = ({ users, onBack }: AllUsersViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const teachers = users.filter(u => u.role === 'teacher');
  const parents = users.filter(u => u.role === 'parent');
  const students = users.filter(u => u.role === 'student');

  const filterUsers = (usersList: User[]) => 
    usersList.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredTeachers = filterUsers(teachers);
  const filteredParents = filterUsers(parents);
  const filteredStudents = filterUsers(students);

  const hasResults = filteredTeachers.length > 0 || filteredParents.length > 0 || filteredStudents.length > 0;

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <Icon name="ArrowLeft" size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Все пользователи</h1>
            <p className="text-sm text-muted-foreground">
              Всего: {users.length} {users.length === 1 ? 'пользователь' : 'пользователей'}
            </p>
          </div>
        </div>

        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени и фамилии..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Users" size={36} className="text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Пользователей пока нет</h3>
              <p className="text-sm text-muted-foreground">
                Добавьте учеников, родителей или педагогов через меню
              </p>
            </div>
          ) : !hasResults ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Search" size={36} className="text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Ничего не найдено</h3>
              <p className="text-sm text-muted-foreground">
                Попробуйте изменить поисковый запрос
              </p>
            </div>
          ) : (
            <>
              {filteredTeachers.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">
                    Педагоги ({filteredTeachers.length})
                  </h2>
                  <div className="space-y-3">
                    {filteredTeachers.map(user => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                </div>
              )}

              {filteredParents.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">
                    Родители ({filteredParents.length})
                  </h2>
                  <div className="space-y-3">
                    {filteredParents.map(user => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                </div>
              )}

              {filteredStudents.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">
                    Ученики ({filteredStudents.length})
                  </h2>
                  <div className="space-y-3">
                    {filteredStudents.map(user => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};