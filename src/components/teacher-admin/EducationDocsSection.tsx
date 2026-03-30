import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

type EducationDocsSectionProps = {
  educationDocs: string[];
  onUpdateDocs: (docs: string[]) => void;
};

export const EducationDocsSection = ({ educationDocs, onUpdateDocs }: EducationDocsSectionProps) => {
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newDocs = [...educationDocs, e.target?.result as string];
          onUpdateDocs(newDocs);
        };
        reader.readAsDataURL(file);
      });
    }
    if (event.target) event.target.value = '';
    setIsAddingDoc(false);
  };

  const handleRemoveDoc = (index: number) => {
    const newDocs = educationDocs.filter((_, i) => i !== index);
    onUpdateDocs(newDocs);
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Документы об образовании</Label>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsAddingDoc(true)}
            className="h-8 px-2"
          >
            <Icon name="Plus" size={14} />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {educationDocs.length > 0 ? (
            educationDocs.map((doc, index) => (
              <div key={index} className="relative group">
                <img 
                  src={doc} 
                  alt={`Документ ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveDoc(index)}
                >
                  <Icon name="Trash2" size={12} />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground col-span-2">Нет документов</p>
          )}
        </div>
      </div>

      <Dialog open={isAddingDoc} onOpenChange={setIsAddingDoc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить документ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="doc-upload">Выберите фото документа</Label>
              <Input
                id="doc-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingDoc(false)}>
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EducationDocsSection;
