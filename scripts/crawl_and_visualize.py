"""
올리브영 리뷰 크롤러 + 시각화
- URL 입력 → Playwright로 검색 페이지 크롤링
- 각 상품의 리뷰 통계 API 호출
- 결과를 HTML 파일로 시각화하여 브라우저에서 열기

사용법:
  python scripts/crawl_and_visualize.py

의존성 설치:
  pip install playwright
  python -m playwright install chromium
"""

import json
import os
import re
import sys
import webbrowser
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

from playwright.sync_api import sync_playwright, Page


def extract_search_query(url: str) -> str:
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    for key in ("query", "searchKeyword", "searchWord", "realQuery"):
        if key in params:
            return params[key][0]
    return ""


def extract_goods_no(href: str) -> str:
    match = re.search(r"goodsNo=([A-Z0-9]+)", href)
    return match.group(1) if match else ""


def parse_price(text: str) -> int:
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else 0


def extract_products(page: Page) -> list[dict]:
    products = []
    items = page.query_selector_all("li.flag.li_result")
    if not items:
        items = page.query_selector_all("li[class*='li_result']")

    for item in items:
        try:
            thumb_link = item.query_selector("a.prd_thumb")
            if not thumb_link:
                continue
            href = thumb_link.get_attribute("href") or ""
            goods_no = extract_goods_no(href)
            if not goods_no:
                continue

            img_el = thumb_link.query_selector("img")
            image_url = img_el.get_attribute("src") or "" if img_el else ""

            brand_el = item.query_selector("span.tx_brand")
            brand = brand_el.inner_text().strip() if brand_el else ""

            name_el = item.query_selector("p.tx_name")
            name = name_el.inner_text().strip() if name_el else ""

            price = 0
            price_el = item.query_selector("span.tx_cur span.tx_num")
            if price_el:
                price = parse_price(price_el.inner_text())

            original_price = price
            org_el = item.query_selector("span.tx_org span.tx_num")
            if org_el:
                original_price = parse_price(org_el.inner_text())

            review_count = 0
            review_el = item.query_selector("p.prd_point_area")
            if review_el:
                count_match = re.search(r"\(([\d,]+)\)", review_el.inner_text())
                if count_match:
                    review_count = int(count_match.group(1).replace(",", ""))

            products.append({
                "id": goods_no,
                "name": name,
                "brand": brand,
                "price": price,
                "originalPrice": original_price,
                "imageUrl": image_url,
                "reviewCount": review_count,
                "reviewStats": None,
            })
        except Exception as e:
            print(f"  [WARN] 상품 파싱 실패: {e}")
    return products


def fetch_review_stats(page: Page, goods_no: str) -> dict | None:
    """브라우저 페이지 내에서 fetch로 API 호출 (fallback용)"""
    api_url = f"https://m.oliveyoung.co.kr/review/api/v2/reviews/{goods_no}/stats"
    try:
        result = page.evaluate("""async (url) => {
            try {
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) return { error: `HTTP ${res.status}`, url: res.url };
                const json = await res.json();
                return json;
            } catch (e) { return { error: e.message }; }
        }""", api_url)

        if not result or "error" in result:
            return None
        if result.get("status") != "SUCCESS":
            return None
        return parse_stats_response(result.get("data", {}))
    except Exception as e:
        print(f"    → 예외: {e}")
        return None


def fetch_review_stats_via_request(context, goods_no: str) -> dict | None:
    """Playwright의 API request를 사용하여 리뷰 통계를 가져온다."""
    api_url = f"https://m.oliveyoung.co.kr/review/api/v2/reviews/{goods_no}/stats"
    try:
        response = context.request.get(api_url, headers={
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": f"https://m.oliveyoung.co.kr/m/goods/getGoodsDetail.do?goodsNo={goods_no}",
        })

        if response.status != 200:
            print(f"    → HTTP {response.status}")
            return None

        result = response.json()
        if result.get("status") != "SUCCESS":
            print(f"    → 상태: {result.get('status', 'unknown')}")
            return None

        return parse_stats_response(result.get("data", {}))
    except Exception as e:
        print(f"    → 예외: {e}")
        return None


