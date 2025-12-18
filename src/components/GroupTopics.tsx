import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

type Topic = {
  id: string;
  name: string;
  icon: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
};

type GroupTopicsProps = {
  groupName: string;
  topics: Topic[];
  onSelectTopic: (topicId: string) => void;
  onBack: () => void;
};

export const GroupTopics = ({ groupName, topics, onSelectTopic, onBack }: GroupTopicsProps) => {
  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="bg-card border-b border-border px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-xl hover:bg-muted"
          >
            <Icon name="ArrowLeft" size={20} />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary text-white">
              <Icon name="Users" size={18} />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="font-semibold text-base">{groupName}</h2>
            <p className="text-xs text-muted-foreground">Темы группы</p>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 border-b border-border px-4 py-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Папки с темами
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              className="w-full px-4 py-3 text-left transition-colors hover:bg-accent/50 rounded-lg mb-1 group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                    <Icon name={topic.icon} size={18} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Icon name="Hash" size={14} className="text-muted-foreground" />
                      {topic.name}
                    </h3>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {topic.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {topic.lastMessage}
                    </p>
                    {topic.unread > 0 && (
                      <Badge className="bg-primary text-white text-xs px-2 py-0 h-5 min-w-5 rounded-full flex items-center justify-center">
                        {topic.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
