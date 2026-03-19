import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

type SidebarActionsProps = {
  isAdmin: boolean;
  isTeachersGroup: boolean;
  isArchived?: boolean;
  onArchive?: () => void;
  onDeleteGroup?: () => void;
};

export const SidebarActions = ({
  isAdmin,
  isTeachersGroup,
  isArchived,
  onArchive,
  onDeleteGroup,
}: SidebarActionsProps) => {
  return (
    <>
      {isAdmin && onArchive && !isTeachersGroup && (
        <div className="pt-4 border-t border-border">
          <Button variant="outline" className="w-full" onClick={onArchive}>
            <Icon name={isArchived ? 'ArchiveRestore' : 'Archive'} size={16} className="mr-2" />
            {isArchived ? 'Вернуть из архива' : 'В архив'}
          </Button>
        </div>
      )}

      {isAdmin && onDeleteGroup && (
        <div className="pt-4 border-t border-border">
          <Button variant="destructive" className="w-full" onClick={onDeleteGroup}>
            <Icon name="Trash2" size={16} className="mr-2" />
            Удалить группу
          </Button>
        </div>
      )}
    </>
  );
};

export default SidebarActions;
