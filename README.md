# 올리브영 리뷰 크롤러

올리브영 검색 결과의 상품 리뷰 통계를 크롤링하고 시각화하는 프로젝트입니다.

## 아키텍처

```
GitHub Actions (Playwright/Python)  →  results.json  →  Frontend (React/Vite)
         크롤링                           정적 데이터          시각화
```

- **크롤러**: Python + Playwright로 올리브영 검색 결과를 크롤링
- **데이터**: `frontend/public/data/results.json`에 정적 JSON으로 저장
- **프론트엔드**: React + Tailwind + Recharts로 결과 시각화
- **배포**: GitHub Pages

## 사용 방법

### 1. 크롤링 실행

1. 올리브영에서 원하는 검색 결과 페이지 URL을 복사
2. GitHub → Actions → "Scrape Oliveyoung Reviews" 워크플로우 선택
3. "Run workflow" 클릭 후 검색 URL 입력
4. 크롤링 완료 후 자동으로 GitHub Pages에 배포

### 2. 결과 확인

배포된 사이트에서 크롤링 결과를 확인할 수 있습니다:
- 상품 목록 (평점순/리뷰수순/가격순 정렬)
- 상품별 리뷰 통계 (평점 분포, 속성 만족도)

## 프로젝트 구조

```
├── scripts/
│   ├── scrape_oliveyoung.py    # 크롤러 스크립트
│   └── requirements.txt        # Python 의존성
├── frontend/
│   ├── public/data/            # 크롤링 결과 JSON
│   ├── src/
│   │   ├── pages/              # 페이지 컴포넌트
│   │   ├── components/         # UI 컴포넌트
│   │   ├── services/           # 데이터 로딩
│   │   ├── types/              # TypeScript 타입
│   │   └── utils/              # 유틸리티
│   └── ...
└── .github/workflows/
    ├── scrape.yml              # 크롤링 워크플로우
    └── deploy.yml              # 배포 워크플로우
```

## 로컬 개발

```bash
cd frontend
npm install
npm run dev
```

## 기술 스택

- **크롤러**: Python 3.11, Playwright
- **프론트엔드**: React 19, TypeScript, Vite, Tailwind CSS 4, Recharts
- **CI/CD**: GitHub Actions, GitHub Pages
