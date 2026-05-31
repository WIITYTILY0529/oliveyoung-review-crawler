// 올리브영 리뷰 크롤러 - 데이터 모델

/** 평점 분포 항목 */
export interface RatingDistribution {
  rating: number;
  percentage: number;
}

/** 속성 만족도 답변 */
export interface AttributeAnswer {
  name: string;
  percentage: number;
}

/** 속성 만족도 (발색력, 지속력, 수분감 등) */
export interface ReviewAttribute {
  name: string;
  answers: AttributeAnswer[];
}

/** 리뷰 통계 */
export interface ReviewStats {
  averageRating: number;
  reviewCount: number;
  ratingDistribution: RatingDistribution[];
  attributes: ReviewAttribute[];
}

/** 상품 정보 */
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  url: string;
  averageRating: number;
  reviewCount: number;
  reviewStats: ReviewStats | null;
}

/** 크롤링 결과 전체 */
export interface CrawlData {
  searchUrl: string;
  searchQuery: string;
  crawledAt: string;
  products: Product[];
}

/** 정렬 기준 */
export type SortBy = 'rating' | 'reviews' | 'price';
export type SortOrder = 'asc' | 'desc';
