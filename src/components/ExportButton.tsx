import React, { useState, useRef} from 'react';
import { Button } from '@/components/ui/button';
import { ImageRun } from 'docx';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
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
import { FileDown, Eye } from 'lucide-react';
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

export default function ExportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [filters, setFilters] = useState<ExportFilters>({});
  const { tasks, getSubordinates, getUserById } = useTaskContext();
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const activeInputRef = useRef<HTMLInputElement>(null);

  const [subordinates, setSubordinates] = useState([]);

  React.useEffect(() => {
    if (!isOpen || !activeInputRef.current) return;

    const timer = setTimeout(() => {
      activeInputRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, filters]);

  React.useEffect(() => {
    const loadSubordinates = async () => {
      try {
        const subs = await getSubordinates();
        // Добавляем проверку на наличие fullname
        const filteredSubs = subs.filter(sub => sub?.fullname);
        setSubordinates(filteredSubs);
      } catch (error) {
        console.error('Ошибка загрузки подчиненных:', error);
        setSubordinates([]);
      }
    };
    loadSubordinates();
  }, []); // Убедитесь, что зависимостей нет или они правильные

  const generateProtocolDocument = async (filteredTasks) => {
    const logoImage = await fetch('/img/label.png').then(res => res.arrayBuffer());

    const imageRun = new ImageRun({
      data: logoImage,
      transformation: {
        width: 200,
        height: 50,
      },
      type: "png", // Указываем MIME-тип изображения
      
    });
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
  
    // Формируем массив ФИО присутствующих
    const attendees = users.map(user => user?.fullname || `Пользователь ${user?.id}`);
  
    // Добавляем ФИО из полей попапа, если они заполнены
    if (filters.approvedBy) attendees.push(filters.approvedBy);
    if (filters.protocolAuthor) attendees.push(filters.protocolAuthor);
  
    // Удаляем дубликаты и преобразуем в строку
    const uniqueAttendees = [...new Set(attendees)];
    const attendeesString = uniqueAttendees.join(', ');
  
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
            // Заменяем текстовые параграфы на изображение
          new Paragraph({
            children: [
              new ImageRun({
                data: logoImage,
                transformation: {
                  width: 200, // ширина в пикселях
                  height: 75, // высота в пикселях
                },
                type: "png", // Важно указать тип
                
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
  
            new Paragraph({
              text: "УТВЕРЖДАЮ",
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 },
            }),
            
            filters.approvedByPosition && new Paragraph({
              text: filters.approvedByPosition,
              alignment: AlignmentType.RIGHT,
              spacing: { after: 0 },
            }),
            
            new Paragraph({
              text: filters.approvedBy || "___________________________",
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
            
            // Добавляем название протокола из поля filters.protocolName
            new Paragraph({
              text: filters.protocolName || "",
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
            new Paragraph({
              text: `от ${format(new Date(), 'dd.MM.yyyy', { locale: ru })} г. Москва`,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
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
            
            filters.protocolAuthorPosition && new Paragraph({
              children: [
                new TextRun({
                  text: "Протокол вел:",
                  bold: true,
                }),
              ],
              indent: { left: 0 },
              spacing: { before: 400 },
            }),
            
            filters.protocolAuthorPosition && new Paragraph({
              text: filters.protocolAuthorPosition,
              indent: { left: 0 },
              spacing: { after: 0 },
            }),
            
            new Paragraph({
              text: filters.protocolAuthor || "___________________________",
              indent: { left: 0 },
            }),
            
            new Paragraph({
              text: "___________________________",
              indent: { left: 0 },
            }),
            
            // new Paragraph({
            //   text: "___________________________",
            //   indent: { left: 0 },
            // }),
          ].filter(Boolean),
        },
      ],
    });
  
    return doc;
  };

  const generatePreviewContent = async (filteredTasks) => {
    let content = '';
    
    // Заголовок
    content += 'Акционерное общество\n';
    content += '(АО"Мосинжпроект")\n\n';
    
    // Утверждающий
    content += 'УТВЕРЖДАЮ\n\n';
    if (filters.approvedByPosition) content += `${filters.approvedByPosition}\n`;
    content += `${filters.approvedBy || "___________________________"}\n`;
    content += "___________________________\n\n";
    
    // Название протокола
    content += 'ПРОТОКОЛ\n\n';
    if (filters.protocolName) content += `${filters.protocolName}\n\n`;
    content += `от ${format(new Date(), 'dd.MM.yyyy', { locale: ru })} г. Москва\n\n`;
    
    // Присутствующие
    const uniqueUserIds = new Set();
    filteredTasks.forEach(task => {
      if (task.assignedTo) uniqueUserIds.add(task.assignedTo);
      if (task.createdBy) uniqueUserIds.add(task.createdBy);
    });
    
    const users = await Promise.all(
      Array.from(uniqueUserIds).map(async userId => await getUserById(userId))
    );
    
    let attendees = users.map(user => user?.fullname || `Пользователь ${user?.id}`);
    if (filters.approvedBy) attendees.push(filters.approvedBy);
    if (filters.protocolAuthor) attendees.push(filters.protocolAuthor);
    
    const uniqueAttendees = [...new Set(attendees)];
    content += `Присутствовали: ${uniqueAttendees.join(', ')}\n\n`;
    
    // Таблица поручений
    content += '№ | Поручение | Ответственный (Ф.И.О.) | Срок исполнения\n';
    // content += '--- | --- | --- | ---\n';
    
    filteredTasks.forEach((task, index) => {
      content += `${index + 1} | ${task.title} | ${task.assignedToName || ''} | ${format(new Date(task.deadline), 'dd.MM.yyyy', { locale: ru })}\n`;
    });
    
    // Подпись
    content += '\n';
    if (filters.protocolAuthorPosition) {
      content += 'Протокол вел:\n';
      content += `${filters.protocolAuthorPosition}\n`;
    }
    content += `${filters.protocolAuthor || "___________________________"}\n`;
    content += "___________________________\n";
    // content += "___________________________\n";
    
    return content;
  };

  const handlePreview = async () => {
    try {
      const filteredTasks = await filterTasks();
      if (filteredTasks.length === 0) {
        toast({
          title: "Нет данных для предпросмотра",
          description: "По выбранным фильтрам не найдено протокольных поручений",
          variant: "destructive"
        });
        return;
      }
      
      const content = await generatePreviewContent(filteredTasks);
      setPreviewContent(content);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Ошибка при формировании предпросмотра:', error);
      toast({
        title: "Ошибка предпросмотра",
        description: "Не удалось сформировать предпросмотр",
        variant: "destructive"
      });
    }
  };

  const filterTasks = async () => {
    let filteredTasks = tasks.filter(task => task.isProtocol === 'active');
  
    if (filters.startDate && filters.endDate) {
      filteredTasks = filteredTasks.filter(task => {
        const taskDate = new Date(task.deadline);
        return taskDate >= filters.startDate! && taskDate <= filters.endDate!;
      });
    } else if (filters.startDate) {
      filteredTasks = filteredTasks.filter(task => 
        new Date(task.deadline) >= filters.startDate!
      );
    } else if (filters.endDate) {
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
  
    return filteredTasks;
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const filteredTasks = await filterTasks();

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
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Экспорт протокола</span>
          </Button>
        </DialogTrigger>
        <DialogContent 
          ref={dialogContentRef}
          className="max-w-2xl max-h-[80vh] overflow-y-auto sm:max-h-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="top-0 bg-background z-10 pt-2">
            <DialogTitle>Экспорт протокола совещания</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="approvedBy">Утвержден (кем)</Label>
              <Input
                id="approvedBy"
                ref={activeInputRef}
                value={filters.approvedBy || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  approvedBy: e.target.value
                }))}
                placeholder="Введите ФИО утверждающего"
                onFocus={(e) => {
                  activeInputRef.current = e.target;
                  setTimeout(() => {
                    e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }, 100);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approvedByPosition">Должность утверждающего</Label>
              <Input
                id="approvedByPosition"
                value={filters.approvedByPosition || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  approvedByPosition: e.target.value
                }))}
                placeholder="Например: Исполнительный директор"
                onFocus={(e) => {
                  activeInputRef.current = e.target;
                  setTimeout(() => {
                    e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }, 100);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="protocolName">Название протокола</Label>
              <Input
                id="protocolName"
                value={filters.protocolName || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  protocolName: e.target.value
                }))}
                placeholder="Введите название протокола"
                onFocus={(e) => {
                  activeInputRef.current = e.target;
                  setTimeout(() => {
                    e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }, 100);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="protocolAuthor">Протокол ведет</Label>
              <Input
                id="protocolAuthor"
                value={filters.protocolAuthor || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  protocolAuthor: e.target.value
                }))}
                placeholder="Введите ФИО ведущего протокол"
                onFocus={(e) => {
                  activeInputRef.current = e.target;
                  setTimeout(() => {
                    e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }, 100);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="protocolAuthorPosition">Должность ведущего протокол</Label>
              <Input
                id="protocolAuthorPosition"
                value={filters.protocolAuthorPosition || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  protocolAuthorPosition: e.target.value
                }))}
                placeholder="Например: Секретарь совещания"
                onFocus={(e) => {
                  activeInputRef.current = e.target;
                  setTimeout(() => {
                    e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }, 100);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Диапазон дедлайнов</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.startDate && !filters.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate && filters.endDate ? (
                      `${format(filters.startDate, "dd.MM.yyyy")} - ${format(filters.endDate, "dd.MM.yyyy")}`
                    ) : filters.startDate ? (
                      `${format(filters.startDate, "dd.MM.yyyy")} - `
                    ) : (
                      <span>Выберите диапазон дат</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: filters.startDate,
                      to: filters.endDate,
                    }}
                    onSelect={(range) => {
                      setFilters((prev) => ({
                        ...prev,
                        startDate: range?.from,
                        endDate: range?.to,
                      }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
                    <SelectItem 
                      key={user.id} 
                      value={user.id}
                      // Добавляем проверку на наличие имени
                      disabled={!user?.fullname}
                    >
                      {user?.fullname || 'Без имени'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 sticky bottom-0 bg-background pb-2 pt-4">
              <Button 
                variant="outline" 
                onClick={handlePreview}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Предпросмотр</span>
                <span className="sm:hidden">Просмотр</span>
              </Button>
              <div className="flex space-x-2">
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
                  {isExporting ? 'Формируется...' : 'Сформировать'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог предпросмотра */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Предпросмотр протокола</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-gray-50 p-4 rounded-md">
            <pre className="whitespace-pre-wrap font-sans">{previewContent}</pre>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPreviewOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}