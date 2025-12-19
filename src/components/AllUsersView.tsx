import { Button } from '@/components/ui/button';
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

export const AllUsersView = ({ users, onBack }: AllUsersViewProps) => {
  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
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
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-card border border-border rounded-lg p-4 space-y-3"
            >
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
          ))}

          {users.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="Users" size={36} className="text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Пользователей пока нет</h3>
              <p className="text-sm text-muted-foreground">
                Добавьте учеников, родителей или педагогов через меню
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
