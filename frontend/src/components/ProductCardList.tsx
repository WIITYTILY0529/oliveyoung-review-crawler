import type { Product } from '../types';
import { ProductCard } from './ProductCard';

interface ProductCardListProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

/**
 * 상품 카드 그리드 목록 컴포넌트
 */
export function ProductCardList({ products, onProductClick }: ProductCardListProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        표시할 상품이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={onProductClick}
        />
      ))}
    </div>
  );
}
