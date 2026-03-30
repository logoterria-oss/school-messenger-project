import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';

type SlotsSectionProps = {
  availableSlots: string[];
  onUpdateSlots: (slots: string[]) => void;
};

const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const sortTimes = (times: string[]) =>
  [...times].sort((a, b) => {
    const [aH, aM] = a.split(':').map(Number);
    const [bH, bM] = b.split(':').map(Number);
    return aH * 60 + aM - (bH * 60 + bM);
  });

const groupSlots = (slots: string[]) => {
  const grouped: Record<string, string[]> = {};
  slots.forEach(slot => {
    const [day, time] = slot.split(' в ');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(time);
  });
  Object.keys(grouped).forEach(day => {
    grouped[day] = sortTimes(grouped[day]);
  });
  return grouped;
};

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

export const SlotsSection = ({ availableSlots, onUpdateSlots }: SlotsSectionProps) => {
  const [isEditingSlots, setIsEditingSlots] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [newSlotTime, setNewSlotTime] = useState('');
  const [editSlots, setEditSlots] = useState<Record<string, string[]>>(() => groupSlots(availableSlots));

  useEffect(() => {
    setEditSlots(groupSlots(availableSlots));
  }, [availableSlots]);

  const handleSaveSlots = () => {
    const flatSlots: string[] = [];
    Object.entries(editSlots).forEach(([day, times]) => {
      times.forEach(time => flatSlots.push(`${day} в ${time}`));
    });
    onUpdateSlots(flatSlots);
    setIsEditingSlots(false);
  };

  const handleOpenAddSlot = (day: string) => {
    setSelectedDay(day);
    setNewSlotTime('');
    setIsAddingSlot(true);
  };

  const handleSaveNewSlot = () => {
    if (selectedDay && newSlotTime) {
      setEditSlots(prev => ({
        ...prev,
        [selectedDay]: sortTimes([...(prev[selectedDay] || []), newSlotTime])
      }));
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

  return (
    <>
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
          {availableSlots.length > 0 ? (
            (() => {
              const grouped: Record<string, string[]> = {};
              availableSlots.forEach(slot => {
                const [day, time] = slot.split(' в ');
                if (!grouped[day]) grouped[day] = [];
                grouped[day].push(time);
              });
              return Object.entries(grouped).map(([day, times]) => (
                <div key={day} className="bg-accent/50 rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">{day}</p>
                  <div className="flex flex-wrap gap-1">
                    {times.map((time, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5">{time}</span>
                    ))}
                  </div>
                </div>
              ));
            })()
          ) : (
            <p className="text-sm text-muted-foreground">Нет свободных слотов</p>
          )}
        </div>
      </div>

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
    </>
  );
};

export default SlotsSection;
