
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
import { FileDown, Eye } from 'lucide-react';
import { useTaskContext } from '@/contexts/TaskContext';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ExportFilters, User } from '@/types';
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
import DepartmentSelector from './DepartmentSelector';
import ExecutorSelector from './ExecutorSelector';

export default function ExportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [filters, setFilters] = useState<ExportFilters>({});
  const { tasks, departments, getUserById, supabase } = useTaskContext();
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const activeInputRef = useRef<HTMLInputElement>(null);

  // New state for department and executor management
  const [availableExecutors, setAvailableExecutors] = useState<User[]>([]);
  const [departmentUsers, setDepartmentUsers] = useState<{ [key: string]: User[] }>({});
  const [isLoadingExecutors, setIsLoadingExecutors] = useState(false);

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

  // Initialize default selections when dialog opens
  React.useEffect(() => {
    if (isOpen && departments.length > 0) {
      const allDepartmentIds = departments.map(dept => dept.id);
      
      // Set all departments as selected by default
      if (!filters.selectedDepartments) {
        setFilters(prev => ({
          ...prev,
          selectedDepartments: allDepartmentIds,
          selectedExecutors: [] // Will be populated when executors load
        }));
        
        // Load executors for all departments
        loadExecutorsForDepartments(allDepartmentIds);
      }
    }
  }, [isOpen, departments]);

  // Load executors when selected departments change
  React.useEffect(() => {
    if (filters.selectedDepartments && filters.selectedDepartments.length > 0) {
      loadExecutorsForDepartments(filters.selectedDepartments);
    } else {
      setAvailableExecutors([]);
      setFilters(prev => ({ ...prev, selectedExecutors: [] }));
    }
  }, [filters.selectedDepartments]);

  const loadExecutorsForDepartments = async (departmentIds: string[]) => {
    setIsLoadingExecutors(true);
    try {
      const allExecutors: User[] = [];
      const newDepartmentUsers = { ...departmentUsers };

      for (const deptId of departmentIds) {
        if (!departmentUsers[deptId]) {
          // Get all users where departmentId matches
          const { data: departmentEmployees, error: employeesError } = await supabase
            .from('users')
            .select('*')
            .eq('departmentId', deptId);

          if (employeesError) {
            console.error('Error fetching department employees:', employeesError);
            continue;
          }

          // Get department manager
          const department = departments.find(d => d.id === deptId);
          let manager = null;
          
          if (department?.managerId) {
            try {
              manager = await getUserById(department.managerId);
            } catch (error) {
              console.error('Error fetching department manager:', error);
            }
          }

          // Combine employees and manager
          const deptUsers: User[] = [];
          
          // Add department employees
          if (departmentEmployees) {
            departmentEmployees.forEach(emp => {
              if (emp.fullname) { // Only add users with fullname
                deptUsers.push({
                  id: emp.id,
                  fullname: emp.fullname,
                  email: emp.email || '',
                  image: emp.image || '',
                  role: emp.role || deptId
                });
              }
            });
          }

          // Add manager if not already in the list
          if (manager && manager.fullname && !deptUsers.find(u => u.id === manager.id)) {
            deptUsers.push({
              ...manager,
              role: deptId // Set role to department ID for consistency
            });
          }

          newDepartmentUsers[deptId] = deptUsers;
        }
        
        allExecutors.push(...newDepartmentUsers[deptId]);
      }

      // Remove duplicates
      const uniqueExecutors = allExecutors.filter((executor, index, self) =>
        index === self.findIndex(e => e.id === executor.id)
      );

      setDepartmentUsers(newDepartmentUsers);
      setAvailableExecutors(uniqueExecutors);
      
      // Set all executors as selected by default if not already set
      if (!filters.selectedExecutors || filters.selectedExecutors.length === 0) {
        setFilters(prev => ({
          ...prev,
          selectedExecutors: uniqueExecutors.map(exec => exec.id)
        }));
      }
    } catch (error) {
      console.error('Ошибка загрузки исполнителей:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить список исполнителей",
        variant: "destructive"
      });
    } finally {
      setIsLoadingExecutors(false);
    }
  };

  const handleDepartmentToggle = (departmentId: string) => {
    setFilters(prev => {
      const currentSelected = prev.selectedDepartments || [];
      const newSelected = currentSelected.includes(departmentId)
        ? currentSelected.filter(id => id !== departmentId)
        : [...currentSelected, departmentId];
      
      return {
        ...prev,
        selectedDepartments: newSelected
      };
    });
  };

  const handleExecutorToggle = (executorId: string) => {
    setFilters(prev => {
      const currentSelected = prev.selectedExecutors || [];
      const newSelected = currentSelected.includes(executorId)
        ? currentSelected.filter(id => id !== executorId)
        : [...currentSelected, executorId];
      
      return {
        ...prev,
        selectedExecutors: newSelected
      };
    });
  };

  // Create department name mapping for ExecutorSelector
  const departmentNameMap = departments.reduce((acc, dept) => {
    acc[dept.id] = dept.name;
    return acc;
  }, {} as { [key: string]: string });

  const generateProtocolDocument = async (filteredTasks) => {
    const logoImage = await fetch('/img/label.png').then(res => res.arrayBuffer());

    const imageRun = new ImageRun({
      data: logoImage,
      transformation: {
        width: 200,
        height: 50,
      },
      type: "png",
    });

    const uniqueUserIds = new Set();
    filteredTasks.forEach(task => {
      if (task.assignedTo) uniqueUserIds.add(task.assignedTo);
      if (task.createdBy) uniqueUserIds.add(task.createdBy);
    });
  
    const users = await Promise.all(
      Array.from(uniqueUserIds).map(async userId => await getUserById(userId as string))
    );
  
    const attendees = users.map(user => user?.fullname || `Пользователь ${user?.id}`);
  
    if (filters.approvedBy) attendees.push(filters.approvedBy);
    if (filters.protocolAuthor) attendees.push(filters.protocolAuthor);
  
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
            children: [new TextRun({
              text: "№",
              bold: true,
            })],
            alignment: AlignmentType.CENTER,
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: "Поручение",
              bold: true,
            })],
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: "Ответственный (Ф.И.О.)",
              bold: true,
            })],
          })],
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: "Срок исполнения",
              bold: true,
            })],
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
              children: [
                new ImageRun({
                  data: logoImage,
                  transformation: {
                    width: 200,
                    height: 75,
                  },
                  type: "png",
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
          ].filter(Boolean),
        },
      ],
    });
  
    return doc;
  };

  const generatePreviewContent = async (filteredTasks) => {
    let content = '';
    
    content += 'Акционерное общество\n';
    content += '(АО"Мосинжпроект")\n\n';
    
    content += 'УТВЕРЖДАЮ\n\n';
    if (filters.approvedByPosition) content += `${filters.approvedByPosition}\n`;
    content += `${filters.approvedBy || "___________________________"}\n`;
    content += "___________________________\n\n";
    
    content += 'ПРОТОКОЛ\n\n';
    if (filters.protocolName) content += `${filters.protocolName}\n\n`;
    content += `от ${format(new Date(), 'dd.MM.yyyy', { locale: ru })} г. Москва\n\n`;
    
    const uniqueUserIds = new Set();
    filteredTasks.forEach(task => {
      if (task.assignedTo) uniqueUserIds.add(task.assignedTo);
      if (task.createdBy) uniqueUserIds.add(task.createdBy);
    });
    
    const users = await Promise.all(
      Array.from(uniqueUserIds).map(async userId => await getUserById(userId as string))
    );
    
    let attendees = users.map(user => user?.fullname || `Пользователь ${user?.id}`);
    if (filters.approvedBy) attendees.push(filters.approvedBy);
    if (filters.protocolAuthor) attendees.push(filters.protocolAuthor);
    
    const uniqueAttendees = [...new Set(attendees)];
    content += `Присутствовали: ${uniqueAttendees.join(', ')}\n\n`;
    
    content += '№ | Поручение | Ответственный (Ф.И.О.) | Срок исполнения\n';
    
    filteredTasks.forEach((task, index) => {
      content += `${index + 1} | ${task.title} | ${task.assignedToName || ''} | ${format(new Date(task.deadline), 'dd.MM.yyyy', { locale: ru })}\n`;
    });
    
    content += '\n';
    if (filters.protocolAuthorPosition) {
      content += 'Протокол вел:\n';
      content += `${filters.protocolAuthorPosition}\n`;
    }
    content += `${filters.protocolAuthor || "___________________________"}\n`;
    content += "___________________________\n";
    
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

    // Filter by selected departments
    if (filters.selectedDepartments && filters.selectedDepartments.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        filters.selectedDepartments!.includes(task.departmentId)
      );
    }

    // Filter by selected executors
    if (filters.selectedExecutors && filters.selectedExecutors.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        filters.selectedExecutors!.includes(task.assignedTo)
      );
    }

    // Date filters
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

    // Add assignee names
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

            {/* New Department Selector */}
            <div className="border-t pt-4">
              <DepartmentSelector
                departments={departments}
                selectedDepartments={filters.selectedDepartments || []}
                onDepartmentToggle={handleDepartmentToggle}
              />
            </div>

            {/* New Executor Selector */}
            <div className="border-t pt-4">
              <ExecutorSelector
                executors={availableExecutors}
                selectedExecutors={filters.selectedExecutors || []}
                onExecutorToggle={handleExecutorToggle}
                departmentNames={departmentNameMap}
              />
              {isLoadingExecutors && (
                <div className="text-sm text-gray-500 mt-2">
                  Загрузка исполнителей...
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 sticky bottom-0 bg-background pb-2 pt-4">
              
              <div className="flex space-x-2">
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
