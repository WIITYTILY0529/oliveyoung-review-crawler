interface CrawlProgressProps {
  progress: {
    phase: string;
    current: number;
    total: number;
  };
  skipped?: number;
}

/**
 * 크롤링 진행 상황 표시 컴포넌트
 * - 프로그레스 바
 * - 현재 단계 표시
 * - 진행 텍스트
 * - 스킵된 상품 수 표시
 */
export function CrawlProgress({ progress, skipped }: CrawlProgressProps) {
  const { phase, current, total } = progress;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 현재 단계 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">{phase}</span>
        {total > 0 && (
          <span className="text-sm text-gray-500">{percentage}%</span>
        )}
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* 진행 텍스트 */}
      {total > 0 && (
        <p className="mt-3 text-sm text-gray-600">
          {current} / {total} 상품 처리 중
        </p>
      )}

      {/* 스킵된 상품 수 */}
      {skipped != null && skipped > 0 && (
        <p className="mt-1 text-sm text-amber-600">
          ⚠ {skipped}개 상품 건너뜀
        </p>
      )}
    </div>
  );
}
