import type { SkinType, AgeGroup } from '../types';
import type { SortBy, SortOrder } from '../utils/sorting';

export interface SortOption {
  sortBy: SortBy;
  order: SortOrder;
}

export interface FilterOption {
  skinType?: SkinType;
  ageGroup?: AgeGroup;
}

interface SortFilterBarProps {
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
  currentSort: SortOption;
  currentFilter: FilterOption;
}

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: '평점 높은순', value: { sortBy: 'rating', order: 'desc' } },
  { label: '평점 낮은순', value: { sortBy: 'rating', order: 'asc' } },
  { label: '리뷰 많은순', value: { sortBy: 'reviews', order: 'desc' } },
  { label: '리뷰 적은순', value: { sortBy: 'reviews', order: 'asc' } },
  { label: '가격 높은순', value: { sortBy: 'price', order: 'desc' } },
  { label: '가격 낮은순', value: { sortBy: 'price', order: 'asc' } },
];

const SKIN_TYPES: SkinType[] = ['건성', '지성', '복합성', '민감성', '중성'];
const AGE_GROUPS: AgeGroup[] = ['10대', '20대', '30대', '40대', '50대 이상'];

/**
 * 정렬 및 필터 바 컴포넌트
 */
export function SortFilterBar({
  onSortChange,
  onFilterChange,
  currentSort,
  currentFilter,
}: SortFilterBarProps) {
  const currentSortIndex = SORT_OPTIONS.findIndex(
    (opt) =>
      opt.value.sortBy === currentSort.sortBy &&
      opt.value.order === currentSort.order
  );

  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 정렬 */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
          정렬
        </label>
        <select
          id="sort-select"
          value={currentSortIndex >= 0 ? currentSortIndex : 0}
          onChange={(e) => onSortChange(SORT_OPTIONS[Number(e.target.value)].value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {SORT_OPTIONS.map((opt, idx) => (
            <option key={idx} value={idx}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 피부타입 필터 */}
      <div className="flex items-center gap-2">
        <label htmlFor="skin-filter" className="text-sm font-medium text-gray-700">
          피부타입
        </label>
        <select
          id="skin-filter"
          value={currentFilter.skinType || ''}
          onChange={(e) =>
            onFilterChange({
              ...currentFilter,
              skinType: (e.target.value || undefined) as SkinType | undefined,
            })
          }
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">전체</option>
          {SKIN_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* 연령대 필터 */}
      <div className="flex items-center gap-2">
        <label htmlFor="age-filter" className="text-sm font-medium text-gray-700">
          연령대
        </label>
        <select
          id="age-filter"
          value={currentFilter.ageGroup || ''}
          onChange={(e) =>
            onFilterChange({
              ...currentFilter,
              ageGroup: (e.target.value || undefined) as AgeGroup | undefined,
            })
          }
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">전체</option>
          {AGE_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
