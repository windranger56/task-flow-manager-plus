import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTaskStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'new':
      return 'bg-gray-400';
    case 'in_progress':
      return 'bg-blue-400';
    case 'on_verification':
      return 'bg-green-300';
    case 'overdue':
    case 'canceled':
      return 'bg-red-700';
    default:
      return 'bg-red-400';
  }
}
