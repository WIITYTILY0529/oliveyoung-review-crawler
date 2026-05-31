import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadCrawlData } from '../services/dataService';
import type { Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * 상품 상세 페이지
 * - 상품 정보
 * - 평점 분포 바 차트
 * - 속성 만족도 수평 바 차트
 */
export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCrawlData().then((data) => {
      if (data) {
        const found = data.products.find((p) => p.id === id);
        setProduct(found || null);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 text-lg">상품을 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  const stats = product.reviewStats;
  const formattedPrice = product.price.toLocaleString('ko-KR');
  const formattedOriginalPrice = product.originalPrice.toLocaleString('ko-KR');
  const hasDiscount = product.originalPrice > product.price;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* 뒤로가기 + 상품 정보 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md 
                     hover:bg-gray-50 transition-colors cursor-pointer"
        >
          ← 대시보드
        </button>
      </div>

      {/* 상품 기본 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {product.imageUrl && (
            <div className="w-full md:w-48 h-48 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-1">{product.brand}</p>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{product.name}</h2>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-bold text-gray-900">{formattedPrice}원</span>
              {hasDiscount && (
                <span className="text-sm text-gray-400 line-through">{formattedOriginalPrice}원</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-yellow-500 text-lg">★ {product.averageRating.toFixed(1)}</span>
              <span className="text-gray-600">리뷰 {product.reviewCount.toLocaleString('ko-KR')}개</span>
            </div>
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm text-green-600 hover:text-green-700"
            >
              올리브영에서 보기 ↗
            </a>
          </div>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 평점 분포 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">평점 분포</h3>
            {stats.ratingDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={stats.ratingDistribution}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis
                    type="category"
                    dataKey="rating"
                    tickFormatter={(v) => `${v}점`}
                    width={40}
                  />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="percentage" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-sm">평점 분포 데이터가 없습니다.</p>
            )}
          </div>

          {/* 속성 만족도 */}
          {stats.attributes.map((attr) => (
            <div key={attr.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{attr.name}</h3>
              <div className="space-y-3">
                {attr.answers.map((answer) => (
                  <div key={answer.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{answer.name}</span>
                      <span className="text-gray-500 font-medium">{answer.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all"
                        style={{ width: `${answer.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-gray-500">이 상품의 리뷰 통계를 가져오지 못했습니다.</p>
        </div>
      )}
    </div>
  );
}
