/**
 * Cloudflare Worker — 올리브영 리뷰 크롤러 CORS 프록시
 *
 * 배포: cd worker && npx wrangler deploy
 * 엔드포인트:
 *   GET /health              → Worker 상태 확인
 *   GET /search?url=<url>    → 올리브영 검색 결과 크롤링
 *   GET /reviews?product_url=<url>&page=<n> → 상품 리뷰 크롤링
 */

const ALLOWED_ORIGIN = '*';

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // GET /health
    if (url.pathname === '/health') {
      return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // GET /search — 상품 목록 크롤링
    if (url.pathname === '/search') {
      const searchUrl = url.searchParams.get('url');
      const validation = validateUrl(searchUrl);
      if (!validation.valid) {
        return jsonError(400, validation.error);
      }
      try {
        const result = await handleSearch(validation.url);
        return jsonResponse(result);
      } catch (err) {
        if (err.status) {
          return jsonError(err.status, err.message);
        }
        return jsonError(502, '올리브영 서버에서 오류가 발생했습니다');
      }
    }

    // GET /reviews — 리뷰 크롤링
    if (url.pathname === '/reviews') {
      const productUrl = url.searchParams.get('product_url');
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const validation = validateProductUrl(productUrl);
      if (!validation.valid) {
        return jsonError(400, validation.error);
      }
      if (isNaN(page) || page < 1) {
        return jsonError(400, '페이지 번호는 1 이상이어야 합니다');
      }
      if (page > MAX_REVIEW_PAGES) {
        return jsonError(400, `최대 ${MAX_REVIEW_PAGES}페이지까지만 조회 가능합니다`);
      }
      try {
        const result = await handleReviews(validation.url, page);
        return jsonResponse(result);
      } catch (err) {
        if (err.status) {
          return jsonError(err.status, err.message);
        }
        return jsonError(502, '올리브영 서버에서 오류가 발생했습니다');
      }
    }

    return jsonError(404, 'Not found. Available endpoints: /health, /search, /reviews');
  },
};

/**
 * 올리브영 검색 결과 URL 검증
 * @param {string|null} url - 검증할 URL 문자열
 * @returns {{ valid: boolean, url?: string, error?: string }}
 */
function validateUrl(url) {
  if (!url) {
    return { valid: false, error: 'URL을 입력해 주세요' };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: '올리브영 검색 결과 페이지 URL만 입력 가능합니다' };
  }

  const hostname = parsed.hostname;
  if (hostname !== 'www.oliveyoung.co.kr' && hostname !== 'oliveyoung.co.kr') {
    return { valid: false, error: '올리브영 검색 결과 페이지 URL만 입력 가능합니다' };
  }

  if (!parsed.pathname.includes('/store/search/getSearchMain.do')) {
    return { valid: false, error: '올리브영 검색 결과 페이지 URL만 입력 가능합니다' };
  }

  return { valid: true, url: parsed.href };
}

/**
 * 올리브영 상품 URL 검증 (리뷰 엔드포인트용)
 * @param {string|null} url - 검증할 URL 문자열
 * @returns {{ valid: boolean, url?: string, error?: string }}
 */
function validateProductUrl(url) {
  if (!url) {
    return { valid: false, error: 'URL을 입력해 주세요' };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: '올리브영 상품 페이지 URL만 입력 가능합니다' };
  }

  const hostname = parsed.hostname;
  if (hostname !== 'www.oliveyoung.co.kr' && hostname !== 'oliveyoung.co.kr') {
    return { valid: false, error: '올리브영 상품 페이지 URL만 입력 가능합니다' };
  }

  return { valid: true, url: parsed.href };
}

// --- Constants ---

const MAX_PRODUCTS = 100;
const MAX_REVIEW_PAGES = 10;

// --- Search / Product Parsing ---

/**
 * 검색 URL로부터 상품 목록을 크롤링한다.
 * @param {string} searchUrl - 검증된 올리브영 검색 URL
 * @returns {Promise<{ products: Product[], totalPages: number }>}
 */
