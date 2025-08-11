import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTaskContext } from '@/contexts/TaskContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AddTaskMobile: React.FC = () => {
  const { departments, users, addTask } = useTaskContext();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [deadline, setDeadline] = useState<Date>();
  const [selectedDepartment, setSelectedDepartment] = useState('none');
  const [selectedAssignee, setSelectedAssignee] = useState('none');
  const [isProtocol, setIsProtocol] = useState<'active' | 'inactive'>('inactive');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !deadline) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await addTask(
        title.trim(),
        description.trim(),
        priority,
        isProtocol,
        deadline,
        selectedDepartment === 'none' ? undefined : selectedDepartment || undefined,
        selectedAssignee === 'none' ? undefined : selectedAssignee || undefined
      );
      
      // Очищаем форму
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDeadline(undefined);
      setSelectedDepartment('none');
      setSelectedAssignee('none');
      setIsProtocol('inactive');
      
      toast({
        title: "Успешно",
        description: "Поручение создано"
      });
    } catch (error) {
      console.error("Ошибка при создании поручения:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать поручение",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 pb-20 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Новое поручение</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Заголовок *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите заголовок поручения"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Описание *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опишите поручение"
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="priority">Приоритет</Label>
              <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите приоритет" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Срок выполнения *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {departments.length > 0 && (
              <div>
                <Label htmlFor="department">Департамент</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите департамент" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбран</SelectItem>
                    {departments.filter(dept => dept.id).map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {users.length > 0 && (
              <div>
                <Label htmlFor="assignee">Исполнитель</Label>
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите исполнителя" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбран</SelectItem>
                    {users.filter(user => user.id).map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.fullname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="protocol">Протокол</Label>
              <Select value={isProtocol} onValueChange={(value: 'active' | 'inactive') => setIsProtocol(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Статус протокола" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inactive">Неактивен</SelectItem>
                  <SelectItem value="active">Активен</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Создание..." : "Создать поручение"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddTaskMobile;
