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

  const generateProtocolDocument = async (filteredTasks) => {
    // Собираем уникальных пользователей (ответственные и создатели)
    const uniqueUserIds = new Set();
    filteredTasks.forEach(task => {
      if (task.assignedTo) uniqueUserIds.add(task.assignedTo);
      if (task.createdBy) uniqueUserIds.add(task.createdBy);
    });

    // Получаем данные пользователей
    const users = await Promise.all(
      Array.from(uniqueUserIds).map(async userId => await getUserById(userId))
    );

    // Формируем строку присутствующих
    const attendeesString = users.map(user => user?.fullname || `Пользователь ${user?.id}`).join(', ');

    const tableRows = filteredTasks.map((task, index) => {
      return new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              text: `${index + 1}`,
              alignment: AlignmentType.CENTER,
            })],
          }),
          new TableCell({
            children: [new Paragraph(task.title)],
          }),
          new TableCell({
            children: [new Paragraph(task.assignedToName || '')],
          }),
          new TableCell({
            children: [new Paragraph(
              format(new Date(task.deadline), 'dd.MM.yyyy', { locale: ru })
            )],
          }),
        ],
      });
    });

    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            text: "№",
            bold: true,
            alignment: AlignmentType.CENTER,
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            text: "Поручение",
            bold: true,
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            text: "Ответственный (Ф.И.О.)",
            bold: true,
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            text: "Срок исполнения",
            bold: true,
          })],
        }),
      ],
    });

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1000,
                right: 1000,
                bottom: 1000,
                left: 1000,
              },
            },
          },
          children: [
            new Paragraph({
              text: "Акционерное общество",
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),
            
            new Paragraph({
              text: '(АО"Мосинжпроект")',
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            new Paragraph({
              text: "УТВЕРЖДАЮ",
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 },
            }),
            
            new Paragraph({
              text: "___________________________",
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 },
            }),
            
            new Paragraph({
              text: "___________________________",
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 },
            }),

            new Paragraph({
              text: "ПРОТОКОЛ",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            
            new Paragraph({
              text: "оперативного совещания у исполнительного директора",
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            
            new Paragraph({
              text: "дивизиона по _______________________________",
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            
            new Paragraph({
              text: `от ${format(new Date(), 'dd.MM.yyyy', { locale: ru })} г. Москва`,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
            // Строка с присутствующими
            new Paragraph({
              children: [
                new TextRun({
                  text: "Присутствовали: ",
                  bold: true,
                }),
                new TextRun({
                  text: attendeesString,
                }),
              ],
              spacing: { after: 400 },
            }),
            
            new Table({
              rows: [headerRow, ...tableRows],
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              columnWidths: [500, 3000, 1500, 1000],
              margins: {
                top: 200,
                bottom: 200,
              },
            }),
            
            new Paragraph({
              text: " ",
              spacing: { before: 800 },
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: "Протокол вел:",
                  bold: true,
                }),
              ],
              indent: { left: 0 },
              spacing: { before: 400 },
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: "___________________________",
                }),
              ],
              indent: { left: 0 },
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: "___________________________",
                }),
              ],
              indent: { left: 0 },
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: "___________________________",
                }),
              ],
              indent: { left: 0 },
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
      let filteredTasks = tasks.filter(task => task.isProtocol === 'active');

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

      filteredTasks = await Promise.all(filteredTasks.map(async task => {
        const assignee = await getUserById(task.assignedTo);
        return {
          ...task,
          assignedToName: assignee?.fullname || 'Не указан'
        };
      }));

      if (filteredTasks.length === 0) {
        toast({
          title: "Нет данных для экспорта",
          description: "По выбранным фильтрам не найдено протокольных поручений",
          variant: "destructive"
        });
        return;
      }

      const doc = await generateProtocolDocument(filteredTasks);
      
      Packer.toBlob(doc).then((blob) => {
        const fileName = `Протокол_совещания_${format(new Date(), 'dd.MM.yyyy', { locale: ru })}.docx`;
        saveAs(blob, fileName);
      });

      toast({
        title: "Экспорт завершен",
        description: `Сформирован протокол с ${filteredTasks.length} поручениями`
      });

      setIsOpen(false);
      setFilters({});
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      toast({
        title: "Ошибка экспорта",
        description: "Не удалось сформировать протокол",
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
          <span className="hidden sm:inline">Экспорт протокола</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Экспорт протокола совещания</DialogTitle>
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
                    {user.fullname}
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
              {isExporting ? 'Формируется...' : 'Сформировать протокол'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}