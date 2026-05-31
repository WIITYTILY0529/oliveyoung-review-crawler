import type { Review } from '../types';

/**
 * 리뷰 목록의 평균 평점을 계산한다.
 * 리뷰가 없으면 0을 반환한다.
 */
export function calculateAverageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return sum / reviews.length;
}

/**
 * 리뷰 목록의 평점 분포를 계산한다.
 * 1~5점 각각의 리뷰 수를 반환한다.
 */
export function calculateRatingDistribution(
  reviews: Review[]
): Record<number, number> {
  const distribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (const review of reviews) {
    const rating = Math.round(review.rating);
    if (rating >= 1 && rating <= 5) {
      distribution[rating]++;
    }
  }

  return distribution;
}