async function handleSearch(searchUrl) {
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  if (!response.ok) {
    const err = new Error('해당 URL에 접근할 수 없습니다. URL을 확인해 주세요');
    err.status = 502;
    throw err;
  }

  const html = await response.text();
  const products = parseProducts(html);
  const totalPages = parseTotalPages(html);

  return { products, totalPages };
}

/**
 * 올리브영 검색 결과 HTML에서 상품 정보를 추출한다.
 * 최대 MAX_PRODUCTS(100)개까지만 반환한다.
 * @param {string} html - 검색 결과 페이지 HTML
 * @returns {Product[]}
 */
function parseProducts(html) {
  const products = [];

  // 올리브영 검색 결과의 상품 카드 패턴:
  // <div class="prd_info"> 블록 내에 상품 정보가 포함됨
  // 상품 링크: <a href="/store/goods/getGoodsDetail.do?goodsNo=...">
  // 브랜드: <span class="tx_brand">브랜드명</span>
  // 상품명: <span class="tx_name">상품명</span>
  // 가격: <span class="tx_cur"><span class="tx_num">가격</span></span>

  // 방법 1: prd_info 블록 기반 파싱
  const prdInfoBlocks = splitByPattern(html, /<div[^>]*class="[^"]*prd_info[^"]*"[^>]*>/gi);

  for (const block of prdInfoBlocks) {
    if (products.length >= MAX_PRODUCTS) break;

    const product = extractProductFromBlock(block);
    if (product) {
      products.push(product);
    }
  }

  // 방법 1로 상품을 찾지 못한 경우, 방법 2: li.prd_item 기반 파싱 시도
  if (products.length === 0) {
    const itemBlocks = splitByPattern(html, /<li[^>]*class="[^"]*prd_item[^"]*"[^>]*>/gi);

    for (const block of itemBlocks) {
      if (products.length >= MAX_PRODUCTS) break;

      const product = extractProductFromBlock(block);
      if (product) {
        products.push(product);
      }
    }
  }

  return products;
}

/**
 * HTML을 주어진 패턴으로 분할하여 각 블록을 반환한다.
 * @param {string} html
 * @param {RegExp} pattern
 * @returns {string[]}
 */
function splitByPattern(html, pattern) {
  const blocks = [];
  const matches = [...html.matchAll(pattern)];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : start + 3000;
    blocks.push(html.slice(start, Math.min(end, start + 3000)));
  }

  return blocks;
}

/**
 * 상품 블록 HTML에서 개별 상품 정보를 추출한다.
 * @param {string} block - 상품 카드 HTML 블록
 * @returns {Product|null}
 */
