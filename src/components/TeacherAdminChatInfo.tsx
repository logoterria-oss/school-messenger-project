import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [newSlotTime, setNewSlotTime] = useState('');

  const [editPhone, setEditPhone] = useState(teacherInfo.phone);
  const [editEmail, setEditEmail] = useState(teacherInfo.email);
  const [editSlots, setEditSlots] = useState<Record<string, string[]>>(() => {
    const grouped: Record<string, string[]> = {};
    teacherInfo.availableSlots.forEach(slot => {
      const [day, time] = slot.split(' в ');
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(time);
    });
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => {
        const [aHours, aMinutes] = a.split(':').map(Number);
        const [bHours, bMinutes] = b.split(':').map(Number);
        return aHours * 60 + aMinutes - (bHours * 60 + bMinutes);
      });
    });
    return grouped;
  });

  const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
      }
    }
    return slots;
  };
  
  const timeSlots = generateTimeSlots();

  const handleSavePhone = () => {
    onUpdateTeacher({ phone: editPhone });
    setIsEditingPhone(false);
  };

  const handleSaveEmail = () => {
    onUpdateTeacher({ email: editEmail });
    setIsEditingEmail(false);
  };

  const handleSaveSlots = () => {
    const flatSlots: string[] = [];
    Object.entries(editSlots).forEach(([day, times]) => {
      times.forEach(time => flatSlots.push(`${day} в ${time}`));
    });
    onUpdateTeacher({ availableSlots: flatSlots });
    setIsEditingSlots(false);
  };

  const handleOpenAddSlot = (day: string) => {
    setSelectedDay(day);
    setNewSlotTime('');
    setIsAddingSlot(true);
  };

  const handleSaveNewSlot = () => {
    if (selectedDay && newSlotTime) {
      setEditSlots(prev => {
        const newTimes = [...(prev[selectedDay] || []), newSlotTime].sort((a, b) => {
          const [aHours, aMinutes] = a.split(':').map(Number);
          const [bHours, bMinutes] = b.split(':').map(Number);
          return aHours * 60 + aMinutes - (bHours * 60 + bMinutes);
        });
        return {
          ...prev,
          [selectedDay]: newTimes
        };
      });
      setIsAddingSlot(false);
      setNewSlotTime('');
    }
  };

  const handleRemoveSlot = (day: string, timeIndex: number) => {
    setEditSlots(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== timeIndex)
    }));
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
          <div className="space-y-4 py-4 max-h-[500px] overflow-y-auto">
            {daysOfWeek.map((day) => (
              <div key={day} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">{day}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenAddSlot(day)}
                    className="h-7 w-7 p-0"
                  >
                    <Icon name="Plus" size={16} />
                  </Button>
                </div>
                <div className="space-y-1">
                  {editSlots[day] && editSlots[day].length > 0 ? (
                    editSlots[day].map((time, timeIndex) => (
                      <div key={timeIndex} className="flex items-center justify-between p-2 bg-accent rounded">
                        <span className="text-sm">{time}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSlot(day, timeIndex)}
                          className="h-6 w-6 p-0"
                        >
                          <Icon name="X" size={14} />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground p-2">Нет слотов</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingSlots(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveSlots}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления времени для слота */}
      <Dialog open={isAddingSlot} onOpenChange={setIsAddingSlot}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить время для {selectedDay}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="slot-time-select">Выбрать из списка (шаг 5 минут)</Label>
                <Select value={newSlotTime} onValueChange={setNewSlotTime}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Выберите время" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">или</span>
                </div>
              </div>
              
              <div>
                <Label htmlFor="slot-time-input">Ввести вручную</Label>
                <Input
                  id="slot-time-input"
                  type="time"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingSlot(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveNewSlot} disabled={!newSlotTime}>
              Сохранить
            </Button>
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