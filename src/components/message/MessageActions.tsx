import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { Message } from '@/types/chat.types';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

type MessageActionsProps = {
  message: Message;
  onReaction: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  canDelete?: boolean;
  showDeleteConfirm: boolean;
  onShowDeleteConfirm: (show: boolean) => void;
  mobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
};

export const MessageActions = ({
  message,
  onReaction,
  onReply,
  onForward,
  onDelete,
  canDelete,
  showDeleteConfirm,
  onShowDeleteConfirm,
  mobileMenuOpen = false,
  onMobileMenuClose,
}: MessageActionsProps) => {
  const handleMobileReaction = (emoji: string) => {
    onReaction(message.id, emoji);
    onMobileMenuClose?.();
  };

  const handleMobileReply = () => {
    onReply?.(message);
    onMobileMenuClose?.();
  };

  const handleMobileForward = () => {
    onForward?.(message);
    onMobileMenuClose?.();
  };

  const handleMobileDelete = () => {
    onMobileMenuClose?.();
    onShowDeleteConfirm(true);
  };

  return (
    <>
      <div className="hidden md:flex opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity flex-shrink-0 mt-0.5 items-center gap-0.5">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center">
              <Icon name="SmilePlus" size={15} className="text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <div className="flex gap-1">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReaction(message.id, emoji)}
                  className="w-8 h-8 rounded-md hover:bg-accent flex items-center justify-center transition-transform hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center">
              <Icon name="MoreHorizontal" size={15} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="min-w-[180px]">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onReply?.(message)}
            >
              <Icon name="Reply" size={16} className="text-muted-foreground" />
              <span>Ответить</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onForward?.(message)}
            >
              <Icon name="Forward" size={16} className="text-muted-foreground" />
              <span>Переслать</span>
            </DropdownMenuItem>
            {canDelete && onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => onShowDeleteConfirm(true)}
                >
                  <Icon name="Trash2" size={16} />
                  <span>Удалить</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={mobileMenuOpen} onOpenChange={(v) => !v && onMobileMenuClose?.()}>
        <DialogContent className="md:hidden fixed bottom-0 left-0 right-0 top-auto translate-y-0 rounded-t-2xl rounded-b-none border-b-0 p-0 max-w-full w-full data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom">
          <DialogTitle className="sr-only">Действия с сообщением</DialogTitle>

          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mt-3 mb-2" />

          <div className="flex justify-center gap-2 px-4 pb-3">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleMobileReaction(emoji)}
                className="w-10 h-10 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center text-lg active:scale-95 transition-transform"
                style={{ touchAction: 'manipulation' }}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="border-t border-border/60">
            <button
              onClick={handleMobileReply}
              className="flex items-center gap-3 w-full px-5 py-3.5 text-left hover:bg-accent/50 active:bg-accent transition-colors"
              style={{ touchAction: 'manipulation' }}
            >
              <Icon name="Reply" size={20} className="text-muted-foreground" />
              <span className="text-sm font-medium">Ответить</span>
            </button>
            <button
              onClick={handleMobileForward}
              className="flex items-center gap-3 w-full px-5 py-3.5 text-left hover:bg-accent/50 active:bg-accent transition-colors"
              style={{ touchAction: 'manipulation' }}
            >
              <Icon name="Forward" size={20} className="text-muted-foreground" />
              <span className="text-sm font-medium">Переслать</span>
            </button>
            {canDelete && onDelete && (
              <button
                onClick={handleMobileDelete}
                className="flex items-center gap-3 w-full px-5 py-3.5 text-left hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
                style={{ touchAction: 'manipulation' }}
              >
                <Icon name="Trash2" size={20} className="text-destructive" />
                <span className="text-sm font-medium text-destructive">Удалить</span>
              </button>
            )}
          </div>

          <div className="pb-[env(safe-area-inset-bottom,8px)]" />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={onShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сообщение?</AlertDialogTitle>
            <AlertDialogDescription>
              Сообщение будет удалено без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete?.(message.id)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageActions;