function extractProductFromBlock(block) {
  const name = extractText(block, /<span[^>]*class="[^"]*tx_name[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const brand = extractText(block, /<span[^>]*class="[^"]*tx_brand[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const priceText = extractText(block, /<span[^>]*class="[^"]*tx_num[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const url = extractProductUrl(block);
  const imageUrl = extractImageUrl(block);
  const goodsNo = extractGoodsNo(block, url);

  // 상품명이 없으면 유효한 상품이 아님
  if (!name) return null;

  const price = parsePrice(priceText);

  return {
    id: goodsNo || generateId(name, brand),
    name: name.trim(),
    brand: (brand || '').trim(),
    price,
    url: url || '',
    imageUrl: imageUrl || undefined,
    averageRating: 0,
    totalReviews: 0,
  };
}

/**
 * HTML 블록에서 정규식 매칭으로 텍스트를 추출한다.
 * @param {string} block
 * @param {RegExp} regex
 * @returns {string}
 */
function extractText(block, regex) {
  const match = block.match(regex);
  if (!match || !match[1]) return '';
  // HTML 태그 제거 및 엔티티 디코딩
  return stripHtml(match[1]).trim();
}

/**
 * HTML 태그를 제거한다.
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * 블록에서 상품 상세 페이지 URL을 추출한다.
 * @param {string} block
 * @returns {string}
 */
function extractProductUrl(block) {
  // 패턴 1: getGoodsDetail.do 링크
  const detailMatch = block.match(
    /href=["']([^"']*getGoodsDetail\.do[^"']*)["']/i
  );
  if (detailMatch && detailMatch[1]) {
    const href = detailMatch[1];
    if (href.startsWith('http')) return href;
    return `https://www.oliveyoung.co.kr${href}`;
  }

  // 패턴 2: /store/goods/ 경로 링크
  const goodsMatch = block.match(
    /href=["']([^"']*\/store\/goods\/[^"']*)["']/i
  );
  if (goodsMatch && goodsMatch[1]) {
    const href = goodsMatch[1];
    if (href.startsWith('http')) return href;
    return `https://www.oliveyoung.co.kr${href}`;
  }

  return '';
}

/**
 * 블록에서 상품 이미지 URL을 추출한다.
 * @param {string} block
 * @returns {string}
 */
function extractImageUrl(block) {
  // data-original 또는 src 속성에서 이미지 URL 추출
  const dataOrigMatch = block.match(/data-original=["']([^"']+)["']/i);
  if (dataOrigMatch && dataOrigMatch[1]) return dataOrigMatch[1];

  const imgMatch = block.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch && imgMatch[1] && !imgMatch[1].includes('blank.gif')) {
    return imgMatch[1];
  }

  return '';
}

/**
 * 블록 또는 URL에서 goodsNo를 추출한다.
 * @param {string} block
 * @param {string} url
 * @returns {string}
 */
function extractGoodsNo(block, url) {
  // URL에서 goodsNo 파라미터 추출
  const urlMatch = (url || '').match(/goodsNo=([A-Za-z0-9]+)/i);
  if (urlMatch && urlMatch[1]) return urlMatch[1];

  // 블록에서 goodsNo 속성 추출
  const blockMatch = block.match(/goods[_-]?no[=:"'\s]+([A-Za-z0-9]+)/i);
  if (blockMatch && blockMatch[1]) return blockMatch[1];

  return '';
}

/**
 * 가격 문자열을 숫자로 변환한다.
 * @param {string} priceText - "12,900" 형태의 가격 문자열
 * @returns {number}
 */
function parsePrice(priceText) {
  if (!priceText) return 0;
  const cleaned = priceText.replace(/[^0-9]/g, '');
  const price = parseInt(cleaned, 10);
  return isNaN(price) ? 0 : price;
}

/**
 * 상품명과 브랜드로 간단한 ID를 생성한다.
 * @param {string} name
 * @param {string} brand
 * @returns {string}
 */
function generateId(name, brand) {
  const base = `${brand}_${name}`.replace(/[^a-zA-Z0-9가-힣]/g, '').slice(0, 30);
  return base || `product_${Date.now()}`;
}

/**
 * 검색 결과 HTML에서 총 페이지 수를 추출한다.
 * @param {string} html
 * @returns {number}
 */
function parseTotalPages(html) {
  // 패턴 1: 페이지네이션 영역에서 마지막 페이지 번호 추출
  const paginationMatch = html.match(
    /class="[^"]*pageing[^"]*"[\s\S]*?<\/div>/i
  );
  if (paginationMatch) {
    const pageNumbers = [...paginationMatch[0].matchAll(/>(\d+)<\/a>/g)];
    if (pageNumbers.length > 0) {
      const lastPage = Math.max(...pageNumbers.map((m) => parseInt(m[1], 10)));
      if (lastPage > 0) return lastPage;
    }
  }

  // 패턴 2: totalPage 변수 또는 속성
  const totalPageMatch = html.match(/totalPage[s]?['":\s=]+(\d+)/i);
  if (totalPageMatch && totalPageMatch[1]) {
    const total = parseInt(totalPageMatch[1], 10);
    if (total > 0) return total;
  }

  // 패턴 3: 마지막 페이지 링크
  const lastPageMatch = html.match(/pageIdx=(\d+)[^"']*["'][^>]*class="[^"]*last/i);
  if (lastPageMatch && lastPageMatch[1]) {
    const total = parseInt(lastPageMatch[1], 10);
    if (total > 0) return total;
  }

  // 기본값: 상품이 있으면 최소 1페이지
  return 1;
}

// --- Review Parsing ---

/**
 * 상품 URL에서 goodsNo를 추출한다.
 * @param {string} productUrl - 올리브영 상품 URL
 * @returns {string} goodsNo 또는 빈 문자열
 */
function extractGoodsNoFromUrl(productUrl) {
  // 패턴 1: goodsNo 쿼리 파라미터
  const paramMatch = productUrl.match(/goodsNo=([A-Za-z0-9]+)/i);
  if (paramMatch && paramMatch[1]) return paramMatch[1];

  // 패턴 2: URL 경로에서 상품 번호 추출 (예: /goods/A000000123456)
  const pathMatch = productUrl.match(/\/goods\/([A-Za-z0-9]+)/i);
  if (pathMatch && pathMatch[1]) return pathMatch[1];

  // 패턴 3: URL 경로 마지막 세그먼트가 숫자인 경우
  const lastSegMatch = productUrl.match(/\/([A-Z]\d{12})(?:[?#]|$)/i);
  if (lastSegMatch && lastSegMatch[1]) return lastSegMatch[1];

  return '';
}

/**
 * 상품 리뷰를 크롤링한다.
 * @param {string} productUrl - 검증된 올리브영 상품 URL
 * @param {number} page - 리뷰 페이지 번호 (1-based)
 * @returns {Promise<{ reviews: Review[], hasNext: boolean }>}
 */
async function handleReviews(productUrl, page) {
  const goodsNo = extractGoodsNoFromUrl(productUrl);
  if (!goodsNo) {
    const err = new Error('상품 번호를 추출할 수 없습니다. URL을 확인해 주세요');
    err.status = 400;
    throw err;
  }

  // 올리브영 리뷰 API URL 구성
  const reviewUrl = `https://www.oliveyoung.co.kr/store/goods/getGdasList.do?goodsNo=${goodsNo}&pageIdx=${page}&sortType=REG_DT&rowsPerPage=10`;

  const response = await fetch(reviewUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      Referer: `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}`,
    },
  });

  if (!response.ok) {
    const err = new Error('리뷰 페이지에 접근할 수 없습니다');
    err.status = 502;
    throw err;
  }

  const html = await response.text();
  const reviews = parseReviews(html, goodsNo);
  const hasNext = detectHasNextPage(html, page);
  const categorized = categorizeReviews(reviews);
  const keywords = extractKeywords(reviews);

  return { reviews, categorized, keywords, hasNext };
}

/**
 * 올리브영 리뷰 HTML에서 리뷰 데이터를 추출한다.
 * @param {string} html - 리뷰 페이지 HTML
 * @param {string} goodsNo - 상품 번호 (productId로 사용)
 * @returns {Review[]}
 */
function parseReviews(html, goodsNo) {
  const reviews = [];

  // 올리브영 리뷰 블록 패턴:
  // 각 리뷰는 <li class="review_list_item"> 또는 유사한 컨테이너에 포함됨
  // 평점: <span class="review_point"> 내부의 별점 또는 data-score 속성
  // 닉네임: <span class="info_user"> 또는 유사 클래스
  // 날짜: <span class="date"> 또는 유사 클래스
  // 본문: <div class="txt_inner"> 또는 유사 클래스
  // 피부타입/연령대: <span class="tag"> 또는 프로필 정보 영역

  // 리뷰 블록 분할 - 여러 패턴 시도
  let reviewBlocks = splitByPattern(html, /<li[^>]*class="[^"]*review_list_item[^"]*"[^>]*>/gi);

  if (reviewBlocks.length === 0) {
    reviewBlocks = splitByPattern(html, /<div[^>]*class="[^"]*review_cont[^"]*"[^>]*>/gi);
  }

  if (reviewBlocks.length === 0) {
    reviewBlocks = splitByPattern(html, /<li[^>]*class="[^"]*gdasList[^"]*"[^>]*>/gi);
  }

  if (reviewBlocks.length === 0) {
    // 올리브영 최신 구조: inner_list 또는 poll_sample 기반
    reviewBlocks = splitByPattern(html, /<li[^>]*class="[^"]*inner[^"]*"[^>]*>/gi);
  }

  for (const block of reviewBlocks) {
    const review = extractReviewFromBlock(block, goodsNo);
    if (review) {
      reviews.push(review);
    }
  }

  return reviews;
}

/**
 * 리뷰 블록 HTML에서 개별 리뷰 정보를 추출한다.
 * @param {string} block - 리뷰 HTML 블록
 * @param {string} goodsNo - 상품 번호
 * @returns {Review|null}
 */
function extractReviewFromBlock(block, goodsNo) {
  const rating = extractRating(block);
  const nickname = extractNickname(block);
  const date = extractDate(block);
  const body = extractBody(block);
  const skinType = extractSkinType(block);
  const ageGroup = extractAgeGroup(block);

  // 최소한 본문 또는 평점이 있어야 유효한 리뷰
  if (!body && !rating) return null;

  return {
    productId: goodsNo,
    rating: rating || 0,
    nickname: nickname || '익명',
    date: date || '',
    body: body || '',
    skinType: skinType || undefined,
    ageGroup: ageGroup || undefined,
  };
}

/**
 * 리뷰 블록에서 평점을 추출한다.
 * @param {string} block
 * @returns {number} 1-5 사이의 평점, 추출 실패 시 0
 */
function extractRating(block) {
  // 패턴 1: data-score 속성
  const dataScoreMatch = block.match(/data-score=["'](\d)["']/i);
  if (dataScoreMatch) return parseInt(dataScoreMatch[1], 10);

  // 패턴 2: <span class="score"> 내부 텍스트 (예: "평점5")
  const scoreSpanMatch = block.match(/<span[^>]*class="[^"]*score[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (scoreSpanMatch) {
    const numMatch = scoreSpanMatch[1].match(/(\d)/);
    if (numMatch) return parseInt(numMatch[1], 10);
  }

  // 패턴 3: review_point 클래스 내부
  const pointMatch = block.match(/<span[^>]*class="[^"]*review_point[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (pointMatch) {
    const numMatch = pointMatch[1].match(/(\d)/);
    if (numMatch) return parseInt(numMatch[1], 10);
  }

  // 패턴 4: star_area 또는 point 클래스에서 width 기반 추출 (width:80% = 4점)
  const widthMatch = block.match(/class="[^"]*(?:star|point)[^"]*"[^>]*style="[^"]*width:\s*(\d+)%/i);
  if (widthMatch) {
    const percent = parseInt(widthMatch[1], 10);
    return Math.round(percent / 20);
  }

  // 패턴 5: 별점 이미지 개수 (ic_star_on)
  const starMatches = block.match(/ic_star_on/gi);
  if (starMatches && starMatches.length >= 1 && starMatches.length <= 5) {
    return starMatches.length;
  }

  return 0;
}

/**
 * 리뷰 블록에서 닉네임을 추출한다.
 * @param {string} block
 * @returns {string}
 */
function extractNickname(block) {
  // 패턴 1: info_user 클래스
  const userMatch = block.match(/<span[^>]*class="[^"]*info_user[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (userMatch) return stripHtml(userMatch[1]).trim();

  // 패턴 2: user_id 또는 reviewer 클래스
  const idMatch = block.match(/<span[^>]*class="[^"]*(?:user_id|reviewer|nickname)[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (idMatch) return stripHtml(idMatch[1]).trim();

  // 패턴 3: id 클래스 (올리브영 구형 구조)
  const oldIdMatch = block.match(/<span[^>]*class="[^"]*\bid\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (oldIdMatch) return stripHtml(oldIdMatch[1]).trim();

  // 패턴 4: p 태그 내 닉네임 (프로필 영역)
  const pMatch = block.match(/<p[^>]*class="[^"]*info[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (pMatch) {
    const text = stripHtml(pMatch[1]).trim();
    if (text && text.length < 30) return text;
  }

  return '';
}

/**
 * 리뷰 블록에서 작성일을 추출한다.
 * @param {string} block
 * @returns {string} ISO 8601 형식 또는 원본 날짜 문자열
 */
function extractDate(block) {
  // 패턴 1: date 클래스
  const dateMatch = block.match(/<span[^>]*class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (dateMatch) {
    const dateStr = stripHtml(dateMatch[1]).trim();
    return normalizeDate(dateStr);
  }

  // 패턴 2: yyyy.mm.dd 또는 yyyy-mm-dd 형식 직접 매칭
  const datePatternMatch = block.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (datePatternMatch) {
    const [, year, month, day] = datePatternMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // 패턴 3: txt_date 클래스
  const txtDateMatch = block.match(/<span[^>]*class="[^"]*txt_date[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (txtDateMatch) {
    const dateStr = stripHtml(txtDateMatch[1]).trim();
    return normalizeDate(dateStr);
  }

  return '';
}

/**
 * 날짜 문자열을 ISO 8601 형식으로 정규화한다.
 * @param {string} dateStr - "2024.01.15" 또는 "2024-01-15" 등의 날짜 문자열
 * @returns {string}
 */
function normalizeDate(dateStr) {
  if (!dateStr) return '';

  // yyyy.mm.dd 또는 yyyy-mm-dd 또는 yyyy/mm/dd
  const match = dateStr.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return dateStr.trim();
}

/**
 * 리뷰 블록에서 리뷰 본문을 추출한다.
 * @param {string} block
 * @returns {string}
 */
function extractBody(block) {
  // 패턴 1: txt_inner 클래스 (리뷰 본문 컨테이너)
  const innerMatch = block.match(/<div[^>]*class="[^"]*txt_inner[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (innerMatch) return stripHtml(innerMatch[1]).trim();

  // 패턴 2: review_cont 클래스
  const contMatch = block.match(/<div[^>]*class="[^"]*review_cont[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (contMatch) return stripHtml(contMatch[1]).trim();

  // 패턴 3: txt_contents 클래스
  const txtMatch = block.match(/<div[^>]*class="[^"]*txt_contents[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (txtMatch) return stripHtml(txtMatch[1]).trim();

  // 패턴 4: review_txt 클래스
  const reviewTxtMatch = block.match(/<p[^>]*class="[^"]*review_txt[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (reviewTxtMatch) return stripHtml(reviewTxtMatch[1]).trim();

  // 패턴 5: txt_review 클래스
  const txtReviewMatch = block.match(/<p[^>]*class="[^"]*txt_review[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (txtReviewMatch) return stripHtml(txtReviewMatch[1]).trim();

  return '';
}

/**
 * 리뷰 블록에서 피부타입을 추출한다.
 * @param {string} block
 * @returns {string|null} SkinType 또는 null
 */
function extractSkinType(block) {
  const skinTypes = ['건성', '지성', '복합성', '민감성', '중성'];

  // 블록 텍스트에서 피부타입 키워드 검색
  for (const type of skinTypes) {
    if (block.includes(type)) {
      return type;
    }
  }

  return null;
}

/**
 * 리뷰 블록에서 연령대를 추출한다.
 * @param {string} block
 * @returns {string|null} AgeGroup 또는 null
 */
function extractAgeGroup(block) {
  // 연령대 패턴 매칭
  const ageGroups = ['10대', '20대', '30대', '40대', '50대 이상'];

  for (const group of ageGroups) {
    if (block.includes(group)) {
      return group;
    }
  }

  // "50대" 만 있는 경우 "50대 이상"으로 매핑
  if (block.includes('50대')) {
    return '50대 이상';
  }

  return null;
}

/**
 * 다음 페이지 존재 여부를 확인한다.
 * @param {string} html - 리뷰 페이지 HTML
 * @param {number} currentPage - 현재 페이지 번호
 * @returns {boolean}
 */
function detectHasNextPage(html, currentPage) {
  // 최대 페이지 제한 확인
  if (currentPage >= MAX_REVIEW_PAGES) return false;

  // 패턴 1: 다음 페이지 링크 존재 여부
  const nextPagePattern = new RegExp(`pageIdx=${currentPage + 1}`, 'i');
  if (nextPagePattern.test(html)) return true;

  // 패턴 2: "다음" 버튼 존재 여부
  if (html.includes('btn_next') || html.includes('next_page')) return true;

  // 패턴 3: 페이지네이션에서 현재 페이지 이후 페이지 번호 존재
  const pageNumbers = [...html.matchAll(/pageIdx=(\d+)/gi)];
  for (const match of pageNumbers) {
    const pageNum = parseInt(match[1], 10);
    if (pageNum > currentPage) return true;
  }

  // 패턴 4: totalPage 정보가 있는 경우
  const totalPageMatch = html.match(/totalPage[s]?['":\s=]+(\d+)/i);
  if (totalPageMatch) {
    const totalPages = parseInt(totalPageMatch[1], 10);
    if (currentPage < totalPages) return true;
  }

  return false;
}

// --- Review Categorization & Keyword Extraction ---

/**
 * 리뷰를 평점, 피부타입, 연령대별로 분류한다.
 * @param {Review[]} reviews - 리뷰 배열
 * @returns {CategorizedData}
 */
function categorizeReviews(reviews) {
  const byRating = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  const bySkinType = { '건성': [], '지성': [], '복합성': [], '민감성': [], '중성': [] };
  const byAgeGroup = { '10대': [], '20대': [], '30대': [], '40대': [], '50대 이상': [] };

  for (const review of reviews) {
    if (review.rating >= 1 && review.rating <= 5) {
      byRating[review.rating].push(review);
    }
    if (review.skinType && bySkinType[review.skinType]) {
      bySkinType[review.skinType].push(review);
    }
    if (review.ageGroup && byAgeGroup[review.ageGroup]) {
      byAgeGroup[review.ageGroup].push(review);
    }
  }

  return { byRating, bySkinType, byAgeGroup };
}

/**
 * 한국어 불용어 목록
 */
const KOREAN_STOPWORDS = new Set([
  '이', '그', '저', '것', '수', '등', '때', '중', '더', '좀', '잘', '안', '못',
  '너무', '정말', '진짜', '아주', '매우', '되다', '하다', '있다', '없다', '같다',
  '보다', '주다', '그리고', '하지만', '그래서', '그런데', '또한', '그러나', '따라서',
  '에서', '으로', '에게', '부터', '까지', '이다', '입니다', '합니다', '했습니다',
  '됩니다', '있습니다', '없습니다', '것이', '것을', '것은', '것도', '것에',
  '해서', '하고', '하면', '해도', '인데', '인데요', '거든요', '네요', '어요',
  '아요', '습니다', '니다', '요', '은', '는', '가', '을', '를', '의', '에',
  '와', '과', '도', '만', '로', '에서', '까지', '부터', '보다', '처럼', '같이',
  '대로', '만큼'
]);

/**
 * 리뷰 본문에서 빈도 기반 키워드를 추출한다.
 * @param {Review[]} reviews - 리뷰 배열
 * @returns {Keyword[]} 빈도순으로 정렬된 키워드 배열 (최대 30개)
 */
function extractKeywords(reviews) {
  const wordCounts = {};

  for (const review of reviews) {
    if (!review.body) continue;

    // 공백 기준으로 단어 분리
    const words = review.body.split(/\s+/);

    for (const word of words) {
      // 특수문자 제거 후 정리
      const cleaned = word.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, '').trim();

      // 2글자 미만 필터링
      if (cleaned.length < 2) continue;

      // 불용어 필터링
      if (KOREAN_STOPWORDS.has(cleaned)) continue;

      wordCounts[cleaned] = (wordCounts[cleaned] || 0) + 1;
    }
  }

  // 빈도순 정렬 후 상위 30개 추출
  const sorted = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  if (sorted.length === 0) return [];

  const maxCount = sorted[0][1];

  // 가중치 정규화 (0-1)
  return sorted.map(([word, count]) => ({
    word,
    count,
    weight: count / maxCount,
  }));
}

// --- Helper functions ---

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export { validateUrl, validateProductUrl, parseProducts, parseTotalPages, handleSearch, handleReviews, parseReviews, extractGoodsNoFromUrl, extractReviewFromBlock, extractRating, extractNickname, extractDate, extractBody, extractSkinType, extractAgeGroup, detectHasNextPage, normalizeDate, categorizeReviews, extractKeywords, KOREAN_STOPWORDS };
