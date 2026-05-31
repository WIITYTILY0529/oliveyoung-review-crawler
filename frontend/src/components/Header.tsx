import { Link } from 'react-router-dom';

/**
 * 앱 헤더 컴포넌트
 * - 앱 타이틀
 * - 네비게이션 링크
 */
export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-green-700 hover:text-green-800">
          올리브영 리뷰 분석기
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            to="/"
            className="text-sm text-gray-600 hover:text-green-700 transition-colors"
          >
            홈
          </Link>
          <Link
            to="/dashboard"
            className="text-sm text-gray-600 hover:text-green-700 transition-colors"
          >
            대시보드
          </Link>
        </nav>
      </div>
    </header>
  );
}
