import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadCrawlData } from '../services/dataService';
import { ProductCardList } from '../components/ProductCardList';
import { SortFilterBar } from '../components/SortFilterBar';
import { RankingTable } from '../components/RankingTable';
import { sortProducts } from '../utils/sorting';
import type { Product, CrawlData, SortBy, SortOrder } from '../types';

/**
 * 대시보드 페이지
 * - 상품 목록 + 정렬
 * - 순위 테이블
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CrawlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    loadCrawlData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  const handleProductClick = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">데이터 로딩 중...</p>
      </div>
    );
  }

  if (!data || data.products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 text-lg">
          분석할 데이터가 없습니다. 홈에서 크롤링을 시작해 주세요.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
        >
          홈으로 이동
        </button>
      </div>
    );
  }

  const sortedProducts = sortProducts(data.products, sortBy, sortOrder);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          분석 결과 ({data.products.length}개 상품)
        </h2>
        <span className="text-sm text-gray-500">
          검색어: {data.searchQuery} · {new Date(data.crawledAt).toLocaleDateString('ko-KR')}
        </span>
      </div>

      <SortFilterBar
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortByChange={setSortBy}
        onSortOrderChange={setSortOrder}
      />

      <ProductCardList
        products={sortedProducts}
        onProductClick={handleProductClick}
      />

      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">평점 순위</h3>
        <RankingTable products={data.products} />
      </div>
    </div>
  );
}
