import type { Keyword } from '../../types';

interface KeywordCloudProps {
  keywords: Keyword[];
}

/**
 * 키워드 클라우드 컴포넌트
 * - 가중치에 따라 폰트 크기와 색상이 달라진다.
 * - 외부 라이브러리 없이 span 요소로 구현한다.
 */
export function KeywordCloud({ keywords }: KeywordCloudProps) {
  if (keywords.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">주요 키워드</h3>
        <p className="text-center text-gray-500 py-8">키워드 데이터가 없습니다.</p>
      </div>
    );
  }

  const getColor = (weight: number): string => {
    if (weight > 0.8) return 'text-green-700';
    if (weight > 0.6) return 'text-blue-600';
    if (weight > 0.4) return 'text-purple-600';
    if (weight > 0.2) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getFontSize = (weight: number): string => {
    if (weight > 0.8) return 'text-2xl';
    if (weight > 0.6) return 'text-xl';
    if (weight > 0.4) return 'text-lg';
    if (weight > 0.2) return 'text-base';
    return 'text-sm';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4">주요 키워드</h3>
      <div className="flex flex-wrap gap-3 items-center justify-center py-4">
        {keywords.map((keyword) => (
          <span
            key={keyword.word}
            className={`${getFontSize(keyword.weight)} ${getColor(keyword.weight)} font-medium px-2 py-1 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors`}
            title={`${keyword.word}: ${keyword.count}회`}
          >
            {keyword.word}
          </span>
        ))}
      </div>
    </div>
  );
}
