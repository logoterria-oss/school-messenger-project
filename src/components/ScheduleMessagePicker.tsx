import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { ru } from 'date-fns/locale';

type ScheduleMessagePickerProps = {
  onSchedule: (date: Date) => void;
  onClose: () => void;
};

const QUICK_OPTIONS = [
  { label: 'Через 1 час', getDate: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d; } },
  { label: 'Через 2 часа', getDate: () => { const d = new Date(); d.setHours(d.getHours() + 2); return d; } },
  { label: 'Через 4 часа', getDate: () => { const d = new Date(); d.setHours(d.getHours() + 4); return d; } },
  { label: 'Завтра в 9:00', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
  { label: 'Завтра в 12:00', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); return d; } },
];

const formatScheduleDate = (date: Date): string => {
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month}, ${hours}:${minutes}`;
};

export const ScheduleMessagePicker = ({ onSchedule, onClose }: ScheduleMessagePickerProps) => {
  const [showCustom, setShowCustom] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');

  const now = new Date();

  const canScheduleCustom = useMemo(() => {
    if (!selectedDate || !hours || !minutes) return false;
    const h = parseInt(hours);
    const m = parseInt(minutes);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return false;
    const scheduled = new Date(selectedDate);
    scheduled.setHours(h, m, 0, 0);
    return scheduled > now;
  }, [selectedDate, hours, minutes, now]);

  const handleCustomSchedule = () => {
    if (!selectedDate || !canScheduleCustom) return;
    const scheduled = new Date(selectedDate);
    scheduled.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    onSchedule(scheduled);
  };

  if (showCustom) {
    return (
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowCustom(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="ArrowLeft" size={18} />
          </button>
          <span className="text-sm font-medium">Выбрать дату и время</span>
          <div className="w-[18px]" />
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={ru}
          disabled={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date < today;
          }}
          className="rounded-lg border border-border/40"
        />

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
          onClick={handleCustomSchedule}
          disabled={!canScheduleCustom}
          className="w-full"
          size="sm"
        >
          <Icon name="Clock" size={14} className="mr-1.5" />
          {canScheduleCustom && selectedDate
            ? `Отправить ${formatScheduleDate((() => { const d = new Date(selectedDate); d.setHours(parseInt(hours), parseInt(minutes), 0, 0); return d; })())}`
            : 'Выберите дату и время'
          }
        </Button>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      <p className="text-xs font-medium text-muted-foreground px-2 py-1">Отправить позже</p>
      {QUICK_OPTIONS.map((option) => {
        const date = option.getDate();
        return (
          <button
            key={option.label}
            onClick={() => onSchedule(date)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
          >
            <span>{option.label}</span>
            <span className="text-xs text-muted-foreground">{formatScheduleDate(date)}</span>
          </button>
        );
      })}
      <div className="border-t border-border/40 my-1" />
      <button
        onClick={() => setShowCustom(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors text-primary"
      >
        <Icon name="CalendarDays" size={15} />
        <span>Выбрать дату и время</span>
      </button>
    </div>
  );
};

export default ScheduleMessagePicker;