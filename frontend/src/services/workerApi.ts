import type { SearchResponse, ReviewsResponse } from '../types';

const WORKER_URL =
  import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

/**
 * Worker API를 호출하여 올리브영 검색 결과 상품 목록을 가져온다.
 */
export async function searchProducts(url: string): Promise<SearchResponse> {
  const endpoint = `${WORKER_URL}/search?url=${encodeURIComponent(url)}`;

  let response: Response;
  try {
    response = await fetch(endpoint);
  } catch (err) {
    throw new Error(
      '서비스에 일시적으로 접근할 수 없습니다. 잠시 후 다시 시도해 주세요'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body === 'object' && 'error' in body
        ? (body as { error: string }).error
        : `서버 오류가 발생했습니다 (${response.status})`;
    throw new Error(message);
  }

  return response.json() as Promise<SearchResponse>;
}

/**
 * Worker API를 호출하여 특정 상품의 리뷰를 가져온다.
 */
export async function fetchReviews(
  productUrl: string,
  page: number
): Promise<ReviewsResponse> {
  const endpoint = `${WORKER_URL}/reviews?product_url=${encodeURIComponent(productUrl)}&page=${page}`;

  let response: Response;
  try {
    response = await fetch(endpoint);
  } catch (err) {
    throw new Error(
      '서비스에 일시적으로 접근할 수 없습니다. 잠시 후 다시 시도해 주세요'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body === 'object' && 'error' in body
        ? (body as { error: string }).error
        : `서버 오류가 발생했습니다 (${response.status})`;
    throw new Error(message);
  }

  return response.json() as Promise<ReviewsResponse>;
}
