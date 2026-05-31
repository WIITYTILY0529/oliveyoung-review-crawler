# 구현 계획: 올리브영 리뷰 크롤러

## 개요

올리브영 검색 결과 URL을 입력받아 상품 리뷰를 크롤링하고, 카테고리별로 분류하여 시각화하는 웹 애플리케이션을 구현한다. Cloudflare Worker(JavaScript)가 크롤링/파싱을 담당하고, React + Vite + Tailwind 프론트엔드가 시각화를 담당한다. 프론트엔드는 GitHub Pages, Worker는 Cloudflare에 배포한다.

## Tasks

- [x] 1. 프로젝트 구조 설정 및 개발 환경 구성
  - [x] 1.1 프론트엔드 프로젝트 초기화
    - `frontend/` 디렉토리에 Vite + React + TypeScript 프로젝트 생성
    - Tailwind CSS v4 설정 (`@tailwindcss/vite` 플러그인)
    - Recharts, react-router-dom 의존성 설치
    - Vitest, @testing-library/react, fast-check 테스트 환경 설정
    - ESLint 설정
    - `vite.config.ts`에 base path 설정 (GitHub Pages용)
    - _Requirements: 7.1, 7.3_

  - [x] 1.2 Worker 프로젝트 초기화
    - `worker/` 디렉토리 생성
    - `worker/index.js` 기본 구조 작성 (export default fetch handler)
    - `worker/wrangler.toml` 설정 파일 작성 (name, main, compatibility_date)
    - _Requirements: 7.1_

  - [x] 1.3 공통 데이터 모델 정의
    - 프론트엔드 TypeScript 인터페이스 정의 (Product, Review, CategorizedData, Keyword, CrawlState)
    - Worker에서 사용할 응답 형식 정의
    - _Requirements: 4.5_

- [x] 2. Worker: URL 검증 엔드포인트
  - [x] 2.1 URL Validator 구현
    - `validateUrl(url)` 함수 작성
    - `oliveyoung.co.kr` 도메인 검증
    - `/store/search/getSearchMain.do` 경로 검증
    - CORS preflight (OPTIONS) 핸들링
    - 유효하지 않은 URL에 대해 400 응답 + 오류 메시지 반환
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 URL 검증 속성 기반 테스트 작성
    - **Property 1: URL 검증 정확성**
    - fast-check를 사용하여 랜덤 URL 문자열 생성
    - 유효한 올리브영 검색 URL은 통과, 그 외는 거부되는지 검증
    - **Validates: Requirements 1.2, 1.4**

  - [ ]* 2.3 URL Validator 단위 테스트 작성
    - 유효한 올리브영 검색 URL 케이스 테스트
    - 잘못된 도메인, 잘못된 경로, 빈 문자열 등 엣지 케이스 테스트
    - _Requirements: 1.2, 1.4, 1.5_

- [x] 3. Worker: 상품 목록 크롤링 엔드포인트
  - [x] 3.1 상품 목록 파싱 구현
    - `GET /search?url=<encoded_url>` 엔드포인트 구현
    - 올리브영 검색 페이지 fetch 후 HTML 수신
    - `parseProducts(html)` 함수: regex/문자열 파싱으로 상품명, 브랜드명, 가격, 상세 URL 추출
    - 페이지네이션 정보 추출 (totalPages)
    - 최대 100개 상품 제한 로직
    - 성공 시 `{ products: Product[], totalPages: number }` 반환
    - 실패 시 `{ error: string }` 반환
    - _Requirements: 2.1, 2.2, 8.5_

  - [ ]* 3.2 상품 파싱 속성 기반 테스트 작성
    - **Property 2: 상품 파싱 완전성**
    - 랜덤 상품 카드 HTML 구조 생성기 작성
    - 모든 필수 필드(상품명, 브랜드명, 가격, URL)가 추출되는지 검증
    - **Validates: Requirements 2.1**

  - [ ]* 3.3 크롤링 한도 속성 기반 테스트 작성
    - **Property 11: 크롤링 한도 준수**
    - 100개 초과 상품 목록에서 최대 100개만 반환되는지 검증
    - **Validates: Requirements 8.5**

- [x] 4. Worker: 리뷰 크롤링 엔드포인트
  - [x] 4.1 리뷰 파싱 구현
    - `GET /reviews?product_url=<encoded_url>&page=<number>` 엔드포인트 구현
    - 올리브영 리뷰 페이지 fetch 후 HTML 수신
    - `parseReviews(html)` 함수: 평점, 닉네임, 작성일, 본문, 피부타입, 연령대 추출
    - 다음 페이지 존재 여부 확인 (hasNext)
    - 최대 10페이지 제한 로직
    - 성공 시 `{ reviews: Review[], hasNext: boolean }` 반환
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 4.2 리뷰 파싱 속성 기반 테스트 작성
    - **Property 3: 리뷰 파싱 완전성**
    - 랜덤 리뷰 HTML 구조 생성기 작성
    - 필수 필드(평점, 닉네임, 작성일, 본문) 추출 및 선택 필드(피부타입, 연령대) 조건부 추출 검증
    - **Validates: Requirements 3.2**

