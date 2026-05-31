import type { CrawlData } from '../types';

const BASE_URL = import.meta.env.BASE_URL;

/**
 * 정적 JSON 파일에서 크롤링 결과를 로드한다.
 */
export async function loadCrawlData(): Promise<CrawlData | null> {
  try {
    const response = await fetch(`${BASE_URL}data/results.json`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
