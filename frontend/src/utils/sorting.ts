import type { Product, SortBy, SortOrder } from '../types';

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
        diff = a.reviewCount - b.reviewCount;
        break;
      case 'price':
        diff = a.price - b.price;
        break;
    }
    return order === 'desc' ? -diff : diff;
  });

  return sorted;
}