- [x] 5. Worker: 데이터 카테고리 분류 로직
  - [x] 5.1 리뷰 분류 로직 구현
    - `categorizeReviews(reviews)` 함수 작성
    - 평점별(1~5점) 분류
    - 피부타입별(건성, 지성, 복합성, 민감성, 중성) 분류
    - 연령대별(10대, 20대, 30대, 40대, 50대 이상) 분류
    - 분류 결과를 리뷰 응답에 포함하여 반환
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 5.2 키워드 추출 로직 구현
    - `extractKeywords(reviews)` 함수 작성
    - 리뷰 본문에서 빈도 기반 키워드 추출
    - 한국어 불용어 필터링
    - 키워드 가중치 정규화 (0-1)
    - _Requirements: 4.4_

  - [ ]* 5.3 리뷰 분류 속성 기반 테스트 작성
    - **Property 5: 리뷰 분류 정확성**
    - 랜덤 리뷰 데이터 집합 생성기 작성
    - 각 리뷰가 올바른 카테고리 버킷에만 포함되는지 검증
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]* 5.4 키워드 추출 속성 기반 테스트 작성
    - **Property 7: 키워드 추출 빈도 정확성**
    - 랜덤 텍스트 집합 생성기 작성
    - 추출된 키워드 빈도가 실제 등장 횟수와 일치하는지 검증
    - **Validates: Requirements 4.4**

  - [ ]* 5.5 직렬화 왕복 속성 기반 테스트 작성
    - **Property 6: 리뷰 데이터 직렬화 왕복**
    - 랜덤 분류 데이터 생성기 작성
    - JSON 직렬화 후 역직렬화 시 원본과 동일한지 검증
    - **Validates: Requirements 4.5**

- [x] 6. Checkpoint - Worker 전체 기능 검증
  - Worker의 모든 엔드포인트가 정상 동작하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

- [x] 7. 프론트엔드: URL 입력 페이지
  - [x] 7.1 URLInputForm 컴포넌트 구현
    - URL 입력 필드 및 제출 버튼 (Tailwind 스타일링)
    - 클라이언트 사이드 URL 형식 사전 검증 (oliveyoung.co.kr 도메인 확인)
    - Worker API 호출 (`GET /search?url=...`)
    - 오류 메시지 표시 ("올리브영 검색 결과 페이지 URL만 입력 가능합니다" 등)
    - _Requirements: 1.1, 1.4, 1.5, 7.4_

  - [x] 7.2 Worker API 서비스 레이어 구현
    - `services/workerApi.ts` 작성
    - `VITE_WORKER_URL` 환경 변수에서 Worker URL 읽기
    - `searchProducts(url)`, `fetchReviews(productUrl, page)` 함수 구현
    - 오류 처리 (Worker 접근 불가, 네트워크 오류 등)
    - _Requirements: 7.4_

  - [ ]* 7.3 URLInputForm 단위 테스트 작성
    - 입력 필드 렌더링 확인
    - 유효하지 않은 URL 제출 시 오류 메시지 표시 확인
    - API 호출 모킹 테스트
    - _Requirements: 1.1, 1.4, 1.5_

- [x] 8. 프론트엔드: 진행 상황/로딩 UI
  - [x] 8.1 크롤링 오케스트레이터 구현
    - `services/crawlOrchestrator.ts` 작성
    - 상품 목록 수신 후, 각 상품에 대해 순차적으로 리뷰 Worker 호출
    - 호출 간 딜레이 (1초) 적용하여 올리브영 서버 부하 방지
    - 개별 상품 실패 시 건너뛰기 처리
    - 진행 상황 콜백 (현재 상품 인덱스 / 전체 상품 수)
    - _Requirements: 2.3, 2.4, 3.4, 8.1_

  - [x] 8.2 CrawlProgress 컴포넌트 구현
    - 프로그레스 바 UI (Tailwind)
    - 현재 단계 표시 (상품 수집 / 리뷰 수집 / 완료)
    - 수집된 상품 수, 리뷰 수 실시간 표시
    - 스킵된 상품 카운트 표시
    - _Requirements: 2.3, 3.4, 6.5_

  - [ ]* 8.3 크롤링 내결함성 속성 기반 테스트 작성
    - **Property 4: 크롤링 내결함성**
    - 랜덤 성공/실패 패턴 생성기 작성
    - 일부 실패 시에도 나머지 상품 정상 수집 검증
    - **Validates: Requirements 2.4, 3.5**