def extract_review_stats_from_page(page: Page) -> dict | None:
    """상품 상세 페이지에서 리뷰 통계를 DOM 요소로부터 직접 추출한다."""
    try:
        stats = {
            "averageRating": 0,
            "reviewCount": 0,
            "ratingDistribution": [],
            "attributes": [],
        }

        # 리뷰 섹션이 로드될 때까지 대기
        page.wait_for_timeout(2000)

        # 평점 추출: rating-score 클래스 또는 텍스트에서 숫자 추출
        rating_text = page.evaluate("""() => {
            // 방법 1: rating-score 클래스
            const scoreEl = document.querySelector('.rating-score');
            if (scoreEl) return scoreEl.textContent.trim();
            // 방법 2: Shadow DOM 내부 탐색
            const reviewEl = document.querySelector('oy-review-star-rating');
            if (reviewEl && reviewEl.shadowRoot) {
                const s = reviewEl.shadowRoot.querySelector('.rating-score');
                if (s) return s.textContent.trim();
            }
            // 방법 3: 페이지 전체에서 평점 패턴 찾기
            const allText = document.body.innerText;
            const match = allText.match(/(\\d\\.\\d)\\s*\\/\\s*5|평점\\s*(\\d\\.\\d)/);
            if (match) return match[1] || match[2];
            return '';
        }""")

        if rating_text:
            try:
                stats["averageRating"] = float(re.search(r"(\d+\.?\d*)", rating_text).group(1))
            except:
                pass

        # 리뷰 수 추출: total-count 클래스
        count_text = page.evaluate("""() => {
            // 방법 1: total-count 클래스
            const countEl = document.querySelector('.total-count');
            if (countEl) return countEl.textContent.trim();
            // 방법 2: Shadow DOM
            const reviewEl = document.querySelector('oy-review-star-rating');
            if (reviewEl && reviewEl.shadowRoot) {
                const c = reviewEl.shadowRoot.querySelector('.total-count');
                if (c) return c.textContent.trim();
            }
            return '';
        }""")

        if count_text:
            count_match = re.search(r"([\d,]+)\s*건", count_text)
            if count_match:
                stats["reviewCount"] = int(count_match.group(1).replace(",", ""))

        # 평점 분포 추출: bar-item 요소들
        rating_dist = page.evaluate("""() => {
            const results = [];
            // Shadow DOM 내부의 rating-distribution
            const distEl = document.querySelector('oy-review-rating-distribution');
            if (distEl && distEl.shadowRoot) {
                const items = distEl.shadowRoot.querySelectorAll('.bar-item');
                items.forEach(item => {
                    const ratingEl = item.querySelector('.rating');
                    const perEl = item.querySelector('.per');
                    if (ratingEl && perEl) {
                        const rating = parseInt(ratingEl.textContent);
                        const pct = parseInt(perEl.textContent);
                        if (!isNaN(rating) && !isNaN(pct)) {
                            results.push({ rating, percentage: pct });
                        }
                    }
                });
            }
            // data-rating 속성으로도 시도
            if (results.length === 0) {
                document.querySelectorAll('[data-rating]').forEach(el => {
                    const rating = parseInt(el.getAttribute('data-rating'));
                    const perEl = el.closest('.bar-item')?.querySelector('.per');
                    if (perEl) {
                        const pct = parseInt(perEl.textContent);
                        if (!isNaN(rating) && !isNaN(pct)) {
                            results.push({ rating, percentage: pct });
                        }
                    }
                });
            }
            return results;
        }""")

        if rating_dist:
            stats["ratingDistribution"] = rating_dist

        # 속성 만족도 추출: attribute-detail 요소들
        attributes = page.evaluate("""() => {
            const results = [];
            // Shadow DOM 내부의 attribute-detail
            const attrEls = document.querySelectorAll('oy-review-attribute-detail');
            attrEls.forEach(attrEl => {
                if (attrEl.shadowRoot) {
                    const titleEl = attrEl.shadowRoot.querySelector('.title');
                    const name = titleEl ? titleEl.textContent.trim() : '';
                    const answers = [];
                    attrEl.shadowRoot.querySelectorAll('.feature-item').forEach(item => {
                        const labelEl = item.querySelector('.label');
                        const pctEl = item.querySelector('.percentage');
                        if (labelEl && pctEl) {
                            answers.push({
                                name: labelEl.textContent.trim(),
                                percentage: parseInt(pctEl.textContent) || 0,
                            });
                        }
                    });
                    if (name && answers.length > 0) {
                        results.push({ name, answers });
                    }
                }
            });
            // attribute-summary fallback
            if (results.length === 0) {
                const summaryEl = document.querySelector('oy-review-attribute-summary');
                if (summaryEl && summaryEl.shadowRoot) {
                    summaryEl.shadowRoot.querySelectorAll('.attribute').forEach(item => {
                        const nameEl = item.querySelector('.name');
                        const textEl = item.querySelector('.text');
                        const pctEl = item.querySelector('.percentage span');
                        if (nameEl && textEl && pctEl) {
                            results.push({
                                name: nameEl.textContent.trim(),
                                answers: [{ name: textEl.textContent.trim(), percentage: parseInt(pctEl.textContent) || 0 }],
                            });
                        }
                    });
                }
            }
            return results;
        }""")

        if attributes:
            stats["attributes"] = attributes

        # 최소한 평점이나 리뷰 수가 있어야 유효
        if stats["averageRating"] > 0 or stats["reviewCount"] > 0:
            return stats
        return None

    except Exception as e:
        print(f"    → DOM 추출 에러: {e}")
        return None


