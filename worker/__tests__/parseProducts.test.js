import { describe, it, expect } from 'vitest';
import { parseProducts, parseTotalPages } from '../index.js';

/**
 * 올리브영 검색 결과 HTML 구조를 모사한 테스트 HTML 생성 헬퍼
 */
function buildProductCardHtml({ name, brand, price, goodsNo, imageUrl }) {
  return `
    <div class="prd_info">
      <a href="/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}&categoryNo=100000100010013">
        <span class="tx_brand">${brand}</span>
        <span class="tx_name">${name}</span>
      </a>
      <span class="tx_cur"><span class="tx_num">${price}</span></span>
      <img src="${imageUrl || 'https://image.oliveyoung.co.kr/sample.jpg'}" />
    </div>
  `;
}

function buildSearchPageHtml(products, totalPages = 1) {
  const productCards = products.map(buildProductCardHtml).join('\n');
  const pagination = totalPages > 1
    ? `<div class="pageing">${Array.from({ length: totalPages }, (_, i) => `<a href="#">${i + 1}</a>`).join('')}</div>`
    : '';
  return `
    <html>
    <body>
      <div class="search_result">
        ${productCards}
      </div>
      ${pagination}
    </body>
    </html>
  `;
}

describe('parseProducts', () => {
  it('빈 HTML에서 빈 배열을 반환한다', () => {
    const result = parseProducts('');
    expect(result).toEqual([]);
  });

  it('상품 정보가 없는 HTML에서 빈 배열을 반환한다', () => {
    const html = '<html><body><div>No products here</div></body></html>';
    const result = parseProducts(html);
    expect(result).toEqual([]);
  });

  it('단일 상품 카드를 올바르게 파싱한다', () => {
    const html = buildSearchPageHtml([
      { name: '비타민C 세럼', brand: '닥터지', price: '23,000', goodsNo: 'A000000001', imageUrl: 'https://img.oliveyoung.co.kr/product1.jpg' },
    ]);

    const result = parseProducts(html);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'A000000001',
      name: '비타민C 세럼',
      brand: '닥터지',
      price: 23000,
      url: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000001&categoryNo=100000100010013',
      imageUrl: 'https://img.oliveyoung.co.kr/product1.jpg',
      averageRating: 0,
      totalReviews: 0,
    });
  });

  it('여러 상품 카드를 올바르게 파싱한다', () => {
    const html = buildSearchPageHtml([
      { name: '선크림 SPF50', brand: '이니스프리', price: '15,900', goodsNo: 'B000000002' },
      { name: '클렌징 폼', brand: '라운드랩', price: '12,000', goodsNo: 'C000000003' },
      { name: '토너 패드', brand: '아누아', price: '19,800', goodsNo: 'D000000004' },
    ]);

    const result = parseProducts(html);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('선크림 SPF50');
    expect(result[1].name).toBe('클렌징 폼');
    expect(result[2].name).toBe('토너 패드');
  });

  it('가격 문자열을 숫자로 올바르게 변환한다', () => {
    const html = buildSearchPageHtml([
      { name: '고가 크림', brand: '설화수', price: '120,000', goodsNo: 'E000000005' },
    ]);

    const result = parseProducts(html);
    expect(result[0].price).toBe(120000);
  });

  it('가격이 없는 경우 0을 반환한다', () => {
    const html = `
      <div class="prd_info">
        <a href="/store/goods/getGoodsDetail.do?goodsNo=F000000006">
          <span class="tx_brand">브랜드</span>
          <span class="tx_name">무료 샘플</span>
        </a>
      </div>
    `;

    const result = parseProducts(html);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(0);
  });

  it('상품명이 없는 블록은 건너뛴다', () => {
    const html = `
      <div class="prd_info">
        <span class="tx_brand">브랜드만 있음</span>
        <span class="tx_num">10,000</span>
      </div>
    `;

    const result = parseProducts(html);
    expect(result).toHaveLength(0);
  });

  it('최대 100개 상품까지만 반환한다', () => {
    const products = Array.from({ length: 120 }, (_, i) => ({
      name: `상품 ${i + 1}`,
      brand: `브랜드 ${i + 1}`,
      price: `${(i + 1) * 1000}`,
      goodsNo: `G${String(i).padStart(9, '0')}`,
    }));

    const html = buildSearchPageHtml(products);
    const result = parseProducts(html);
    expect(result).toHaveLength(100);
  });

  it('HTML 엔티티를 올바르게 디코딩한다', () => {
    const html = `
      <div class="prd_info">
        <a href="/store/goods/getGoodsDetail.do?goodsNo=H000000007">
          <span class="tx_brand">A&amp;B 코스메틱</span>
          <span class="tx_name">수분 크림 &lt;리뉴얼&gt;</span>
        </a>
        <span class="tx_cur"><span class="tx_num">25,000</span></span>
      </div>
    `;

    const result = parseProducts(html);
    expect(result).toHaveLength(1);
    expect(result[0].brand).toBe('A&B 코스메틱');
    expect(result[0].name).toBe('수분 크림 <리뉴얼>');
  });

  it('prd_item 클래스 기반 파싱도 동작한다', () => {
    const html = `
      <html><body>
        <li class="prd_item">
          <a href="/store/goods/getGoodsDetail.do?goodsNo=I000000008">
            <span class="tx_brand">헤라</span>
            <span class="tx_name">블랙 쿠션</span>
          </a>
          <span class="tx_cur"><span class="tx_num">55,000</span></span>
        </li>
      </body></html>
    `;

    const result = parseProducts(html);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('블랙 쿠션');
    expect(result[0].brand).toBe('헤라');
  });

  it('data-original 속성에서 이미지 URL을 추출한다', () => {
    const html = `
      <div class="prd_info">
        <a href="/store/goods/getGoodsDetail.do?goodsNo=J000000009">
          <span class="tx_brand">라네즈</span>
          <span class="tx_name">워터뱅크 크림</span>
        </a>
        <span class="tx_cur"><span class="tx_num">32,000</span></span>
        <img data-original="https://image.oliveyoung.co.kr/lazy-loaded.jpg" src="blank.gif" />
      </div>
    `;

    const result = parseProducts(html);
    expect(result).toHaveLength(1);
    expect(result[0].imageUrl).toBe('https://image.oliveyoung.co.kr/lazy-loaded.jpg');
  });
});

describe('parseTotalPages', () => {
  it('페이지네이션이 없으면 1을 반환한다', () => {
    const html = '<html><body><div>No pagination</div></body></html>';
    expect(parseTotalPages(html)).toBe(1);
  });

  it('페이지네이션 영역에서 총 페이지 수를 추출한다', () => {
    const html = `
      <div class="pageing">
        <a href="#">1</a>
        <a href="#">2</a>
        <a href="#">3</a>
        <a href="#">4</a>
        <a href="#">5</a>
      </div>
    `;
    expect(parseTotalPages(html)).toBe(5);
  });

  it('totalPage 변수에서 총 페이지 수를 추출한다', () => {
    const html = `
      <script>
        var totalPage = 12;
      </script>
    `;
    expect(parseTotalPages(html)).toBe(12);
  });

  it('totalPages JSON 속성에서 총 페이지 수를 추출한다', () => {
    const html = `<script>var config = { "totalPages": 8 };</script>`;
    expect(parseTotalPages(html)).toBe(8);
  });
});
