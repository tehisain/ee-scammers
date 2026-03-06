import { describe, test, expect } from 'vitest';
import { summarySentence } from './summary';

describe('summarySentence', () => {
  test('Test 1: returns correct sentence for single complete month', () => {
    const result = summarySentence([
      { month: '2026-02', pensionEur: 49546839, scamEur: 1998685 }
    ]);
    expect(result).toBe('Petturid varastasid 4.0% veebruari 2026 pensionimaksetest');
  });

  test('Test 2: skips month with pensionEur=0, uses previous month', () => {
    const result = summarySentence([
      { month: '2026-03', pensionEur: 0, scamEur: 121368 },
      { month: '2026-02', pensionEur: 49546839, scamEur: 1998685 }
    ]);
    expect(result).toBe('Petturid varastasid 4.0% veebruari 2026 pensionimaksetest');
  });

  test('Test 3: returns null for empty array', () => {
    const result = summarySentence([]);
    expect(result).toBeNull();
  });

  test('Test 4: returns null when scamEur is null', () => {
    const result = summarySentence([
      { month: '2025-10', pensionEur: 48715725, scamEur: null }
    ]);
    expect(result).toBeNull();
  });
});