def parse_stats_response(data: dict) -> dict | None:
    """API 응답 data 필드를 파싱한다."""
    if not data:
        return None

    stats = {
        "averageRating": data.get("ratingDistribution", {}).get("averageRating", 0),
        "reviewCount": data.get("reviewCount", 0),
        "ratingDistribution": [],
        "attributes": [],
    }

    for item in data.get("ratingDistribution", {}).get("ratingStatDtos", []):
        stats["ratingDistribution"].append({
            "rating": item.get("rating", 0),
            "percentage": item.get("percentage", 0),
        })

    for attr in data.get("satisfactionStats", []):
        answers = []
        for ans in attr.get("answerDtos", []):
            answers.append({
                "name": ans.get("answerName", ""),
                "percentage": ans.get("answerPercentage", 0),
            })
        stats["attributes"].append({
            "name": attr.get("questionName", ""),
            "answers": answers,
        })

    return stats


def generate_html(data: dict) -> str:
    products_json = json.dumps(data["products"], ensure_ascii=False)
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>올리브영 리뷰 분석 리포트 - {data['searchQuery']}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
</head>
<body class="bg-gray-50 min-h-screen">
<div class="max-w-7xl mx-auto px-4 py-8">

  <!-- 헤더 -->
  <div class="bg-white rounded-xl shadow-sm border p-6 mb-8">
    <h1 class="text-2xl font-bold text-gray-900">올리브영 리뷰 분석 리포트</h1>
    <div class="flex flex-wrap gap-6 mt-3 text-sm text-gray-600">
      <span>🔍 검색어: <strong>{data['searchQuery']}</strong></span>
      <span>📦 상품 수: <strong>{len(data['products'])}개</strong></span>
      <span>📊 리뷰 통계: <strong id="stats-count">-</strong>개 수집</span>
      <span>📅 {data['crawledAt'][:10]}</span>
    </div>
  </div>

  <!-- 요약 비교 테이블 -->
  <div class="bg-white rounded-xl shadow-sm border p-6 mb-8">
    <h2 class="text-lg font-bold text-gray-900 mb-4">📋 상품 비교 요약 (평점순)</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-3 py-2 text-left">#</th>
            <th class="px-3 py-2 text-left">브랜드</th>
            <th class="px-3 py-2 text-left">상품명</th>
            <th class="px-3 py-2 text-right">평점</th>
            <th class="px-3 py-2 text-right">리뷰 수</th>
            <th class="px-3 py-2 text-right">가격</th>
            <th class="px-3 py-2 text-center" id="attr-headers"></th>
          </tr>
        </thead>
        <tbody id="summary-table"></tbody>
      </table>
    </div>
  </div>

  <!-- 속성별 비교 차트 -->
  <div class="bg-white rounded-xl shadow-sm border p-6 mb-8">
    <h2 class="text-lg font-bold text-gray-900 mb-4">📊 속성별 만족도 비교 (상위 10개 상품)</h2>
    <div id="attr-charts" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
  </div>

  <!-- 개별 상품 상세 -->
  <h2 class="text-lg font-bold text-gray-900 mb-4">🔎 상품별 상세 리뷰 통계</h2>
  <div id="products" class="space-y-4"></div>

