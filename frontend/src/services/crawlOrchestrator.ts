import type { Product, Review, CategorizedData, Keyword } from '../types';
import { searchProducts, fetchReviews } from './workerApi';

/** 진행 상황 콜백 타입 */
export type ProgressCallback = (progress: {
  phase: string;
  current: number;
  total: number;
}) => void;

/** 크롤링 결과 */
export interface CrawlResult {
  products: Product[];
  reviews: Map<string, Review[]>;
  categorized: Map<string, CategorizedData>;
  keywords: Map<string, Keyword[]>;
}

const MAX_PRODUCTS = 100;
const MAX_REVIEW_PAGES = 10;
const DELAY_MS = 1000;

/** 지정된 시간만큼 대기 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 검색 URL로부터 전체 크롤링을 오케스트레이션한다.
 *
 * 1. searchProducts로 상품 목록 수집
 * 2. 각 상품에 대해 순차적으로 리뷰 수집 (최대 10페이지)
 * 3. 호출 간 1초 딜레이
 * 4. 실패한 상품은 건너뛰고 계속 진행
 */
export async function crawlAll(
  searchUrl: string,
  onProgress: ProgressCallback
): Promise<CrawlResult> {
  // Phase 1: 상품 목록 수집
  onProgress({ phase: '상품 수집 중...', current: 0, total: 0 });

  const searchResponse = await searchProducts(searchUrl);
  const products = searchResponse.products.slice(0, MAX_PRODUCTS);

  onProgress({ phase: '상품 수집 중...', current: products.length, total: products.length });

  // Phase 2: 리뷰 수집
  const reviews = new Map<string, Review[]>();
  const categorized = new Map<string, CategorizedData>();
  const keywords = new Map<string, Keyword[]>();

  const total = products.length;

  for (let i = 0; i < total; i++) {
    const product = products[i];
    onProgress({ phase: '리뷰 수집 중...', current: i + 1, total });

    try {
      const productReviews: Review[] = [];
      let productCategorized: CategorizedData | undefined;
      const productKeywords: Keyword[] = [];

      for (let page = 1; page <= MAX_REVIEW_PAGES; page++) {
        if (page > 1 || i > 0) {
          await delay(DELAY_MS);
        }

        const response = await fetchReviews(product.url, page);

        productReviews.push(...response.reviews);

        // 마지막 페이지의 categorized 데이터를 사용 (누적 분류)
        if (response.categorized) {
          productCategorized = response.categorized;
        }

        if (response.keywords) {
          // 키워드는 마지막 페이지 결과를 사용하거나 누적
          productKeywords.length = 0;
          productKeywords.push(...response.keywords);
        }

        if (!response.hasNext) {
          break;
        }
      }

      reviews.set(product.id, productReviews);

      if (productCategorized) {
        categorized.set(product.id, productCategorized);
      }

      if (productKeywords.length > 0) {
        keywords.set(product.id, productKeywords);
      }
    } catch (err) {
      // 개별 상품 실패 시 건너뛰기
      console.error(
        `상품 "${product.name}" 리뷰 수집 실패:`,
        err instanceof Error ? err.message : err
      );
      continue;
    }
  }

  onProgress({ phase: '완료', current: total, total });

  return { products, reviews, categorized, keywords };
}
