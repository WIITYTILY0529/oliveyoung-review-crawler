import { useNavigate } from 'react-router-dom';
import { URLInputForm } from '../components/URLInputForm';
import { CrawlProgress } from '../components/CrawlProgress';
import { useCrawlContext } from '../context/CrawlContext';

/**
 * 홈 페이지
 * - URL 입력 폼
 * - 크롤링 진행 상황 표시
 * - 완료 시 대시보드로 이동
 */
export function HomePage() {
  const { state, startCrawl } = useCrawlContext();
  const navigate = useNavigate();

  const isLoading =
    state.status === 'validating' ||
    state.status === 'crawling_products' ||
    state.status === 'crawling_reviews';

  const handleSubmit = async (url: string) => {
    await startCrawl(url);
  };

  // 완료 시 대시보드로 이동
  if (state.status === 'completed' && state.products.length > 0) {
    navigate('/dashboard');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          올리브영 리뷰 분석기
        </h1>
        <p className="text-gray-600">
          올리브영 검색 결과 URL을 입력하면 상품 리뷰를 분석해 드립니다.
        </p>
      </div>

      <div className="space-y-8">
        <URLInputForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={state.status === 'error' ? (state.error ?? null) : null}
        />

        {isLoading && <CrawlProgress progress={state.progress} />}
      </div>
    </div>
  );
}
