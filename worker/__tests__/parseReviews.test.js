import { describe, it, expect } from 'vitest';
import {
  parseReviews,
  extractGoodsNoFromUrl,
  extractReviewFromBlock,
  extractRating,
  extractNickname,
  extractDate,
  extractBody,
  extractSkinType,
  extractAgeGroup,
  detectHasNextPage,
  normalizeDate,
} from '../index.js';

/**
 * 올리브영 리뷰 HTML 블록을 생성하는 헬퍼
 */
function buildReviewBlockHtml({ rating, nickname, date, body, skinType, ageGroup }) {
  const skinTypeTag = skinType ? `<span class="tag">${skinType}</span>` : '';
  const ageGroupTag = ageGroup ? `<span class="tag">${ageGroup}</span>` : '';

  return `
    <li class="review_list_item">
      <div class="review_header">
        <span class="score">평점${rating}</span>
        <span class="info_user">${nickname}</span>
        <span class="date">${date}</span>
        ${skinTypeTag}
        ${ageGroupTag}
      </div>
      <div class="txt_inner">${body}</div>
    </li>
  `;
}

function buildReviewPageHtml(reviews, { totalPages = 1, currentPage = 1 } = {}) {
  const reviewBlocks = reviews.map(buildReviewBlockHtml).join('\n');
  const pagination = totalPages > 1
    ? Array.from({ length: totalPages }, (_, i) => `<a href="?pageIdx=${i + 1}">${i + 1}</a>`).join('')
    : '';

  return `
    <html>
    <body>
      <div class="review_list">
        ${reviewBlocks}
      </div>
      <div class="pageing">
        ${pagination}
      </div>
    </body>
    </html>
  `;
}

// --- extractGoodsNoFromUrl ---

describe('extractGoodsNoFromUrl', () => {
  it('goodsNo 쿼리 파라미터에서 상품 번호를 추출한다', () => {
    const url = 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000123456';
    expect(extractGoodsNoFromUrl(url)).toBe('A000000123456');
  });

  it('URL 경로에서 상품 번호를 추출한다', () => {
    const url = 'https://www.oliveyoung.co.kr/store/goods/B000000654321';
    expect(extractGoodsNoFromUrl(url)).toBe('B000000654321');
  });

  it('상품 번호가 없는 URL에서 빈 문자열을 반환한다', () => {
    const url = 'https://www.oliveyoung.co.kr/store/main/main.do';
    expect(extractGoodsNoFromUrl(url)).toBe('');
  });

  it('여러 쿼리 파라미터가 있는 URL에서도 goodsNo를 추출한다', () => {
    const url = 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=C000000789012&categoryNo=100';
    expect(extractGoodsNoFromUrl(url)).toBe('C000000789012');
  });
});

// --- extractRating ---

describe('extractRating', () => {
  it('data-score 속성에서 평점을 추출한다', () => {
    const block = '<div data-score="5">별점</div>';
    expect(extractRating(block)).toBe(5);
  });

  it('score 클래스 span에서 평점을 추출한다', () => {
    const block = '<span class="score">평점4</span>';
    expect(extractRating(block)).toBe(4);
  });

  it('review_point 클래스에서 평점을 추출한다', () => {
    const block = '<span class="review_point">3점</span>';
    expect(extractRating(block)).toBe(3);
  });

  it('width 퍼센트에서 평점을 계산한다', () => {
    const block = '<span class="star_area" style="width:80%"></span>';
    expect(extractRating(block)).toBe(4);
  });

  it('평점 정보가 없으면 0을 반환한다', () => {
    const block = '<div>평점 없음</div>';
    expect(extractRating(block)).toBe(0);
  });
});

// --- extractNickname ---

describe('extractNickname', () => {
  it('info_user 클래스에서 닉네임을 추출한다', () => {
    const block = '<span class="info_user">뷰티러버</span>';
    expect(extractNickname(block)).toBe('뷰티러버');
  });

  it('reviewer 클래스에서 닉네임을 추출한다', () => {
    const block = '<span class="reviewer">화장품매니아</span>';
    expect(extractNickname(block)).toBe('화장품매니아');
  });

  it('닉네임 정보가 없으면 빈 문자열을 반환한다', () => {
    const block = '<div>닉네임 없음</div>';
    expect(extractNickname(block)).toBe('');
  });
});

