import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadCrawlData } from '../services/dataService';
import { triggerScrapeWorkflow, pollWorkflowUntilDone } from '../services/githubApi';
import type { CrawlData } from '../types';

/**
 * 홈 페이지
 * - URL 입력 폼 → GitHub Actions 트리거
 * - 최신 크롤링 결과가 있으면 요약 표시 + 대시보드 이동
 */
export function HomePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CrawlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadCrawlData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!url.trim()) {
      setMessage({ type: 'error', text: 'URL을 입력해 주세요.' });
      return;
    }

    if (!url.includes('oliveyoung.co.kr')) {
      setMessage({ type: 'error', text: '올리브영 검색 결과 URL만 입력 가능합니다.' });
      return;
    }

    setSubmitting(true);
    const result = await triggerScrapeWorkflow(url);
    setSubmitting(false);

    if (result.success) {
      setMessage({ type: 'info', text: '크롤링 진행 중... 완료되면 자동으로 새로고침됩니다.' });
      setUrl('');
      setPolling(true);

      // 워크플로우 완료까지 폴링
      const finalStatus = await pollWorkflowUntilDone((status) => {
        if (status === 'in_progress') {
          setMessage({ type: 'info', text: '크롤링 진행 중... 완료되면 자동으로 새로고침됩니다.' });
        }
      });

      setPolling(false);

      if (finalStatus === 'completed') {
        setMessage({ type: 'success', text: '크롤링 완료! 페이지를 새로고침합니다...' });
        setTimeout(() => window.location.reload(), 2000);
      } else if (finalStatus === 'failure') {
        setMessage({ type: 'error', text: '크롤링이 실패했습니다. GitHub Actions 로그를 확인하세요.' });
      } else {
        setMessage({ type: 'error', text: '시간 초과. GitHub Actions 탭에서 상태를 확인하세요.' });
      }
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">데이터 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          올리브영 리뷰 분석기
        </h1>
        <p className="text-gray-600">
          올리브영 검색 결과 URL을 입력하면 상품별 리뷰 통계를 한눈에 비교할 수 있어요.
        </p>
      </div>

      {/* URL 입력 폼 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSubmit}>
          <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-2">
            올리브영 검색 결과 URL
          </label>
          <div className="flex gap-2">
            <input
              id="url-input"
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setMessage(null); }}
              placeholder="https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=쿠션"
              disabled={submitting}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                         disabled:bg-gray-100 disabled:cursor-not-allowed
                         placeholder:text-gray-400 text-sm"
            />
            <button
              type="submit"
              disabled={submitting || polling}
              className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg
                         hover:bg-green-700 transition-colors
                         disabled:bg-gray-400 disabled:cursor-not-allowed
                         whitespace-nowrap cursor-pointer"
            >
              {polling ? '크롤링 중...' : submitting ? '요청 중...' : '크롤링 시작'}
            </button>
          </div>

          {message && (
            <p className={`mt-3 text-sm ${message.type === 'success' ? 'text-green-600' : message.type === 'info' ? 'text-blue-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </form>
      </div>

      {/* 최신 결과 */}
      {data && data.products.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">최신 크롤링 결과</h2>
            <span className="text-sm text-gray-500">
              {new Date(data.crawledAt).toLocaleString('ko-KR')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{data.products.length}</p>
              <p className="text-sm text-green-600">상품 수</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">
                {data.searchQuery || '—'}
              </p>
              <p className="text-sm text-blue-600">검색어</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">
                {data.products.filter((p) => p.reviewStats).length}
              </p>
              <p className="text-sm text-purple-600">리뷰 통계 수집</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-green-600 text-white font-medium rounded-lg 
                       hover:bg-green-700 transition-colors cursor-pointer"
          >
            분석 결과 보기 →
          </button>
        </div>
      )}
    </div>
  );
}
