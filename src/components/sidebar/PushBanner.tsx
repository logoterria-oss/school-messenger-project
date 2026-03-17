import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { getPushStatus, subscribeToPush, type PushStatus } from '@/utils/notificationSound';

type PushBannerProps = {
  userId?: string;
};

const DISMISSED_KEY = 'push-banner-dismissed';

export const PushBanner = ({ userId }: PushBannerProps) => {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) {
      setDismissed(true);
      return;
    }
    getPushStatus().then(setStatus);
  }, []);

  if (dismissed || !status || status === 'subscribed' || status === 'unsupported' || status === 'denied') {
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

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  return (
    <div className="mx-3 mt-2 mb-1 p-3 bg-primary/10 border border-primary/20 rounded-xl relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <Icon name="X" size={14} />
      </button>
      <div className="flex items-start gap-3 pr-4">
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
