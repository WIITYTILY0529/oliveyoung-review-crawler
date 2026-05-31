import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCardList } from '../components/ProductCardList';
import { SortFilterBar } from '../components/SortFilterBar';
import { RankingTable } from '../components/RankingTable';
import { useCrawlContext } from '../context/CrawlContext';
import { sortProducts } from '../utils/sorting';
import type { Product } from '../types';
import type { SortOption, FilterOption } from '../components/SortFilterBar';

/**
 * 대시보드 페이지
 * - 상품 목록 + 정렬/필터
 * - 순위 테이블
 */
export function DashboardPage() {
  const { products } = useCrawlContext();
  const navigate = useNavigate();

  const [currentSort, setCurrentSort] = useState<SortOption>({
    sortBy: 'rating',
    order: 'desc',
  });
  const [currentFilter, setCurrentFilter] = useState<FilterOption>({});

  const sortedProducts = sortProducts(products, currentSort.sortBy, currentSort.order);

  const handleProductClick = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  if (products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 text-lg">
          분석할 데이터가 없습니다. 홈에서 URL을 입력해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        분석 결과 ({products.length}개 상품)
      </h2>

      <SortFilterBar
        onSortChange={setCurrentSort}
        onFilterChange={setCurrentFilter}
        currentSort={currentSort}
        currentFilter={currentFilter}
      />

      <ProductCardList
        products={sortedProducts}
        onProductClick={handleProductClick}
      />

      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">평점 순위</h3>
        <RankingTable products={products} />
      </div>
    </div>
  );
}
