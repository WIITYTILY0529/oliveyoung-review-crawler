# 올리브영 리뷰 크롤러 Worker

Cloudflare Worker로 올리브영 웹사이트를 프록시하여 CORS 문제를 해결합니다.

## 배포

1. Cloudflare 계정 로그인:
   ```bash
   npx wrangler login
   ```

2. Worker 배포:
   ```bash
   cd worker
   npx wrangler deploy
   ```

3. 배포된 Worker URL을 GitHub Secrets에 등록:
   - Repository Settings → Secrets → Actions
   - Name: `VITE_WORKER_URL`
   - Value: `https://oliveyoung-proxy.<your-subdomain>.workers.dev`

## 엔드포인트

- `GET /health` — 상태 확인
- `GET /search?url=<encoded_url>` — 검색 결과 크롤링
- `GET /reviews?product_url=<encoded_url>&page=<n>` — 리뷰 크롤링

## 로컬 개발

```bash
cd worker
npx wrangler dev
```
Worker가 `http://localhost:8787`에서 실행됩니다.
