import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Review } from '../../types';

interface RatingBarChartProps {
  data: Record<number, Review[]>;
}

/**
 * 평점 분포 막대 차트 컴포넌트
 * Recharts BarChart로 1~5점 분포를 시각화한다.
 */
export function RatingBarChart({ data }: RatingBarChartProps) {
  const chartData = [1, 2, 3, 4, 5].map((rating) => ({
    name: `${rating}점`,
    count: data[rating]?.length ?? 0,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4">평점 분포</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name="리뷰 수" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