</div>

<script>
const products = {products_json};

// 평점순 정렬
products.sort((a, b) => {{
  const ra = a.reviewStats?.averageRating || 0;
  const rb = b.reviewStats?.averageRating || 0;
  if (rb !== ra) return rb - ra;
  return (b.reviewStats?.reviewCount || b.reviewCount || 0) - (a.reviewStats?.reviewCount || a.reviewCount || 0);
}});

const statsCount = products.filter(p => p.reviewStats).length;
document.getElementById('stats-count').textContent = statsCount;

// 요약 테이블
const tbody = document.getElementById('summary-table');
products.forEach((p, idx) => {{
  const stats = p.reviewStats;
  const rating = stats?.averageRating?.toFixed(1) || '-';
  const count = (stats?.reviewCount || p.reviewCount || 0).toLocaleString();
  const price = p.price.toLocaleString();

  // 속성 요약 (첫 번째 답변의 이름만)
  let attrSummary = '';
  if (stats?.attributes) {{
    attrSummary = stats.attributes.map(a => {{
      const top = a.answers[0];
      return top ? `<span class="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs mr-1">${{a.name}}: ${{top.name}} ${{top.percentage}}%</span>` : '';
    }}).join('');
  }}

  const ratingColor = rating >= 4.5 ? 'text-green-600' : rating >= 4.0 ? 'text-yellow-600' : 'text-red-600';

  tbody.innerHTML += `<tr class="border-t hover:bg-gray-50">
    <td class="px-3 py-2 text-gray-500">${{idx+1}}</td>
    <td class="px-3 py-2 font-medium">${{p.brand}}</td>
    <td class="px-3 py-2">${{p.name.length > 40 ? p.name.slice(0,40)+'...' : p.name}}</td>
    <td class="px-3 py-2 text-right font-bold ${{ratingColor}}">★ ${{rating}}</td>
    <td class="px-3 py-2 text-right">${{count}}</td>
    <td class="px-3 py-2 text-right">${{price}}원</td>
    <td class="px-3 py-2">${{attrSummary}}</td>
  </tr>`;
}});

// 속성별 비교 차트
const chartsContainer = document.getElementById('attr-charts');
const productsWithStats = products.filter(p => p.reviewStats?.attributes?.length > 0).slice(0, 10);

