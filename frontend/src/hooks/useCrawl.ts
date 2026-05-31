import { useState, useCallback } from 'react';
import type { Product, Review, CategorizedData, Keyword, CrawlState } from '../types';
import { crawlAll } from '../services/crawlOrchestrator';

/**
 * 크롤링 상태 관리 커스텀 훅
 * - startCrawl(url): 크롤링 시작
 * - state: 현재 크롤링 상태
 * - products: 수집된 상품 목록
 * - getReviews(productId): 특정 상품의 리뷰 조회
 * - getCategorized(productId): 특정 상품의 분류 데이터 조회
 * - getKeywords(productId): 특정 상품의 키워드 조회
 */
export function useCrawl() {
  const [state, setState] = useState<CrawlState>({
    status: 'idle',
    products: [],
    reviews: new Map(),
    categorized: new Map(),
    keywords: new Map(),
    progress: { phase: '', current: 0, total: 0 },
  });

  const startCrawl = useCallback(async (url: string) => {
    setState((prev) => ({
      ...prev,
      status: 'validating',
      error: undefined,
      progress: { phase: 'URL 검증 중...', current: 0, total: 0 },
    }));

    try {
      const result = await crawlAll(url, (progress) => {
        setState((prev) => ({
          ...prev,
          status: progress.phase.includes('상품')
            ? 'crawling_products'
            : progress.phase === '완료'
              ? 'completed'
              : 'crawling_reviews',
          progress,
        }));
      });

      setState((prev) => ({
        ...prev,
        status: 'completed',
        products: result.products,
        reviews: result.reviews,
        categorized: result.categorized,
        keywords: result.keywords,
        progress: { phase: '완료', current: result.products.length, total: result.products.length },
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다',
      }));
    }
  }, []);

  const getReviews = useCallback(
    (productId: string): Review[] => {
      return state.reviews.get(productId) || [];
    },
    [state.reviews]
  );

  const getCategorized = useCallback(
    (productId: string): CategorizedData | undefined => {
      return state.categorized.get(productId);
    },
    [state.categorized]
  );

  const getKeywords = useCallback(
    (productId: string): Keyword[] => {
      return state.keywords.get(productId) || [];
    },
    [state.keywords]
  );

  const products: Product[] = state.products;

  return {
    state,
    startCrawl,
    products,
    getReviews,
    getCategorized,
    getKeywords,
  };
}
