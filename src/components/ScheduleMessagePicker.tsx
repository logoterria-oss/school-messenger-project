import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { ru } from 'date-fns/locale';

type ScheduleMessagePickerProps = {
  onSchedule: (date: Date) => void;
  onClose: () => void;
};

const formatScheduleDate = (date: Date): string => {
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month}, ${hours}:${minutes}`;
};

export const ScheduleMessagePicker = ({ onSchedule, onClose }: ScheduleMessagePickerProps) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');

  const canSchedule = useMemo(() => {
    if (!selectedDate || !hours || !minutes) return false;
    const h = parseInt(hours);
    const m = parseInt(minutes);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return false;
    const scheduled = new Date(selectedDate);
    scheduled.setHours(h, m, 0, 0);
    return scheduled > new Date();
  }, [selectedDate, hours, minutes]);

  const handleSchedule = () => {
    if (!selectedDate || !canSchedule) return;
    const scheduled = new Date(selectedDate);
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

      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        locale={ru}
        disabled={(date) => {
          const t = new Date();
          t.setHours(0, 0, 0, 0);
          return date < t;
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
        onClick={handleSchedule}
        disabled={!canSchedule}
        className="w-full"
        size="sm"
      >
        <Icon name="Send" size={14} className="mr-1.5" />
        {canSchedule && selectedDate
          ? `Отправить ${formatScheduleDate((() => { const d = new Date(selectedDate); d.setHours(parseInt(hours), parseInt(minutes), 0, 0); return d; })())}`
          : 'Выберите время'
        }
      </Button>
    </div>
  );
};

export default ScheduleMessagePicker;