if (productsWithStats.length > 0) {{
  const attrNames = productsWithStats[0].reviewStats.attributes.map(a => a.name);

  attrNames.forEach(attrName => {{
    const chartDiv = document.createElement('div');
    chartDiv.innerHTML = `<canvas id="chart-${{attrName}}"></canvas>`;
    chartsContainer.appendChild(chartDiv);

    const labels = productsWithStats.map(p => p.brand + ' ' + p.name.slice(0, 15));
    const topAnswerPcts = productsWithStats.map(p => {{
      const attr = p.reviewStats.attributes.find(a => a.name === attrName);
      return attr?.answers[0]?.percentage || 0;
    }});

    new Chart(document.getElementById(`chart-${{attrName}}`), {{
      type: 'bar',
      data: {{
        labels: labels,
        datasets: [{{
          label: `${{attrName}} - 최고 만족도 (%)`,
          data: topAnswerPcts,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        }}]
      }},
      options: {{
        indexAxis: 'y',
        responsive: true,
        plugins: {{ legend: {{ display: false }}, title: {{ display: true, text: attrName }} }},
        scales: {{ x: {{ max: 100, ticks: {{ callback: v => v + '%' }} }} }}
      }}
    }});
  }});
}}

// 개별 상품 카드
const container = document.getElementById('products');
products.forEach((p, idx) => {{
  const stats = p.reviewStats;
  const rating = stats?.averageRating?.toFixed(1) || '-';
  const reviewCount = (stats?.reviewCount || p.reviewCount || 0).toLocaleString();
  const price = p.price.toLocaleString();

  let ratingBars = '';
  if (stats?.ratingDistribution) {{
    ratingBars = stats.ratingDistribution.map(r =>
      `<div class="flex items-center gap-2 text-xs">
        <span class="w-6 text-right">${{r.rating}}점</span>
        <div class="flex-1 bg-gray-200 rounded-full h-3">
          <div class="bg-green-500 h-3 rounded-full" style="width:${{r.percentage}}%"></div>
        </div>
        <span class="w-8 text-right">${{r.percentage}}%</span>
      </div>`
    ).join('');
  }}

  let attrHtml = '';
  if (stats?.attributes) {{
    attrHtml = stats.attributes.map(attr => {{
      const bars = attr.answers.map(a =>
        `<div class="flex items-center gap-2 text-xs">
          <span class="w-24 truncate">${{a.name}}</span>
          <div class="flex-1 bg-gray-200 rounded-full h-2.5">
            <div class="bg-blue-400 h-2.5 rounded-full" style="width:${{a.percentage}}%"></div>
          </div>
          <span class="w-8 text-right">${{a.percentage}}%</span>
        </div>`
      ).join('');
      return `<div><h4 class="text-xs font-medium text-gray-600 mb-1">${{attr.name}}</h4>${{bars}}</div>`;
    }}).join('');
  }}

  container.innerHTML += `
    <details class="bg-white rounded-lg shadow-sm border border-gray-200">
      <summary class="p-4 cursor-pointer hover:bg-gray-50 flex items-center gap-3">
        ${{p.imageUrl ? `<img src="${{p.imageUrl}}" class="w-12 h-12 object-cover rounded">` : ''}}
        <div class="flex-1 min-w-0">
          <span class="text-xs text-gray-500">#${{idx+1}} ${{p.brand}}</span>
          <p class="text-sm font-medium text-gray-900 truncate">${{p.name}}</p>
        </div>
        <div class="text-right">
          <span class="text-lg font-bold text-yellow-500">★ ${{rating}}</span>
          <p class="text-xs text-gray-500">${{reviewCount}}개 리뷰 · ${{price}}원</p>
        </div>
      </summary>
      <div class="px-4 pb-4 pt-2 border-t">
        ${{stats ? `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><h4 class="text-sm font-medium mb-2">평점 분포</h4>${{ratingBars}}</div>
          <div class="md:col-span-2 grid grid-cols-2 gap-3">${{attrHtml}}</div>
        </div>` : '<p class="text-gray-400 text-sm">리뷰 통계를 가져오지 못했습니다.</p>'}}
      </div>
    </details>`;
}});
</script>
</body>
</html>"""


def main():
    print("=" * 50)
    print("올리브영 리뷰 크롤러 + 시각화")
    print("=" * 50)

    if len(sys.argv) > 1:
        search_url = " ".join(sys.argv[1:])  # URL에 공백이 있을 수 있으므로
    else:
        print("\n사용법: python3 scripts/crawl_and_visualize.py \"올리브영검색URL\"")
        print("\n예시:")
        print('  python3 scripts/crawl_and_visualize.py "https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=쿠션"')
        sys.exit(1)

    if "oliveyoung.co.kr" not in search_url:
        print("[ERROR] 올리브영 URL이 아닙니다.")
        sys.exit(1)

    search_query = extract_search_query(search_url)
    print(f"\n검색어: {search_query}")
    print("크롤링을 시작합니다...\n")

    with sync_playwright() as p:
        headless = os.environ.get("HEADLESS", "false").lower() == "true"
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1440, "height": 900},
            locale="ko-KR",
        )
        page = context.new_page()

        # 검색 페이지 로드
        print("[1/3] 검색 페이지 로딩 중...")
        page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(5000)  # Cloudflare 챌린지 통과 대기

        # 상품 목록 추출
        print("[2/3] 상품 목록 추출 중...")
        products = extract_products(page)
        print(f"  → {len(products)}개 상품 발견")

        if not products:
            print("[ERROR] 상품을 찾을 수 없습니다.")
            print("  Cloudflare 챌린지가 표시되었을 수 있습니다.")
            print("  브라우저 창에서 수동으로 챌린지를 통과한 후 다시 시도하세요.")
            input("  챌린지 통과 후 Enter를 누르세요...")
            products = extract_products(page)
            print(f"  → {len(products)}개 상품 발견")
            if not products:
                browser.close()
                sys.exit(1)

        # 리뷰 통계 수집
        print(f"[3/3] 리뷰 통계 수집 중 ({len(products)}개 상품)...")
        print("  각 상품 페이지에 접속하여 리뷰 데이터를 추출합니다...")

        for i, product in enumerate(products):
            print(f"  [{i+1}/{len(products)}] {product['brand']} - {product['name'][:30]}...")
            try:
                product_url = f"https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo={product['id']}&tab=review"
                page.goto(product_url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(3000)  # 리뷰 컴포넌트 로딩 대기

                stats = extract_review_stats_from_page(page)
                if stats:
                    product["reviewStats"] = stats
                    print(f"    ✓ 평점 {stats['averageRating']}, 리뷰 {stats['reviewCount']}개")
                else:
                    print(f"    ✗ 리뷰 데이터 없음")
            except Exception as e:
                print(f"    ✗ 에러: {e}")
            page.wait_for_timeout(1000)

        browser.close()

    # 결과 저장 및 시각화
    data = {
        "searchUrl": search_url,
        "searchQuery": search_query,
        "crawledAt": datetime.now(timezone.utc).isoformat(),
        "products": products,
    }

    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output")
    os.makedirs(output_dir, exist_ok=True)

    # JSON 저장
    json_path = os.path.join(output_dir, "results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # frontend/public/data/에도 저장 (GitHub Pages 배포용)
    frontend_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public", "data")
    os.makedirs(frontend_data_dir, exist_ok=True)
    frontend_json_path = os.path.join(frontend_data_dir, "results.json")
    with open(frontend_json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # HTML 시각화 생성
    html_path = os.path.join(output_dir, "report.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(generate_html(data))

    stats_count = sum(1 for p in products if p["reviewStats"])
    print(f"\n{'=' * 50}")
    print(f"완료! {len(products)}개 상품, 리뷰 통계 {stats_count}개 수집")
    print(f"JSON: {json_path}")
    print(f"HTML: {html_path}")
    print(f"{'=' * 50}")

    # 브라우저에서 열기
    webbrowser.open(f"file://{os.path.abspath(html_path)}")


if __name__ == "__main__":
    main()
