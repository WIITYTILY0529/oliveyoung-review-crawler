# 올리브영 리뷰 크롤러

올리브영 검색 결과 URL을 입력하면 상품별 리뷰를 크롤링하여 카테고리별로 분류하고 시각화하는 웹 애플리케이션입니다.

## 구조

```
frontend/     — React + Vite + Tailwind (GitHub Pages 배포)
worker/       — Cloudflare Worker (크롤링 프록시)
```

## 시작하기

### 1. Worker 로컬 실행
```bash
cd worker
npx wrangler dev
```

### 2. 프론트엔드 로컬 실행
```bash
cd frontend
npm install
npm run dev
```

### 3. 배포
- Worker: `cd worker && npx wrangler deploy`
- Frontend: main 브랜치에 push하면 GitHub Actions가 자동 배포

## 기능

1. 올리브영 검색 URL 입력
2. 상품 목록 자동 크롤링
3. 각 상품의 리뷰 수집
4. 평점별/피부타입별/연령대별 분류
5. 차트 시각화 (막대, 원형, 키워드 클라우드)
6. 상품 순위 테이블
