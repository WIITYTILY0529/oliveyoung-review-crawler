import { useState } from 'react';

interface URLInputFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * 올리브영 검색 URL 입력 폼 컴포넌트
 * - URL 입력 필드 + 제출 버튼
 * - 클라이언트 사이드 URL 검증
 * - 로딩/에러 상태 표시
 */
export function URLInputForm({ onSubmit, isLoading, error }: URLInputFormProps) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateUrl = (input: string): boolean => {
    if (!input.trim()) {
      setValidationError('URL을 입력해 주세요');
      return false;
    }

    try {
      const parsed = new URL(input);
      const hostname = parsed.hostname;

      if (!hostname.endsWith('oliveyoung.co.kr')) {
        setValidationError('올리브영 검색 결과 페이지 URL만 입력 가능합니다');
        return false;
      }

      if (!parsed.pathname.includes('/store/search/getSearchMain.do')) {
        setValidationError('올리브영 검색 결과 페이지 URL만 입력 가능합니다');
        return false;
      }

      setValidationError(null);
      return true;
    } catch {
      setValidationError('올바른 URL 형식이 아닙니다');
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateUrl(url)) {
      onSubmit(url);
    }
  };

  const displayError = validationError || error;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col gap-4">
        <label
          htmlFor="url-input"
          className="text-lg font-medium text-gray-700"
        >
          올리브영 검색 결과 URL
        </label>

        <div className="flex gap-2">
          <input
            id="url-input"
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="올리브영 검색 결과 URL을 입력하세요"
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                       disabled:bg-gray-100 disabled:cursor-not-allowed
                       placeholder:text-gray-400"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg
                       hover:bg-green-700 transition-colors
                       disabled:bg-gray-400 disabled:cursor-not-allowed
                       whitespace-nowrap"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                처리 중...
              </span>
            ) : (
              '리뷰 분석 시작'
            )}
          </button>
        </div>

        {displayError && (
          <p className="text-red-600 text-sm mt-1" role="alert">
            {displayError}
          </p>
        )}
      </div>
    </form>
  );
}
