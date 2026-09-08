import { describe, expect, it } from 'vitest';
import { numberToVietnameseWords } from './number-to-words';

describe('numberToVietnameseWords', () => {
  it('handles negative or zero values', () => {
    expect(numberToVietnameseWords(-100n)).toBe('Số tiền không hợp lệ');
    expect(numberToVietnameseWords(0n)).toBe('Không đồng');
  });

  it('reads single digit numbers', () => {
    expect(numberToVietnameseWords(5n)).toBe('Năm đồng');
  });

  it('reads tens and teens correctly', () => {
    expect(numberToVietnameseWords(10n)).toBe('Mười đồng');
    expect(numberToVietnameseWords(11n)).toBe('Mười một đồng');
    expect(numberToVietnameseWords(15n)).toBe('Mười lăm đồng');
    expect(numberToVietnameseWords(21n)).toBe('Hai mươi mốt đồng');
    expect(numberToVietnameseWords(25n)).toBe('Hai mươi lăm đồng');
    expect(numberToVietnameseWords(50n)).toBe('Năm mươi đồng');
  });

  it('reads hundreds with linh and zeroes', () => {
    expect(numberToVietnameseWords(100n)).toBe('Một trăm đồng');
    expect(numberToVietnameseWords(105n)).toBe('Một trăm linh năm đồng');
    expect(numberToVietnameseWords(115n)).toBe('Một trăm mười lăm đồng');
    expect(numberToVietnameseWords(250n)).toBe('Hai trăm năm mươi đồng');
  });

  it('reads thousands and millions with proper group formatting', () => {
    expect(numberToVietnameseWords(1000n)).toBe('Một nghìn đồng');
    expect(numberToVietnameseWords(35000n)).toBe('Ba mươi lăm nghìn đồng');
    expect(numberToVietnameseWords(1750000n)).toBe('Một triệu bảy trăm năm mươi nghìn đồng');
    expect(numberToVietnameseWords(10000000n)).toBe('Mười triệu đồng');
  });

  it('reads complex realistic accounting amounts', () => {
    expect(numberToVietnameseWords(123456789n)).toBe(
      'Một trăm hai mươi ba triệu bốn trăm năm mươi sáu nghìn bảy trăm tám mươi chín đồng'
    );
    expect(numberToVietnameseWords(2000005n)).toBe('Hai triệu không trăm linh năm đồng');
  });
});

