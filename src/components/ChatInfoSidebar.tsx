import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';

type User = {
  id: string;
  name: string;
  role: 'teacher' | 'parent' | 'student';
  avatar?: string;
};

type ChatInfo = {
  students: User[];
  parents: User[];
  teachers: User[];
  schedule?: string;
  conclusionLink?: string;
};

type ChatInfoSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  chatInfo: ChatInfo;
  userRole: 'admin' | 'teacher' | 'parent' | 'student';
  onDeleteGroup?: () => void;
  isTeachersGroup?: boolean;
};

export const ChatInfoSidebar = ({ isOpen, onClose, chatInfo, userRole, onDeleteGroup, isTeachersGroup = false }: ChatInfoSidebarProps) => {
  if (!isOpen) return null;

  const isAdminOrTeacher = userRole === 'admin' || userRole === 'teacher';
  const isAdmin = userRole === 'admin';

  return (
    <div className="w-[380px] max-lg:w-full max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-50 bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Информация о чате</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Ученики */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Icon name="GraduationCap" size={16} />
              Ученики
            </h4>
            <div className="space-y-2">
              {chatInfo.students.length > 0 ? (
                chatInfo.students.map((student) => (
                  <div key={student.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Icon name="User" size={18} />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{student.name}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Нет учеников</p>
              )}
            </div>
          </div>

          {/* Родители */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Icon name="Users" size={16} />
              Родители
            </h4>
            <div className="space-y-2">
              {chatInfo.parents.length > 0 ? (
                chatInfo.parents.map((parent) => (
                  <div key={parent.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={parent.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Icon name="User" size={18} />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{parent.name}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Нет родителей</p>
              )}
            </div>
          </div>

          {/* Расписание - только для учебных групп */}
          {!isTeachersGroup && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <Icon name="Calendar" size={16} />
                  Расписание
                </h4>
                {isAdminOrTeacher && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Icon name="Pencil" size={14} className="mr-1" />
                    Изменить
                  </Button>
                )}
              </div>
              {chatInfo.schedule ? (
                <div className="p-3 rounded-lg bg-accent/50 text-sm whitespace-pre-line">
                  {chatInfo.schedule}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Расписание не задано</p>
              )}
            </div>
          )}

          {/* Заключение - только для учебных групп */}
          {!isTeachersGroup && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <Icon name="FileText" size={16} />
                  Заключение
                </h4>
                {isAdminOrTeacher && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Icon name="Pencil" size={14} className="mr-1" />
                    Изменить
                  </Button>
                )}
              </div>
              {chatInfo.conclusionLink ? (
                <a 
                  href={chatInfo.conclusionLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-sm text-primary"
                >
                  <Icon name="ExternalLink" size={16} />
                  Открыть заключение
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Заключение не добавлено</p>
              )}
            </div>
          )}

          {/* Педагоги (только для админа) */}
          {isAdmin && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                Педагоги в группе
              </h4>
              {chatInfo.teachers.length > 0 ? (
                <div className="p-3 rounded-lg bg-accent/50">
                  <p className="text-sm leading-relaxed">
                    {chatInfo.teachers.map(t => t.name).join(', ')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Нет педагогов в группе</p>
              )}
            </div>
          )}

          {/* Удалить группу (только для админа) */}
          {isAdmin && onDeleteGroup && (
            <div className="pt-4 border-t border-border">
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={onDeleteGroup}
              >
                <Icon name="Trash2" size={16} className="mr-2" />
                Удалить группу
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};