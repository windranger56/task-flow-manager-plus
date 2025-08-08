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
      return 'bg-[#BCBCBC]';
    case 'in_progress':
      return 'bg-[#3F79FF]';
    case 'on_verification':
      return 'bg-[#EEF4C7]';
    case 'overdue':
    case 'canceled':
      return 'bg-[#DA100B]';
    default:
      return 'bg-red-400';
  }
}
