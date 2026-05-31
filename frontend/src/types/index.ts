// 올리브영 리뷰 크롤러 - 공통 데이터 모델

// === 기본 타입 ===

export type SkinType = '건성' | '지성' | '복합성' | '민감성' | '중성';
export type AgeGroup = '10대' | '20대' | '30대' | '40대' | '50대 이상';

// === 도메인 모델 ===

/** 상품 정보 */
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  url: string;
  imageUrl?: string;
  averageRating: number;
  totalReviews: number;
}

/** 리뷰 정보 */
export interface Review {
  productId: string;
  rating: number; // 1-5
  nickname: string;
  date: string; // ISO 8601
  body: string;
  skinType?: SkinType;
  ageGroup?: AgeGroup;
}

/** 카테고리별 분류 데이터 */
export interface CategorizedData {
  byRating: Record<number, Review[]>;
  bySkinType: Record<SkinType, Review[]>;
  byAgeGroup: Record<AgeGroup, Review[]>;
}

/** 키워드 정보 */
export interface Keyword {
  word: string;
  count: number;
  weight: number; // 정규화된 가중치 (0-1)
}

// === 프론트엔드 상태 ===

/** 크롤링 상태 관리 */
export interface CrawlState {
  status:
    | 'idle'
    | 'validating'
    | 'crawling_products'
    | 'crawling_reviews'
    | 'completed'
    | 'error';
  products: Product[];
  reviews: Map<string, Review[]>;
  categorized: Map<string, CategorizedData>;
  keywords: Map<string, Keyword[]>;
  progress: {
    phase: string;
    current: number;
    total: number;
  };
  error?: string;
}

// === Worker API 응답 타입 ===

/** 검색 결과 응답 */
export interface SearchResponse {
  products: Product[];
  totalPages: number;
}

/** 리뷰 크롤링 응답 */
export interface ReviewsResponse {
  reviews: Review[];
  categorized: CategorizedData;
  keywords: Keyword[];
  hasNext: boolean;
}

/** 에러 응답 */
export interface ErrorResponse {
  error: string;
}
