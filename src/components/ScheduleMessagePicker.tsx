import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

type ScheduleMessagePickerProps = {
  onSchedule: (date: Date) => void;
  onClose: () => void;
};

const formatScheduleDate = (date: Date): string => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const dayLabel = dateStart.getTime() === todayStart.getTime() ? 'сегодня' : 'завтра';
  return `${dayLabel} в ${hours}:${minutes}`;
};

export const ScheduleMessagePicker = ({ onSchedule, onClose }: ScheduleMessagePickerProps) => {
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('today');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');

  const canSchedule = useMemo(() => {
    if (!hours || !minutes) return false;
    const h = parseInt(hours);
    const m = parseInt(minutes);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return false;
    const now = new Date();
    const scheduled = new Date(now);
    if (selectedDay === 'tomorrow') scheduled.setDate(scheduled.getDate() + 1);
    scheduled.setHours(h, m, 0, 0);
    return scheduled > now;
  }, [selectedDay, hours, minutes]);

  const handleSchedule = () => {
    if (!canSchedule) return;
    const now = new Date();
    const scheduled = new Date(now);
    if (selectedDay === 'tomorrow') scheduled.setDate(scheduled.getDate() + 1);
    scheduled.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    onSchedule(scheduled);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <Icon name="X" size={18} />
        </button>
        <span className="text-sm font-medium">Отправить позже</span>
        <div className="w-[18px]" />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedDay('today')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            selectedDay === 'today'
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent/50 text-foreground hover:bg-accent'
          }`}
        >
          Сегодня
        </button>
        <button
          onClick={() => setSelectedDay('tomorrow')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            selectedDay === 'tomorrow'
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent/50 text-foreground hover:bg-accent'
          }`}
        >
          Завтра
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1 bg-accent/50 rounded-lg px-3 py-2">
          <Icon name="Clock" size={14} className="text-muted-foreground" />
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            placeholder="ЧЧ"
            value={hours}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 23)) setHours(v);
            }}
            className="w-8 bg-transparent text-center text-sm outline-none"
          />
          <span className="text-muted-foreground">:</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            placeholder="ММ"
            value={minutes}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 59)) setMinutes(v);
            }}
            className="w-8 bg-transparent text-center text-sm outline-none"
          />
        </div>
      </div>

      <Button
        onClick={handleSchedule}
        disabled={!canSchedule}
        className="w-full"
        size="sm"
      >
        <Icon name="Send" size={14} className="mr-1.5" />
        {canSchedule
          ? `Отправить ${formatScheduleDate((() => { const d = new Date(); if (selectedDay === 'tomorrow') d.setDate(d.getDate() + 1); d.setHours(parseInt(hours), parseInt(minutes), 0, 0); return d; })())}`
          : 'Выберите время'
        }
      </Button>
    </div>
  );
};

export default ScheduleMessagePicker;