- [x] 9. 프론트엔드: 상품 목록 대시보드
  - [x] 9.1 ProductCardList 및 ProductCard 컴포넌트 구현
    - 상품 카드 목록 UI (상품명, 브랜드, 가격, 평균 평점, 리뷰 수 표시)
    - 카드 클릭 시 상세 페이지 네비게이션
    - 반응형 그리드 레이아웃 (Tailwind)
    - _Requirements: 6.1, 6.2_

  - [x] 9.2 SortFilterBar 컴포넌트 구현
    - 정렬 기능 구현 (평점순, 리뷰 수순, 가격순)
    - 필터 기능 구현 (피부타입별, 연령대별)
    - `utils/sorting.ts`, `utils/filtering.ts` 유틸리티 함수 작성
    - _Requirements: 6.3, 6.4_

  - [x] 9.3 RankingTable 컴포넌트 구현
    - 전체 상품 평균 평점 순위 테이블
    - _Requirements: 5.6_

  - [ ]* 9.4 정렬 및 필터 속성 기반 테스트 작성 (fast-check)
    - **Property 8: 상품 정렬 정확성** - 정렬 후 단조 감소/증가 조건 검증
    - **Property 9: 리뷰 필터링 정확성** - 필터 결과가 조건을 만족하는지 검증
    - **Validates: Requirements 6.3, 6.4**

- [x] 10. 프론트엔드: 리뷰 시각화 (차트)
  - [x] 10.1 RatingBarChart 컴포넌트 구현
    - Recharts BarChart로 평점 분포 막대 차트 구현
    - _Requirements: 5.1_

  - [x] 10.2 SkinTypePieChart 및 AgeGroupPieChart 컴포넌트 구현
    - Recharts PieChart로 피부타입별 리뷰 비율 원형 차트 구현
    - Recharts PieChart로 연령대별 리뷰 비율 원형 차트 구현
    - _Requirements: 5.2, 5.3_

  - [x] 10.3 KeywordCloud 컴포넌트 구현
    - 키워드 빈도 기반 시각화 (크기/색상으로 가중치 표현)
    - _Requirements: 5.4_

  - [x] 10.4 SummaryCard 컴포넌트 구현
    - 각 상품의 평균 평점, 총 리뷰 수 요약 카드
    - `utils/stats.ts`에 `calculateAverageRating()` 함수 작성
    - _Requirements: 5.5_

  - [ ]* 10.5 평균 평점 계산 속성 기반 테스트 작성 (fast-check)
    - **Property 12: 평균 평점 계산 정확성**
    - 랜덤 평점 배열 생성기 작성
    - 계산된 평균이 수학적 평균과 일치하는지 검증
    - **Validates: Requirements 5.5**

- [x] 11. 프론트엔드: 라우팅 및 통합
  - [x] 11.1 React Router 설정 및 페이지 통합
    - 메인 페이지: URL 입력 + 진행 상황
    - 대시보드 페이지: 상품 목록 + 정렬/필터 + 순위 테이블
    - 상품 상세 페이지: 차트 + 키워드 + 요약
    - Header 컴포넌트 (네비게이션)
    - _Requirements: 6.1, 6.2_

  - [x] 11.2 상태 관리 통합
    - `hooks/useCrawl.ts` 커스텀 훅 작성
    - 크롤링 상태 (CrawlState) 관리
    - 페이지 간 데이터 공유 (Context 또는 상태 끌어올리기)
    - _Requirements: 6.5_

- [x] 12. Checkpoint - 프론트엔드 전체 기능 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

- [x] 13. 배포 설정 (GitHub Pages + Cloudflare Worker)
  - [x] 13.1 GitHub Actions 워크플로우 작성
    - `.github/workflows/deploy.yml` 작성
    - Node.js 설정, `frontend/` 디렉토리에서 `npm ci` + `npm run build`
    - `VITE_WORKER_URL`을 GitHub Secrets에서 빌드 시 주입
    - `actions/upload-pages-artifact` + `actions/deploy-pages`로 배포
    - _Requirements: 7.1_

  - [x] 13.2 Cloudflare Worker 배포 설정
    - `worker/wrangler.toml` 최종 설정 확인
    - `wrangler deploy`로 Worker 배포
    - 배포된 Worker URL을 GitHub Secrets에 `VITE_WORKER_URL`로 등록
    - _Requirements: 7.1_

  - [ ]* 13.3 통합 테스트
    - 모킹된 올리브영 HTML을 사용한 Worker 엔드포인트 테스트
    - 프론트엔드 → Worker API 통신 통합 테스트
    - _Requirements: 7.2, 7.3_

- [x] 14. Final Checkpoint - 전체 시스템 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

## Notes

- `*` 표시된 태스크는 선택 사항이며, 빠른 MVP를 위해 건너뛸 수 있다
- Worker는 stateless이므로 세션 관리가 불필요하다. 프론트엔드가 오케스트레이션을 담당한다
- Cloudflare Worker 무료 티어 제약(CPU 10ms, 서브리퀘스트 50개)을 고려하여, 리뷰 크롤링은 상품별로 개별 Worker 호출로 분할한다
- Worker 로직은 순수 함수로 분리하여 Vitest로 테스트 가능하게 한다
- 프론트엔드에서 호출 간 1초 딜레이를 두어 올리브영 서버 부하를 방지한다
- 참조 프로젝트 패턴: `pitcher_report_ref/worker/index.js`, `pitcher_report_ref/.github/workflows/deploy.yml`
