import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

/**
 * 상품 카드 컴포넌트
 * - 상품명, 브랜드, 가격, 평균 평점, 리뷰 수 표시
 * - 이미지 (있을 경우)
 * - 클릭 시 상세 페이지로 이동
 */
export function ProductCard({ product, onClick }: ProductCardProps) {
  const formattedPrice = product.price.toLocaleString('ko-KR');

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    const stars: string[] = [];

    for (let i = 0; i < fullStars; i++) stars.push('★');
    if (hasHalf) stars.push('☆');
    while (stars.length < 5) stars.push('☆');

    return stars.join('');
  };

  return (
    <button
      type="button"
      onClick={() => onClick(product)}
      className="w-full text-left bg-white rounded-lg shadow-sm border border-gray-200 
                 hover:shadow-md hover:border-green-300 transition-all duration-200 
                 overflow-hidden cursor-pointer"
    >
      {product.imageUrl && (
        <div className="w-full h-48 bg-gray-100 overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
          {product.name}
        </h3>

        <p className="text-lg font-bold text-gray-900 mb-2">
          {formattedPrice}원
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-yellow-500 text-sm">
              {renderStars(product.averageRating)}
            </span>
            <span className="text-sm text-gray-700 font-medium">
              {product.averageRating.toFixed(1)}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            리뷰 {product.totalReviews.toLocaleString('ko-KR')}개
          </span>
        </div>
      </div>
    </button>
  );
}
