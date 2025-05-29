import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { FileDown } from 'lucide-react';
import { useTaskContext } from '@/contexts/TaskContext';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ExportFilters } from '@/types';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
} from 'docx';

export default function ExportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({});
  const { tasks, getSubordinates, getUserById } = useTaskContext();

  const [subordinates, setSubordinates] = useState([]);

  React.useEffect(() => {
    const loadSubordinates = async () => {
      try {
        const subs = await getSubordinates();
        setSubordinates(subs);
      } catch (error) {
        console.error('Ошибка загрузки подчиненных:', error);
      }
    };
    loadSubordinates();
  }, []);

  const generateWordDocument = async (filteredTasks) => {
    // Подготовка данных для таблицы
    const tableRows = await Promise.all(
      filteredTasks.map(async (task) => {
        const assignee = await getUserById(task.assignedTo);
        const creator = await getUserById(task.createdBy);
        
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(task.title)],
            }),
            new TableCell({
              children: [new Paragraph(task.description)],
            }),
            new TableCell({
              children: [new Paragraph(assignee?.name || 'Неизвестно')],
            }),
            new TableCell({
              children: [new Paragraph(
                task.priority === 'high' ? 'Высокий' : 
                task.priority === 'medium' ? 'Средний' : 'Низкий'
              )],
            }),
            new TableCell({
              children: [new Paragraph(
                format(new Date(task.deadline), 'dd.MM.yyyy HH:mm', { locale: ru })
              )],
            }),
            new TableCell({
              children: [new Paragraph(
                task.status === 'new' ? 'Новое' :
                task.status === 'in_progress' ? 'В работе' :
                task.status === 'on_verification' ? 'На проверке' :
                task.status === 'completed' ? 'Завершено' : 'Просрочено'
              )],
            }),
          ],
        });
      })
    );

    // Заголовки таблицы
    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph('Название')],
        }),
        new TableCell({
          children: [new Paragraph('Описание')],
        }),
        new TableCell({
          children: [new Paragraph('Исполнитель')],
        }),
        new TableCell({
          children: [new Paragraph('Приоритет')],
        }),
        new TableCell({
          children: [new Paragraph('Дедлайн')],
        }),
        new TableCell({
          children: [new Paragraph('Статус')],
        }),
      ],
    });

    // Создаем документ Word
    const doc = new Document({
      sections: [
        {
          children: [
            // Заголовок документа
            new Paragraph({
              text: "Протокольные поручения",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
            // Вводный текст
            new Paragraph({
              children: [
                new TextRun({
                  text: "Данный документ содержит список протокольных поручений, сформированный ",
                  bold: true,
                }),
                new TextRun({
                  text: format(new Date(), 'dd.MM.yyyy', { locale: ru }),
                  bold: true,
                  underline: {},
                }),
                new TextRun({
                  text: ".",
                  bold: true,
                }),
              ],
              spacing: { after: 200 },
            }),
            
            // Дополнительная информация
            new Paragraph({
              text: "Ниже представлена таблица с текущими поручениями:",
              spacing: { after: 200 },
            }),
            
            // Таблица с данными
            new Table({
              rows: [headerRow, ...tableRows],
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              columnWidths: [2000, 3000, 2000, 1500, 2000, 1500],
            }),
            
            // Заключительный текст
            new Paragraph({
              text: "Данные актуальны на момент формирования отчета.",
              spacing: { before: 400 },
              italics: true,
            }),
            
            new Paragraph({
              text: `Всего поручений: ${filteredTasks.length}`,
              bold: true,
            }),
          ],
        },
      ],
    });

    return doc;
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Фильтруем только протокольные поручения
      let filteredTasks = tasks.filter(task => task.isProtocol === 'active');

      // Применяем фильтры
      if (filters.startDate) {
        filteredTasks = filteredTasks.filter(task => 
          new Date(task.deadline) >= filters.startDate!
        );
      }

      if (filters.endDate) {
        filteredTasks = filteredTasks.filter(task => 
          new Date(task.deadline) <= filters.endDate!
        );
      }

      if (filters.assigneeId && filters.assigneeId !== 'all') {
        filteredTasks = filteredTasks.filter(task => 
          task.assignedTo === filters.assigneeId
        );
      }

      if (filteredTasks.length === 0) {
        toast({
          title: "Нет данных для экспорта",
          description: "По выбранным фильтрам не найдено протокольных поручений",
          variant: "destructive"
        });
        return;
      }

      // Генерируем Word документ
      const doc = await generateWordDocument(filteredTasks);
      
      // Конвертируем в Blob и сохраняем
      Packer.toBlob(doc).then((blob) => {
        const fileName = `Протокольные_поручения_${format(new Date(), 'dd.MM.yyyy', { locale: ru })}.docx`;
        saveAs(blob, fileName);
      });

      toast({
        title: "Экспорт завершен",
        description: `Экспортировано ${filteredTasks.length} протокольных поручений`
      });

      setIsOpen(false);
      setFilters({});
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      toast({
        title: "Ошибка экспорта",
        description: "Не удалось экспортировать данные",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">Экспорт</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Экспорт протокольных поручений</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Дедлайн от</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                startDate: e.target.value ? new Date(e.target.value) : undefined 
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="endDate">Дедлайн до</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                endDate: e.target.value ? new Date(e.target.value) : undefined 
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Исполнитель</Label>
            <Select 
              value={filters.assigneeId || 'all'} 
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                assigneeId: value === 'all' ? undefined : value 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Все исполнители" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все исполнители</SelectItem>
                {subordinates.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Экспортируется...' : 'Экспорт в Word'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}