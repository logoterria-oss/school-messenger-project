import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

type TeacherInfo = {
  id: string;
  name: string;
  phone: string;
  email: string;
  availableSlots: string[];
  educationDocs: string[];
};

type TeacherAdminChatInfoProps = {
  isOpen: boolean;
  onClose: () => void;
  teacherInfo: TeacherInfo;
  onUpdateTeacher: (info: Partial<TeacherInfo>) => void;
};

export const TeacherAdminChatInfo = ({ isOpen, onClose, teacherInfo, onUpdateTeacher }: TeacherAdminChatInfoProps) => {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingSlots, setIsEditingSlots] = useState(false);
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  const [editPhone, setEditPhone] = useState(teacherInfo.phone);
  const [editEmail, setEditEmail] = useState(teacherInfo.email);
  const [editSlots, setEditSlots] = useState<string[]>(teacherInfo.availableSlots);

  const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  const handleSavePhone = () => {
    onUpdateTeacher({ phone: editPhone });
    setIsEditingPhone(false);
  };

  const handleSaveEmail = () => {
    onUpdateTeacher({ email: editEmail });
    setIsEditingEmail(false);
  };

  const handleSaveSlots = () => {
    onUpdateTeacher({ availableSlots: editSlots });
    setIsEditingSlots(false);
  };

  const handleAddSlot = (day: string, time: string) => {
    const slot = `${day} в ${time}`;
    setEditSlots([...editSlots, slot]);
  };

  const handleRemoveSlot = (index: number) => {
    setEditSlots(editSlots.filter((_, i) => i !== index));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newDocs = [...teacherInfo.educationDocs, e.target?.result as string];
          onUpdateTeacher({ educationDocs: newDocs });
        };
        reader.readAsDataURL(file);
      });
    }
    if (event.target) event.target.value = '';
    setIsAddingDoc(false);
  };

  const handleRemoveDoc = (index: number) => {
    const newDocs = teacherInfo.educationDocs.filter((_, i) => i !== index);
    onUpdateTeacher({ educationDocs: newDocs });
  };

  if (!isOpen) return null;

  return (
    <div className="w-[380px] bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Основное</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Номер телефона */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Номер телефона педагога</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditingPhone(true)}
                className="h-8 px-2"
              >
                <Icon name="Pencil" size={14} />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{teacherInfo.phone}</p>
          </div>

          {/* E-mail */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">E-mail педагога</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditingEmail(true)}
                className="h-8 px-2"
              >
                <Icon name="Pencil" size={14} />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{teacherInfo.email}</p>
          </div>

          {/* Свободные слоты */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Свободные слоты</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditingSlots(true)}
                className="h-8 px-2"
              >
                <Icon name="Pencil" size={14} />
              </Button>
            </div>
            <div className="space-y-2">
              {teacherInfo.availableSlots.length > 0 ? (
                teacherInfo.availableSlots.map((slot, index) => (
                  <div key={index} className="text-sm text-muted-foreground p-2 bg-accent rounded-lg">
                    {slot}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Нет свободных слотов</p>
              )}
            </div>
          </div>

          {/* Документы об образовании */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Документы об образовании</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsAddingDoc(true)}
                className="h-8 px-2"
              >
                <Icon name="Plus" size={14} />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {teacherInfo.educationDocs.length > 0 ? (
                teacherInfo.educationDocs.map((doc, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={doc} 
                      alt={`Документ ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveDoc(index)}
                    >
                      <Icon name="Trash2" size={12} />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground col-span-2">Нет документов</p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Диалог редактирования телефона */}
      <Dialog open={isEditingPhone} onOpenChange={setIsEditingPhone}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить номер телефона</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="phone">Номер телефона</Label>
              <Input
                id="phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+7(xxx)xxx-xx-xx"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingPhone(false)}>
              Отмена
            </Button>
            <Button onClick={handleSavePhone}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования email */}
      <Dialog open={isEditingEmail} onOpenChange={setIsEditingEmail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить E-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingEmail(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEmail}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования слотов */}
      <Dialog open={isEditingSlots} onOpenChange={setIsEditingSlots}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать свободные слоты</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {editSlots.map((slot, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-accent rounded-lg">
                  <span className="text-sm">{slot}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSlot(index)}
                  >
                    <Icon name="X" size={14} />
                  </Button>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <Label className="mb-2 block">Добавить новый слот</Label>
              <div className="space-y-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center gap-2">
                    <span className="text-sm w-32">{day}</span>
                    <Input
                      type="time"
                      className="flex-1"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddSlot(day, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingSlots(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveSlots}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления документа */}
      <Dialog open={isAddingDoc} onOpenChange={setIsAddingDoc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить документ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="doc-upload">Выберите фото документа</Label>
              <Input
                id="doc-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingDoc(false)}>
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
