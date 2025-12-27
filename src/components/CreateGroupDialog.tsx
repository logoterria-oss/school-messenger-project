import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';

type User = {
  id: string;
  name: string;
  role: 'teacher' | 'parent' | 'student';
  phone: string;
  email?: string;
  password: string;
};

type CreateGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (groupName: string, selectedUserIds: string[], schedule: string, conclusionLink: string) => void;
  allUsers: User[];
};

const roleLabels = {
  teacher: 'Педагог',
  parent: 'Родитель',
  student: 'Ученик',
};

export const CreateGroupDialog = ({ open, onClose, onCreate, allUsers }: CreateGroupDialogProps) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [schedule, setSchedule] = useState('');
  const [conclusionLink, setConclusionLink] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Автоматически добавляем всех педагогов
  const teachers = allUsers.filter(u => u.role === 'teacher');
  const parents = allUsers.filter(u => u.role === 'parent');
  const students = allUsers.filter(u => u.role === 'student');

  // Фильтруем родителей и учеников по поиску
  const filteredParents = parents.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredStudents = students.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (!groupName.trim()) {
      return;
    }
    // Добавляем всех педагогов автоматически
    const allTeacherIds = teachers.map(t => t.id);
    const finalUsers = [...new Set([...allTeacherIds, ...selectedUsers])];
    
    onCreate(groupName.trim(), finalUsers, schedule.trim(), conclusionLink.trim());
    setGroupName('');
    setSelectedUsers([]);
    setSchedule('');
    setConclusionLink('');
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedUsers([]);
    setSchedule('');
    setConclusionLink('');
    setSearchQuery('');
    onClose();
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Создать группу</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Название группы</Label>
            <Input
              id="groupName"
              placeholder="Группа: Иван Петров"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule">Расписание</Label>
            <Textarea
              id="schedule"
              placeholder="ПН в 18:00, ЧТ в 15:00 - групповые: нейропсихолог..."
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conclusionLink">Ссылка на заключение</Label>
            <Input
              id="conclusionLink"
              type="url"
              placeholder="https://example.com/conclusion.pdf"
              value={conclusionLink}
              onChange={(e) => setConclusionLink(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Участники группы ({selectedUsers.length + teachers.length} выбрано)</Label>
            <p className="text-xs text-muted-foreground">Все педагоги добавляются автоматически</p>
            
            <Input
              placeholder="Поиск по имени и фамилии..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />
            
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-3 space-y-4">
                {parents.length === 0 && students.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Icon name="Users" size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Пользователей пока нет</p>
                    <p className="text-xs mt-1">Добавьте учеников и родителей</p>
                  </div>
                ) : (
                  <>
                    {filteredParents.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Родители</h4>
                        <div className="space-y-2">
                          {filteredParents.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent"
                            >
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={() => toggleUser(user.id)}
                              />
                              <label
                                htmlFor={`user-${user.id}`}
                                className="flex-1 min-w-0 cursor-pointer"
                              >
                                <p className="font-medium text-sm truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.phone}</p>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredStudents.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Ученики</h4>
                        <div className="space-y-2">
                          {filteredStudents.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent"
                            >
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={() => toggleUser(user.id)}
                              />
                              <label
                                htmlFor={`user-${user.id}`}
                                className="flex-1 min-w-0 cursor-pointer"
                              >
                                <p className="font-medium text-sm truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.phone}</p>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchQuery && filteredParents.length === 0 && filteredStudents.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <Icon name="Search" size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Ничего не найдено</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button onClick={handleCreate} disabled={!groupName.trim()}>
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};