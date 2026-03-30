import { Label } from '@/components/ui/label';

type LessonFormsType = 'individual' | 'group' | 'both';

type LessonFormsSectionProps = {
  lessonForms?: LessonFormsType;
  onUpdate: (value: LessonFormsType) => void;
};

const lessonFormLabels: Record<LessonFormsType, string> = {
  individual: 'Только индивидуальные',
  group: 'Только групповые',
  both: 'Индивидуальные и групповые',
};

export const LessonFormsSection = ({ lessonForms, onUpdate }: LessonFormsSectionProps) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">Формы уроков</Label>
      </div>
      <div className="space-y-2">
        {(['individual', 'group', 'both'] as LessonFormsType[]).map((value) => {
          const isSelected = lessonForms === value;
          return (
            <button
              key={value}
              className={`w-full text-left text-sm px-3 py-2.5 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-accent/50 text-muted-foreground hover:bg-accent'
              }`}
              onClick={() => onUpdate(value)}
            >
              {lessonFormLabels[value]}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LessonFormsSection;
