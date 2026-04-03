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
}: MessageActionsProps) => {
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