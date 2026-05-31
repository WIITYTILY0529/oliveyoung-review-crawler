import type { Product, Review, SkinType, AgeGroup } from '../types';

export type SortBy = 'rating' | 'reviews' | 'price';
export type SortOrder = 'asc' | 'desc';

/**
 * 상품 목록을 지정된 기준으로 정렬한다.
 */
export function sortProducts(
  products: Product[],
  sortBy: SortBy,
  order: SortOrder = 'desc'
): Product[] {
  const sorted = [...products];

  sorted.sort((a, b) => {
    let diff = 0;
    switch (sortBy) {
      case 'rating':
        diff = a.averageRating - b.averageRating;
        break;
      case 'reviews':
        diff = a.totalReviews - b.totalReviews;
        break;
      case 'price':
        diff = a.price - b.price;
        break;
    }
    return order === 'desc' ? -diff : diff;
  });

  return sorted;
}

/**
 * 리뷰를 피부타입으로 필터링한다.
 */
export function filterReviewsBySkinType(
  reviews: Review[],
  skinType: SkinType
): Review[] {
  return reviews.filter((review) => review.skinType === skinType);
}

/**
 * 리뷰를 연령대로 필터링한다.
 */
export function filterReviewsByAgeGroup(
  reviews: Review[],
  ageGroup: AgeGroup
): Review[] {
  return reviews.filter((review) => review.ageGroup === ageGroup);
}
