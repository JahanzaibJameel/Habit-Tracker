import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '../../lib/utils';

interface SparklineProps {
  data: Array<{ date: string; value: number }>;
  width?: number;
  height?: number;
  className?: string;
  color?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 100,
  height = 30,
  className,
  color = '#3b82f6',
  showGrid = false,
  showTooltip = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-muted-foreground', className)}
        style={{ width, height }}
      >
        <span className="text-xs">No data</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-2 text-xs">
          <p className="font-medium">{payload[0].payload.date}</p>
          <p className="text-muted-foreground">Value: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn('overflow-hidden', className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
          <XAxis dataKey="date" hide domain={['dataMin', 'dataMax']} />
          <YAxis hide />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export { Sparkline };