// --- extractDate ---

describe('extractDate', () => {
  it('date 클래스에서 날짜를 추출한다', () => {
    const block = '<span class="date">2024.03.15</span>';
    expect(extractDate(block)).toBe('2024-03-15');
  });

  it('yyyy-mm-dd 형식을 직접 매칭한다', () => {
    const block = '<div>작성일: 2024-01-20</div>';
    expect(extractDate(block)).toBe('2024-01-20');
  });

  it('날짜 정보가 없으면 빈 문자열을 반환한다', () => {
    const block = '<div>날짜 없음</div>';
    expect(extractDate(block)).toBe('');
  });
});

// --- normalizeDate ---

describe('normalizeDate', () => {
  it('yyyy.mm.dd 형식을 ISO 형식으로 변환한다', () => {
    expect(normalizeDate('2024.03.15')).toBe('2024-03-15');
  });

  it('yyyy/mm/dd 형식을 ISO 형식으로 변환한다', () => {
    expect(normalizeDate('2024/1/5')).toBe('2024-01-05');
  });

  it('빈 문자열은 빈 문자열을 반환한다', () => {
    expect(normalizeDate('')).toBe('');
  });
});

// --- extractBody ---

describe('extractBody', () => {
  it('txt_inner 클래스에서 본문을 추출한다', () => {
    const block = '<div class="txt_inner">정말 좋은 제품이에요!</div>';
    expect(extractBody(block)).toBe('정말 좋은 제품이에요!');
  });

  it('review_cont 클래스에서 본문을 추출한다', () => {
    const block = '<div class="review_cont">보습력이 뛰어납니다</div>';
    expect(extractBody(block)).toBe('보습력이 뛰어납니다');
  });

  it('HTML 태그를 제거하고 본문을 추출한다', () => {
    const block = '<div class="txt_inner"><p>첫 줄</p><br><p>두번째 줄</p></div>';
    expect(extractBody(block)).toBe('첫 줄두번째 줄');
  });

  it('본문이 없으면 빈 문자열을 반환한다', () => {
    const block = '<div>본문 없음</div>';
    expect(extractBody(block)).toBe('');
  });
});

// --- extractSkinType ---

describe('extractSkinType', () => {
  it('건성 피부타입을 추출한다', () => {
    const block = '<span class="tag">건성</span>';
    expect(extractSkinType(block)).toBe('건성');
  });

  it('지성 피부타입을 추출한다', () => {
    const block = '<span class="tag">지성</span>';
    expect(extractSkinType(block)).toBe('지성');
  });

  it('복합성 피부타입을 추출한다', () => {
    const block = '<span class="tag">복합성</span>';
    expect(extractSkinType(block)).toBe('복합성');
  });

  it('민감성 피부타입을 추출한다', () => {
    const block = '<span class="tag">민감성</span>';
    expect(extractSkinType(block)).toBe('민감성');
  });

  it('중성 피부타입을 추출한다', () => {
    const block = '<span class="tag">중성</span>';
    expect(extractSkinType(block)).toBe('중성');
  });

  it('피부타입 정보가 없으면 null을 반환한다', () => {
    const block = '<div>피부타입 없음</div>';
    expect(extractSkinType(block)).toBeNull();
  });
});

// --- extractAgeGroup ---

describe('extractAgeGroup', () => {
  it('20대 연령대를 추출한다', () => {
    const block = '<span class="tag">20대</span>';
    expect(extractAgeGroup(block)).toBe('20대');
  });

  it('30대 연령대를 추출한다', () => {
    const block = '<span class="tag">30대</span>';
    expect(extractAgeGroup(block)).toBe('30대');
  });

  it('50대를 50대 이상으로 매핑한다', () => {
    const block = '<span class="tag">50대</span>';
    expect(extractAgeGroup(block)).toBe('50대 이상');
  });

  it('50대 이상을 올바르게 추출한다', () => {
    const block = '<span class="tag">50대 이상</span>';
    expect(extractAgeGroup(block)).toBe('50대 이상');
  });

  it('연령대 정보가 없으면 null을 반환한다', () => {
    const block = '<div>연령대 없음</div>';
    expect(extractAgeGroup(block)).toBeNull();
  });
});

// --- detectHasNextPage ---

