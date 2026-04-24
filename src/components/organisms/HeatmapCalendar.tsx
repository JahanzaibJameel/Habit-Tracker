import React, { useMemo } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  subMonths,
} from 'date-fns';

import { cn } from '../../lib/utils';

interface HeatmapCalendarProps {
  habitId: string;
  completions: Array<{ completedAt: Date; value: number }>;
  startDate?: Date;
  endDate?: Date;
  onDateClick?: (date: Date) => void;
  className?: string;
}

interface HeatmapDay {
  date: Date;
  count: number;
  intensity: number;
  isCurrentMonth: boolean;
}

const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  habitId,
  completions,
  startDate = subMonths(new Date(), 11),
  endDate = new Date(),
  onDateClick,
  className,
}) => {
  const heatmapData = useMemo(() => {
    const completionMap = new Map<string, number>();

    completions.forEach((completion) => {
      const dateKey = format(completion.completedAt, 'yyyy-MM-dd');
      const currentCount = completionMap.get(dateKey) || 0;
      completionMap.set(dateKey, currentCount + completion.value);
    });

    const monthStart = startOfMonth(startDate);
    const monthEnd = endOfMonth(endDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map((date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const count = completionMap.get(dateKey) || 0;

      // Calculate intensity (0-4 scale)
      let intensity = 0;
      if (count > 0) {
        const maxCount = Math.max(...Array.from(completionMap.values()));
        intensity = Math.min(Math.floor((count / maxCount) * 4), 4);
      }

      return {
        date,
        count,
        intensity,
        isCurrentMonth: isSameMonth(date, endDate),
      };
    });
  }, [completions, startDate, endDate]);

  const getIntensityColor = (intensity: number) => {
    const colors = ['bg-gray-100', 'bg-green-100', 'bg-green-200', 'bg-green-300', 'bg-green-400'];
    return colors[intensity];
  };

  const getIntensityColorDark = (intensity: number) => {
    const colors = ['bg-gray-800', 'bg-green-900', 'bg-green-800', 'bg-green-700', 'bg-green-600'];
    return colors[intensity];
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderMonth = (monthStart: Date) => {
    const monthEnd = endOfMonth(monthStart);
    const monthDays = heatmapData.filter((day) => isSameMonth(day.date, monthStart));

    const startWeekday = monthStart.getDay();
    const weeks = [];
    let currentWeek = new Array(startWeekday).fill(null);

    monthDays.forEach((day, index) => {
      currentWeek.push(day);

      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      weeks.push([...currentWeek, ...new Array(7 - currentWeek.length).fill(null)]);
    }

    return (
      <div key={format(monthStart, 'yyyy-MM')} className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          {format(monthStart, 'MMMM yyyy')}
        </h3>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div key={day} className="text-center text-muted-foreground p-1">
              {day.charAt(0)}
            </div>
          ))}

          {/* Calendar days */}
          {weeks.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <div key={`empty-${weekIndex}-${dayIndex}`} className="p-1" />;
                }

                const { date, count, intensity, isCurrentMonth } = day;
                const isToday = isSameDay(date, new Date());

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => onDateClick?.(date)}
                    className={cn(
                      'p-1 rounded-sm border border-transparent transition-all duration-200 hover:border-border hover:scale-110',
                      'heatmap-cell',
                      getIntensityColor(intensity),
                      `dark:${getIntensityColorDark(intensity)}`,
                      !isCurrentMonth && 'opacity-30',
                      isToday && 'ring-2 ring-primary ring-offset-1',
                      count > 0 && 'cursor-pointer'
                    )}
                    title={`${format(date, 'MMM d, yyyy')}: ${count} completion${count !== 1 ? 's' : ''}`}
                  >
                    <span className="text-xs leading-none">{format(date, 'd')}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const months = useMemo(() => {
    const monthList = [];
    let currentDate = startOfMonth(startDate);

    while (currentDate <= endDate) {
      monthList.push(new Date(currentDate));
      currentDate = addMonths(currentDate, 1);
    }

    return monthList;
  }, [startDate, endDate]);

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Activity Heatmap</h2>
        <p className="text-sm text-muted-foreground">
          Your habit completion activity over the past year
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-4 mb-6 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex space-x-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                'w-3 h-3 rounded-sm border',
                getIntensityColor(level),
                `dark:${getIntensityColorDark(level)}`
              )}
            />
          ))}
        </div>
        <span>More</span>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-6">{months.map((month) => renderMonth(month))}</div>

      {/* Stats Summary */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="text-sm font-medium mb-3">Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-2xl font-bold text-primary">{completions.length}</div>
            <div className="text-muted-foreground">Total Completions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {heatmapData.filter((d) => d.count > 0).length}
            </div>
            <div className="text-muted-foreground">Active Days</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(
                (heatmapData.filter((d) => d.count > 0).length / heatmapData.length) * 100
              )}
              %
            </div>
            <div className="text-muted-foreground">Consistency</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.max(...heatmapData.map((d) => d.count), 0)}
            </div>
            <div className="text-muted-foreground">Best Day</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { HeatmapCalendar };
