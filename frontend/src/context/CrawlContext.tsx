import { createContext, useContext } from 'react';
import type { Product, Review, CategorizedData, Keyword, CrawlState } from '../types';
import { useCrawl } from '../hooks/useCrawl';

interface CrawlContextValue {
  state: CrawlState;
  startCrawl: (url: string) => Promise<void>;
  products: Product[];
  getReviews: (productId: string) => Review[];
  getCategorized: (productId: string) => CategorizedData | undefined;
  getKeywords: (productId: string) => Keyword[];
}

const CrawlContext = createContext<CrawlContextValue | null>(null);

/**
 * 크롤링 상태를 앱 전체에서 공유하기 위한 Provider
 */
export function CrawlProvider({ children }: { children: React.ReactNode }) {
  const crawl = useCrawl();

  return (
    <CrawlContext.Provider value={crawl}>
      {children}
    </CrawlContext.Provider>
  );
}

/**
 * 크롤링 컨텍스트를 사용하는 훅
 */
export function useCrawlContext(): CrawlContextValue {
  const context = useContext(CrawlContext);
  if (!context) {
    throw new Error('useCrawlContext must be used within a CrawlProvider');
  }
  return context;
}
