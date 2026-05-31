import type { Product, Review } from '../types';
import { calculateAverageRating, calculateRatingDistribution } from '../utils/stats';

interface SummaryCardProps {
  product: Product;
  reviews: Review[];
}

/**
 * 상품 요약 카드 컴포넌트
 * - 평균 평점 (큰 숫자)
 * - 총 리뷰 수
 * - 평점 분포 미니 바
 */
export function SummaryCard({ product, reviews }: SummaryCardProps) {
  const avgRating = reviews.length > 0 ? calculateAverageRating(reviews) : product.averageRating;
  const distribution = calculateRatingDistribution(reviews);
  const totalReviews = reviews.length || product.totalReviews;
  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-700 mb-4">요약</h3>

      <div className="flex items-center gap-6 mb-6">
        {/* 평균 평점 */}
        <div className="text-center">
          <p className="text-4xl font-bold text-green-600">
            {avgRating.toFixed(1)}
          </p>
          <p className="text-sm text-gray-500 mt-1">평균 평점</p>
        </div>

        {/* 총 리뷰 수 */}
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-800">
            {totalReviews.toLocaleString('ko-KR')}
          </p>
          <p className="text-sm text-gray-500 mt-1">총 리뷰</p>
        </div>
      </div>

      {/* 평점 분포 미니 바 */}
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-6">{rating}점</span>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{
                  width: `${(distribution[rating] / maxCount) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8 text-right">
              {distribution[rating]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
