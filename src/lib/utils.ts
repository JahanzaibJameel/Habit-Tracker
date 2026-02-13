import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, format = 'PP'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(d);
}

export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  
  const sortedDates = [...dates]
    .map(date => new Date(date))
    .sort((a, b) => b.getTime() - a.getTime());
  
  let streak = 1;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < sortedDates.length; i++) {
    const expectedDate = new Date(currentDate);
    expectedDate.setDate(currentDate.getDate() - streak);
    expectedDate.setHours(0, 0, 0, 0);
    
    if (sortedDates[i].getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak - 1; // Subtract 1 because we started at 1
}

export function getContrastColor(hexColor: string): 'black' | 'white' {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? 'black' : 'white';
}

export function generateGradient(color: string): string {
  return `linear-gradient(135deg, ${color}20 0%, ${color}40 50%, ${color}20 100%)`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}