describe('detectHasNextPage', () => {
  it('다음 페이지 링크가 있으면 true를 반환한다', () => {
    const html = '<a href="?pageIdx=2">2</a>';
    expect(detectHasNextPage(html, 1)).toBe(true);
  });

  it('현재 페이지가 마지막이면 false를 반환한다', () => {
    const html = '<a href="?pageIdx=1">1</a>';
    expect(detectHasNextPage(html, 1)).toBe(false);
  });

  it('현재 페이지가 MAX_REVIEW_PAGES(10)이면 false를 반환한다', () => {
    const html = '<a href="?pageIdx=11">11</a>';
    expect(detectHasNextPage(html, 10)).toBe(false);
  });

  it('totalPage 정보로 다음 페이지 여부를 판단한다', () => {
    const html = '<script>var totalPage = 5;</script>';
    expect(detectHasNextPage(html, 3)).toBe(true);
    expect(detectHasNextPage(html, 5)).toBe(false);
  });

  it('빈 HTML에서 false를 반환한다', () => {
    expect(detectHasNextPage('', 1)).toBe(false);
  });
});

// --- parseReviews (통합 테스트) ---

describe('parseReviews', () => {
  it('빈 HTML에서 빈 배열을 반환한다', () => {
    const result = parseReviews('', 'TEST001');
    expect(result).toEqual([]);
  });

  it('단일 리뷰를 올바르게 파싱한다', () => {
    const html = buildReviewPageHtml([
      {
        rating: 5,
        nickname: '뷰티러버',
        date: '2024.03.15',
        body: '정말 좋은 제품이에요! 피부가 촉촉해졌어요.',
        skinType: '건성',
        ageGroup: '20대',
      },
    ]);

    const result = parseReviews(html, 'TEST001');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      productId: 'TEST001',
      rating: 5,
      nickname: '뷰티러버',
      date: '2024-03-15',
      body: '정말 좋은 제품이에요! 피부가 촉촉해졌어요.',
      skinType: '건성',
      ageGroup: '20대',
    });
  });

  it('여러 리뷰를 올바르게 파싱한다', () => {
    const html = buildReviewPageHtml([
      { rating: 5, nickname: '사용자1', date: '2024.03.15', body: '좋아요', skinType: '건성', ageGroup: '20대' },
      { rating: 3, nickname: '사용자2', date: '2024.03.14', body: '보통이에요', skinType: '지성', ageGroup: '30대' },
      { rating: 1, nickname: '사용자3', date: '2024.03.13', body: '별로에요', skinType: '민감성', ageGroup: '40대' },
    ]);

    const result = parseReviews(html, 'TEST002');
    expect(result).toHaveLength(3);
    expect(result[0].rating).toBe(5);
    expect(result[1].rating).toBe(3);
    expect(result[2].rating).toBe(1);
  });

  it('피부타입과 연령대가 없는 리뷰도 파싱한다', () => {
    const html = buildReviewPageHtml([
      { rating: 4, nickname: '익명사용자', date: '2024.02.01', body: '괜찮아요', skinType: '', ageGroup: '' },
    ]);

    const result = parseReviews(html, 'TEST003');
    expect(result).toHaveLength(1);
    expect(result[0].skinType).toBeUndefined();
    expect(result[0].ageGroup).toBeUndefined();
  });

  it('productId가 올바르게 설정된다', () => {
    const html = buildReviewPageHtml([
      { rating: 4, nickname: '테스터', date: '2024.01.01', body: '테스트 리뷰', skinType: '', ageGroup: '' },
    ]);

    const result = parseReviews(html, 'GOODS123');
    expect(result[0].productId).toBe('GOODS123');
  });
});

// --- extractReviewFromBlock ---

describe('extractReviewFromBlock', () => {
  it('본문과 평점이 모두 없으면 null을 반환한다', () => {
    const block = '<div>유효하지 않은 블록</div>';
    expect(extractReviewFromBlock(block, 'TEST')).toBeNull();
  });

  it('닉네임이 없으면 익명으로 설정한다', () => {
    const block = `
      <span class="score">평점4</span>
      <div class="txt_inner">리뷰 본문입니다</div>
    `;
    const result = extractReviewFromBlock(block, 'TEST');
    expect(result.nickname).toBe('익명');
  });
});
