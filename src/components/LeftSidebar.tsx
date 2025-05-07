
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Mail, Bell } from "lucide-react";
import { useTaskContext } from '@/contexts/TaskContext';

// Add the props interface for LeftSidebar
interface LeftSidebarProps {
  onItemClick?: () => void;
}

export default function LeftSidebar({ onItemClick }: LeftSidebarProps) {
  const { 
    currentUser, 
    departments, 
    selectDepartment, 
    getUserById, 
    users,
    addDepartment,
    getSubordinates
  } = useTaskContext();
  
  const [showNewDepartment, setShowNewDepartment] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptManager, setNewDeptManager] = useState("");
  
  const [showNewNotifications, setShowNewNotifications] = useState(false);
  const [showOverdueNotifications, setShowOverdueNotifications] = useState(false);
  
  const subordinates = getSubordinates();
  
  const handleCreateDepartment = () => {
    if (newDeptName && newDeptManager) {
      addDepartment(newDeptName, newDeptManager);
      setNewDeptName("");
      setNewDeptManager("");
      setShowNewDepartment(false);
    }
  };

  const handleDepartmentClick = (department: any) => {
    selectDepartment(department);
    // Call onItemClick if it exists
    if (onItemClick) onItemClick();
  };

  return (
    <div className="w-64 flex flex-col h-screen bg-white border-r border-gray-200">
      {/* User Info */}
      <div className="flex flex-col items-center py-6 border-b border-gray-200">
        <Avatar className="h-20 w-20 mb-2">
          <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
          <AvatarFallback>{currentUser.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <h3 className="text-lg font-medium">{currentUser.name}</h3>
        <p className="text-sm text-gray-500">{currentUser.email}</p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-center py-4 border-b border-gray-200">
        <Dialog open={showNewDepartment} onOpenChange={setShowNewDepartment}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Settings className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="department-name">Department Name</Label>
                <Input 
                  id="department-name" 
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Enter department name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department-manager">Department Manager</Label>
                <Select value={newDeptManager} onValueChange={setNewDeptManager}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateDepartment} className="w-full">
                Create Department
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNewNotifications} onOpenChange={setShowNewNotifications}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="relative ml-2">
              <Mail className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                2
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Tasks</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="p-3 border rounded-md">
                <p className="font-medium">New task: Design Review</p>
                <p className="text-sm text-gray-500">Assigned by: Mike Johnson</p>
              </div>
              <div className="p-3 border rounded-md">
                <p className="font-medium">New task: Website Update</p>
                <p className="text-sm text-gray-500">Assigned by: Sarah Lee</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showOverdueNotifications} onOpenChange={setShowOverdueNotifications}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="relative ml-2">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                3
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Overdue Tasks</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="p-3 border rounded-md">
                <p className="font-medium">Overdue: Marketing Report</p>
                <p className="text-sm text-red-500">Due 3 days ago</p>
              </div>
              <div className="p-3 border rounded-md">
                <p className="font-medium">Overdue: Client Presentation</p>
                <p className="text-sm text-red-500">Due 1 day ago</p>
              </div>
              <div className="p-3 border rounded-md">
                <p className="font-medium">Overdue: Budget Planning</p>
                <p className="text-sm text-red-500">Due 5 days ago</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats */}
      <div className="flex justify-between p-4 border-b border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold">12</p>
          <p className="text-xs text-gray-500">Completed tasks</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">22</p>
          <p className="text-xs text-gray-500">To do tasks</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">243</p>
          <p className="text-xs text-gray-500">All completed</p>
        </div>
      </div>
      
      {/* Departments */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-medium uppercase tracking-wider mb-4">ПОДРАЗДЕЛЕНИЯ</h4>
        <ul className="space-y-2">
          {departments.map((department) => (
            <li 
              key={department.id}
              className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded"
              onClick={() => handleDepartmentClick(department)}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: department.color }} />
              <span className="ml-2 text-sm">{department.name.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Subordinates */}
      <div className="p-4">
        <h4 className="text-sm font-medium uppercase tracking-wider mb-4">СОТРУДНИКИ</h4>
        <div className="flex flex-wrap gap-2">
          {subordinates.map((user) => (
            <Avatar key={user.id} className="h-10 w-10">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
    </div>
  );
}
