import { describe, it, expect } from 'vitest';
import { categorizeReviews, extractKeywords, KOREAN_STOPWORDS } from '../index.js';

describe('categorizeReviews', () => {
  it('should return empty categories for empty reviews array', () => {
    const result = categorizeReviews([]);
    expect(result.byRating[1]).toEqual([]);
    expect(result.byRating[5]).toEqual([]);
    expect(result.bySkinType['건성']).toEqual([]);
    expect(result.byAgeGroup['20대']).toEqual([]);
  });

  it('should categorize reviews by rating correctly', () => {
    const reviews = [
      { productId: 'A1', rating: 5, nickname: 'user1', date: '2024-01-01', body: '좋아요' },
      { productId: 'A1', rating: 3, nickname: 'user2', date: '2024-01-02', body: '보통' },
      { productId: 'A1', rating: 5, nickname: 'user3', date: '2024-01-03', body: '최고' },
      { productId: 'A1', rating: 1, nickname: 'user4', date: '2024-01-04', body: '별로' },
    ];

    const result = categorizeReviews(reviews);
    expect(result.byRating[5]).toHaveLength(2);
    expect(result.byRating[3]).toHaveLength(1);
    expect(result.byRating[1]).toHaveLength(1);
    expect(result.byRating[2]).toHaveLength(0);
    expect(result.byRating[4]).toHaveLength(0);
  });

  it('should categorize reviews by skin type correctly', () => {
    const reviews = [
      { productId: 'A1', rating: 4, nickname: 'user1', date: '2024-01-01', body: '좋아요', skinType: '건성' },
      { productId: 'A1', rating: 5, nickname: 'user2', date: '2024-01-02', body: '최고', skinType: '지성' },
      { productId: 'A1', rating: 3, nickname: 'user3', date: '2024-01-03', body: '보통', skinType: '건성' },
      { productId: 'A1', rating: 4, nickname: 'user4', date: '2024-01-04', body: '괜찮아요' },
    ];

    const result = categorizeReviews(reviews);
    expect(result.bySkinType['건성']).toHaveLength(2);
    expect(result.bySkinType['지성']).toHaveLength(1);
    expect(result.bySkinType['복합성']).toHaveLength(0);
    expect(result.bySkinType['민감성']).toHaveLength(0);
    expect(result.bySkinType['중성']).toHaveLength(0);
  });

  it('should categorize reviews by age group correctly', () => {
    const reviews = [
      { productId: 'A1', rating: 4, nickname: 'user1', date: '2024-01-01', body: '좋아요', ageGroup: '20대' },
      { productId: 'A1', rating: 5, nickname: 'user2', date: '2024-01-02', body: '최고', ageGroup: '30대' },
      { productId: 'A1', rating: 3, nickname: 'user3', date: '2024-01-03', body: '보통', ageGroup: '20대' },
      { productId: 'A1', rating: 4, nickname: 'user4', date: '2024-01-04', body: '괜찮아요', ageGroup: '50대 이상' },
    ];

    const result = categorizeReviews(reviews);
    expect(result.byAgeGroup['20대']).toHaveLength(2);
    expect(result.byAgeGroup['30대']).toHaveLength(1);
    expect(result.byAgeGroup['50대 이상']).toHaveLength(1);
    expect(result.byAgeGroup['10대']).toHaveLength(0);
    expect(result.byAgeGroup['40대']).toHaveLength(0);
  });

  it('should ignore reviews with invalid ratings (0 or > 5)', () => {
    const reviews = [
      { productId: 'A1', rating: 0, nickname: 'user1', date: '2024-01-01', body: '테스트' },
      { productId: 'A1', rating: 6, nickname: 'user2', date: '2024-01-02', body: '테스트' },
      { productId: 'A1', rating: -1, nickname: 'user3', date: '2024-01-03', body: '테스트' },
    ];

    const result = categorizeReviews(reviews);
    for (let i = 1; i <= 5; i++) {
      expect(result.byRating[i]).toHaveLength(0);
    }
  });

  it('should ignore reviews with unknown skin types', () => {
    const reviews = [
      { productId: 'A1', rating: 4, nickname: 'user1', date: '2024-01-01', body: '테스트', skinType: '알수없음' },
    ];

    const result = categorizeReviews(reviews);
    expect(result.bySkinType['건성']).toHaveLength(0);
    expect(result.bySkinType['지성']).toHaveLength(0);
    expect(result.bySkinType['복합성']).toHaveLength(0);
    expect(result.bySkinType['민감성']).toHaveLength(0);
    expect(result.bySkinType['중성']).toHaveLength(0);
  });
});

