
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
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ExportFilters } from '@/types';

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

      // Подготавливаем данные для Excel
      const exportData = await Promise.all(
        filteredTasks.map(async (task) => {
          const assignee = await getUserById(task.assignedTo);
          const creator = await getUserById(task.createdBy);
          
          return {
            'Название': task.title,
            'Описание': task.description,
            'Исполнитель': assignee?.name || 'Неизвестно',
            'Создатель': creator?.name || 'Неизвестно',
            'Приоритет': task.priority === 'high' ? 'Высокий' : 
                        task.priority === 'medium' ? 'Средний' : 'Низкий',
            'Дедлайн': format(new Date(task.deadline), 'dd.MM.yyyy HH:mm', { locale: ru }),
            'Статус': task.status === 'new' ? 'Новое' :
                     task.status === 'in_progress' ? 'В работе' :
                     task.status === 'on_verification' ? 'На проверке' :
                     task.status === 'completed' ? 'Завершено' : 'Просрочено',
            'Дата создания': format(new Date(task.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })
          };
        })
      );

      // Создаем Excel файл
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Протокольные поручения');

      // Автоширина колонок
      const columnWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, ...exportData.map(row => String(row[key]).length)) + 2
      }));
      worksheet['!cols'] = columnWidths;

      // Генерируем имя файла с текущей датой
      const fileName = `Протокольные_поручения_${format(new Date(), 'dd.MM.yyyy', { locale: ru })}.xlsx`;

      // Скачиваем файл
      XLSX.writeFile(workbook, fileName);

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
              {isExporting ? 'Экспортируется...' : 'Экспорт'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
