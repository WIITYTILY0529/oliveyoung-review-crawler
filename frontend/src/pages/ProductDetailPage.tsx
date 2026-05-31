import { useParams, useNavigate } from 'react-router-dom';
import { useCrawlContext } from '../context/CrawlContext';
import { RatingBarChart } from '../components/charts/RatingBarChart';
import { SkinTypePieChart } from '../components/charts/SkinTypePieChart';
import { AgeGroupPieChart } from '../components/charts/AgeGroupPieChart';
import { KeywordCloud } from '../components/charts/KeywordCloud';
import { SummaryCard } from '../components/SummaryCard';

/**
 * 상품 상세 페이지
 * - 요약 카드
 * - 평점 분포 차트
 * - 피부타입/연령대 파이 차트
 * - 키워드 클라우드
 */
export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, getReviews, getCategorized, getKeywords } = useCrawlContext();

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 text-lg">상품을 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  const reviews = getReviews(product.id);
  const categorized = getCategorized(product.id);
  const keywords = getKeywords(product.id);

  const defaultCategorized = categorized || {
    byRating: { 1: [], 2: [], 3: [], 4: [], 5: [] },
    bySkinType: {},
    byAgeGroup: {},
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* 뒤로가기 + 상품 정보 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md 
                     hover:bg-gray-50 transition-colors"
        >
          ← 대시보드
        </button>
        <div>
          <p className="text-sm text-gray-500">{product.brand}</p>
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
        </div>
      </div>

      {/* 요약 카드 */}
      <SummaryCard product={product} reviews={reviews} />

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RatingBarChart data={defaultCategorized.byRating} />
        <SkinTypePieChart data={defaultCategorized.bySkinType} />
        <AgeGroupPieChart data={defaultCategorized.byAgeGroup} />
        <KeywordCloud keywords={keywords} />
      </div>
    </div>
  );
}
