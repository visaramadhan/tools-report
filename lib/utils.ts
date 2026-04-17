import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function conditionPillClass(condition?: string) {
  const base = 'inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold border';
  if (condition === 'Bad') return cn(base, 'bg-red-100 text-red-700 border-red-200');
  return cn(base, 'bg-green-100 text-green-700 border-green-200');
}
