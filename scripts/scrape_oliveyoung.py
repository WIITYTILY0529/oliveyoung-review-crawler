"""
올리브영 검색 결과 크롤러
- Playwright를 사용하여 검색 페이지에서 상품 목록 추출
- 각 상품의 리뷰 통계 API 호출 (브라우저 컨텍스트 내에서)
- 결과를 frontend/public/data/results.json에 저장
"""

import json
import sys
import os
import re
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

from playwright.sync_api import sync_playwright, Page


def extract_search_query(url: str) -> str:
    """URL에서 검색어를 추출한다."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    # 올리브영 검색 URL 파라미터: query 또는 searchKeyword
    for key in ("query", "searchKeyword", "searchWord"):
        if key in params:
            return params[key][0]
    return ""


def extract_goods_no(href: str) -> str:
    """상품 링크에서 goodsNo를 추출한다."""
    match = re.search(r"goodsNo=([A-Z0-9]+)", href)
    return match.group(1) if match else ""


def parse_price(text: str) -> int:
    """가격 문자열에서 숫자만 추출한다."""
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else 0


def extract_products(page: Page) -> list[dict]:
    """검색 결과 페이지에서 상품 목록을 추출한다."""
    products = []

    items = page.query_selector_all("li.flag.li_result")
    if not items:
        # 대체 셀렉터 시도
        items = page.query_selector_all("li[class*='li_result']")

    for item in items:
        try:
            # goodsNo 및 URL
            thumb_link = item.query_selector("a.prd_thumb")
            if not thumb_link:
                continue
            href = thumb_link.get_attribute("href") or ""
            goods_no = extract_goods_no(href)
            if not goods_no:
                continue

            product_url = f"https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo={goods_no}"

            # 이미지
            img_el = thumb_link.query_selector("img")
            image_url = ""
            if img_el:
                image_url = img_el.get_attribute("src") or img_el.get_attribute("data-src") or ""

            # 브랜드
            brand_el = item.query_selector("span.tx_brand")
            brand = brand_el.inner_text().strip() if brand_el else ""

            # 상품명
            name_el = item.query_selector("p.tx_name")
            name = name_el.inner_text().strip() if name_el else ""

            # 할인가
            price = 0
            price_el = item.query_selector("span.tx_cur span.tx_num")
            if price_el:
                price = parse_price(price_el.inner_text())

            # 원가
            original_price = price
            org_price_el = item.query_selector("span.tx_org span.tx_num")
            if org_price_el:
                original_price = parse_price(org_price_el.inner_text())

            # 평점 (width 퍼센트에서 계산)
            average_rating = 0.0
            point_el = item.query_selector("span.point span")
            if point_el:
                style = point_el.get_attribute("style") or ""
                width_match = re.search(r"width:\s*([\d.]+)%", style)
                if width_match:
                    average_rating = round(float(width_match.group(1)) / 20, 1)

            # 리뷰 수
            review_count = 0
            review_el = item.query_selector("p.prd_point_area")
            if review_el:
                review_text = review_el.inner_text()
                count_match = re.search(r"\(([\d,]+)\)", review_text)
                if count_match:
                    review_count = int(count_match.group(1).replace(",", ""))

            products.append({
                "id": goods_no,
                "name": name,
                "brand": brand,
                "price": price,
                "originalPrice": original_price,
                "imageUrl": image_url,
                "url": product_url,
                "averageRating": average_rating,
                "reviewCount": review_count,
                "reviewStats": None,
            })
        except Exception as e:
            print(f"[WARN] 상품 파싱 실패: {e}")
            continue

    return products


def fetch_review_stats(page: Page, goods_no: str) -> dict | None:
    """브라우저 컨텍스트에서 리뷰 통계 API를 호출한다."""
    api_url = f"https://m.oliveyoung.co.kr/review/api/v2/reviews/{goods_no}/stats"

    try:
        result = page.evaluate(
            """async (url) => {
                try {
                    const res = await fetch(url, {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                        }
                    });
                    if (!res.ok) return null;
                    return await res.json();
                } catch (e) {
                    return null;
                }
            }""",
            api_url,
        )

        if not result:
            return None

        # API 응답 파싱
        stats = {}

        # 평균 평점
        stats["averageRating"] = result.get("averageRating") or result.get("avgScore", 0)

        # 리뷰 수
        stats["reviewCount"] = result.get("reviewCount") or result.get("totalCount", 0)

        # 평점 분포
        rating_dist = []
        distributions = result.get("ratingDistribution") or result.get("scoreDistribution") or []
        if isinstance(distributions, list):
            for item in distributions:
                rating_dist.append({
                    "rating": item.get("rating") or item.get("score", 0),
                    "percentage": item.get("percentage") or item.get("ratio", 0),
                })
        elif isinstance(distributions, dict):
            for rating_val in range(5, 0, -1):
                key = str(rating_val)
                if key in distributions:
                    rating_dist.append({
                        "rating": rating_val,
                        "percentage": distributions[key],
                    })
        stats["ratingDistribution"] = rating_dist

        # 만족도 속성 (발색력, 지속력, 수분감 등)
        attributes = []
        satisfaction = result.get("satisfactionStats") or result.get("attributes") or []
        if isinstance(satisfaction, list):
            for attr in satisfaction:
                attr_name = attr.get("name") or attr.get("title", "")
                answers = []
                for ans in attr.get("answers") or attr.get("options") or []:
                    answers.append({
                        "name": ans.get("name") or ans.get("title", ""),
                        "percentage": ans.get("percentage") or ans.get("ratio", 0),
                    })
                if attr_name:
                    attributes.append({
                        "name": attr_name,
                        "answers": answers,
                    })
        stats["attributes"] = attributes

        return stats

    except Exception as e:
        print(f"[WARN] 리뷰 통계 API 호출 실패 ({goods_no}): {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python scrape_oliveyoung.py <search_url>")
        sys.exit(1)

    search_url = sys.argv[1]
    search_query = extract_search_query(search_url)

    print(f"[INFO] 검색 URL: {search_url}")
    print(f"[INFO] 검색어: {search_query}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR",
        )
        page = context.new_page()

        # 검색 페이지 로드
        print("[INFO] 검색 페이지 로딩 중...")
        page.goto(search_url, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(3000)  # 추가 대기

        # 상품 목록 추출
        print("[INFO] 상품 목록 추출 중...")
        products = extract_products(page)
        print(f"[INFO] {len(products)}개 상품 발견")

        if not products:
            print("[ERROR] 상품을 찾을 수 없습니다. 페이지 구조가 변경되었을 수 있습니다.")
            browser.close()
            sys.exit(1)

        # 각 상품의 리뷰 통계 가져오기
        print("[INFO] 리뷰 통계 수집 중...")
        for i, product in enumerate(products):
            print(f"  [{i + 1}/{len(products)}] {product['brand']} - {product['name'][:30]}...")
            stats = fetch_review_stats(page, product["id"])
            if stats:
                product["reviewStats"] = stats
                # API에서 더 정확한 값이 있으면 업데이트
                if stats.get("averageRating"):
                    product["averageRating"] = stats["averageRating"]
                if stats.get("reviewCount"):
                    product["reviewCount"] = stats["reviewCount"]
            page.wait_for_timeout(500)  # API 호출 간 딜레이

        browser.close()

    # 결과 저장
    output = {
        "searchUrl": search_url,
        "searchQuery": search_query,
        "crawledAt": datetime.now(timezone.utc).isoformat(),
        "products": products,
    }

    output_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "data")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "results.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[INFO] 결과 저장 완료: {output_path}")
    print(f"[INFO] 총 {len(products)}개 상품, 리뷰 통계 {sum(1 for p in products if p['reviewStats'])}개 수집")


if __name__ == "__main__":
    main()
