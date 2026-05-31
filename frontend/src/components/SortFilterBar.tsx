import type { SortBy, SortOrder } from '../types';

interface SortFilterBarProps {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: (order: SortOrder) => void;
}

const SORT_OPTIONS: { label: string; value: SortBy }[] = [
  { label: '평점순', value: 'rating' },
  { label: '리뷰 수순', value: 'reviews' },
  { label: '가격순', value: 'price' },
];

/**
 * 정렬 바 컴포넌트
 */
export function SortFilterBar({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: SortFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
          정렬
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortBy)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="order-select" className="text-sm font-medium text-gray-700">
          순서
        </label>
        <select
          id="order-select"
          value={sortOrder}
          onChange={(e) => onSortOrderChange(e.target.value as SortOrder)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="desc">높은순</option>
          <option value="asc">낮은순</option>
        </select>
      </div>
    </div>
  );
}
