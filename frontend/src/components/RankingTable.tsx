import type { Product } from '../types';

interface RankingTableProps {
  products: Product[];
}

/**
 * 상품 평균 평점 순위 테이블 컴포넌트
 */
export function RankingTable({ products }: RankingTableProps) {
  const ranked = [...products].sort(
    (a, b) => b.averageRating - a.averageRating
  );

  if (ranked.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        순위 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">순위</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">상품명</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">브랜드</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">평균 평점</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">리뷰 수</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ranked.map((product, index) => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-900 font-medium">
                {index + 1}
              </td>
              <td className="px-4 py-3 text-gray-900">{product.name}</td>
              <td className="px-4 py-3 text-gray-600">{product.brand}</td>
              <td className="px-4 py-3 text-right text-gray-900 font-medium">
                ⭐ {product.averageRating.toFixed(1)}
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                {product.totalReviews.toLocaleString('ko-KR')}개
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
