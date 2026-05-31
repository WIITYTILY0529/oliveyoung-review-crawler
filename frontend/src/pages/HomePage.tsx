import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadCrawlData } from '../services/dataService';
import type { CrawlData } from '../types';

const GITHUB_REPO = 'WIITYTILY0529/oliveyoung-review-crawler';
const ACTIONS_URL = `https://github.com/${GITHUB_REPO}/actions/workflows/scrape.yml`;

/**
 * 홈 페이지
 * - 최신 크롤링 결과가 있으면 요약 표시 + 대시보드 이동
 * - 없으면 GitHub Actions 사용 안내
 */
export function HomePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CrawlData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCrawlData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

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
          올리브영 검색 결과의 상품 리뷰 통계를 한눈에 비교하세요.
        </p>
      </div>

      {data && data.products.length > 0 ? (
        <div className="space-y-6">
          {/* 크롤링 결과 요약 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">최신 크롤링 결과</h2>
              <span className="text-sm text-gray-500">
                마지막 크롤링: {new Date(data.crawledAt).toLocaleString('ko-KR')}
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

          {/* GitHub Actions 안내 */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-md font-medium text-gray-800 mb-2">새로운 검색 크롤링</h3>
            <p className="text-sm text-gray-600 mb-3">
              새로운 검색 결과를 크롤링하려면 GitHub Actions에서 워크플로우를 실행하세요.
            </p>
            <a
              href={ACTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-gray-800 text-white text-sm rounded-lg 
                         hover:bg-gray-900 transition-colors"
            >
              GitHub Actions 열기 ↗
            </a>
          </div>
        </div>
      ) : (
        /* 데이터 없음 */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            아직 크롤링 데이터가 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            GitHub Actions에서 올리브영 검색 URL을 입력하여 크롤링을 시작하세요.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
            <h3 className="text-sm font-medium text-gray-800 mb-2">사용 방법:</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>올리브영에서 원하는 검색 결과 페이지 URL을 복사</li>
              <li>GitHub Actions → "Scrape Oliveyoung Reviews" 워크플로우 선택</li>
              <li>"Run workflow" 클릭 후 URL 입력</li>
              <li>크롤링 완료 후 이 페이지에서 결과 확인</li>
            </ol>
          </div>

          <a
            href={ACTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg 
                       hover:bg-green-700 transition-colors"
          >
            GitHub Actions에서 크롤링 시작 ↗
          </a>
        </div>
      )}
    </div>
  );
}
