export const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
] as const;

export function formatWeekdays(weekdays: number[]) {
  return WEEKDAYS.filter((day) => weekdays.includes(day.value))
    .map((day) => day.label)
    .join(', ');
}

export function formatScheduleRepeat(
  recurrence: 'daily' | 'weekly' | 'monthly',
  weekdays: number[],
  dayOfMonth: number | null,
) {
  if (recurrence === 'daily' || (recurrence === 'weekly' && weekdays.length === 7)) {
    return 'Every day';
  }

  if (recurrence === 'monthly') {
    return `Day ${dayOfMonth} of each month`;
  }

  return formatWeekdays(weekdays);
}