describe('extractKeywords', () => {
  it('should return empty array for empty reviews', () => {
    const result = extractKeywords([]);
    expect(result).toEqual([]);
  });

  it('should return empty array for reviews with no body', () => {
    const reviews = [
      { productId: 'A1', rating: 5, nickname: 'user1', date: '2024-01-01', body: '' },
    ];
    const result = extractKeywords(reviews);
    expect(result).toEqual([]);
  });

  it('should extract keywords and sort by count descending', () => {
    const reviews = [
      { productId: 'A1', rating: 5, nickname: 'user1', date: '2024-01-01', body: '보습력 좋고 촉촉해요 보습력 최고' },
      { productId: 'A1', rating: 4, nickname: 'user2', date: '2024-01-02', body: '보습력 좋아요 촉촉해요' },
    ];

    const result = extractKeywords(reviews);
    expect(result.length).toBeGreaterThan(0);
    // 보습력 appears 3 times, should be first
    expect(result[0].word).toBe('보습력');
    expect(result[0].count).toBe(3);
    expect(result[0].weight).toBe(1);
  });

  it('should filter out stopwords', () => {
    const reviews = [
      { productId: 'A1', rating: 5, nickname: 'user1', date: '2024-01-01', body: '그리고 하지만 그래서 보습력 좋아요' },
    ];

    const result = extractKeywords(reviews);
    const words = result.map(k => k.word);
    expect(words).not.toContain('그리고');
    expect(words).not.toContain('하지만');
    expect(words).not.toContain('그래서');
  });

  it('should filter out words shorter than 2 characters', () => {
    const reviews = [
      { productId: 'A1', rating: 5, nickname: 'user1', date: '2024-01-01', body: '아 좋 보습력 촉촉해요' },
    ];

    const result = extractKeywords(reviews);
    for (const keyword of result) {
      expect(keyword.word.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('should normalize weights between 0 and 1', () => {
    const reviews = [
      { productId: 'A1', rating: 5, nickname: 'user1', date: '2024-01-01', body: '보습력 보습력 보습력 촉촉해요 촉촉해요 향기' },
    ];

    const result = extractKeywords(reviews);
    // First keyword (highest count) should have weight 1
    expect(result[0].weight).toBe(1);
    // All weights should be between 0 and 1
    for (const keyword of result) {
      expect(keyword.weight).toBeGreaterThan(0);
      expect(keyword.weight).toBeLessThanOrEqual(1);
    }
  });

  it('should return at most 30 keywords', () => {
    // Generate reviews with many unique words
    const words = Array.from({ length: 50 }, (_, i) => `키워드${i}번째단어`);
    const reviews = [
      { productId: 'A1', rating: 5, nickname: 'user1', date: '2024-01-01', body: words.join(' ') },
    ];

    const result = extractKeywords(reviews);
    expect(result.length).toBeLessThanOrEqual(30);
  });

  it('should handle reviews with only stopwords', () => {
    const reviews = [
      { productId: 'A1', rating: 5, nickname: 'user1', date: '2024-01-01', body: '그리고 하지만 그래서 또한' },
    ];

    const result = extractKeywords(reviews);
    expect(result).toEqual([]);
  });

  it('should strip special characters from words', () => {
    const reviews = [
      { productId: 'A1', rating: 5, nickname: 'user1', date: '2024-01-01', body: '보습력!! 보습력... 보습력?' },
    ];

    const result = extractKeywords(reviews);
    expect(result[0].word).toBe('보습력');
    expect(result[0].count).toBe(3);
  });
});
