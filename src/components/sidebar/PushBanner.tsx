import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { getPushStatus, subscribeToPush, type PushStatus } from '@/utils/notificationSound';

type PushBannerProps = {
  userId?: string;
};

export const PushBanner = ({ userId }: PushBannerProps) => {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPushStatus().then(setStatus);
  }, []);

  if (!status || status === 'subscribed' || status === 'unsupported') {
    return null;
  }

  const handleEnable = async () => {
    if (!userId) return;
    setLoading(true);
    const ok = await subscribeToPush(userId);
    if (ok) {
      setStatus('subscribed');
    } else {
      setStatus(await getPushStatus());
    }
    setLoading(false);
  };

  if (status === 'denied') {
    return (
      <div className="mx-3 mt-2 mb-1 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Icon name="BellOff" size={20} className="text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight">Уведомления заблокированы</p>
            <p className="text-xs text-muted-foreground mt-0.5">Разрешите уведомления в настройках браузера, затем перезагрузите страницу</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 mt-2 mb-1 p-3 bg-primary/10 border border-primary/20 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <Icon name="BellRing" size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">Включите уведомления</p>
          <p className="text-xs text-muted-foreground mt-0.5">Чтобы не пропускать новые сообщения</p>
          <Button
            size="sm"
            className="mt-2 h-7 text-xs rounded-lg"
            onClick={handleEnable}
            disabled={loading}
          >
            {loading ? (
              <Icon name="Loader2" size={14} className="animate-spin mr-1" />
            ) : (
              <Icon name="Bell" size={14} className="mr-1" />
            )}
            Включить
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PushBanner;
