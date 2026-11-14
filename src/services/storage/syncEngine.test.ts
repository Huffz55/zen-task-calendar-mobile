import { describe, it, expect } from 'vitest';
import { cleanUndefined, mergeItemsWithTombstones } from './syncEngine';

interface MockItem {
  id: string;
  title: string;
  updatedAt?: number;
}

describe('mobile syncEngine', () => {
  it('merges distinct local and remote items', () => {
    const local: MockItem[] = [{ id: '1', title: 'Local task', updatedAt: 100 }];
    const remote: MockItem[] = [{ id: '2', title: 'Remote task', updatedAt: 200 }];

    const merged = mergeItemsWithTombstones(local, remote, new Set());
    expect(merged).toHaveLength(2);
    expect(merged.map(i => i.id)).toEqual(['1', '2']);
  });

  it('prevents tombstone zombie resurrection even when remote updatedAt is newer', () => {
    const local: MockItem[] = [{ id: 'keep', title: 'Keep me', updatedAt: 100 }];
    const remote: MockItem[] = [
      { id: 'deleted-id', title: 'Ghost zombie', updatedAt: 9999 },
      { id: 'keep', title: 'Keep me updated', updatedAt: 500 },
    ];

    const merged = mergeItemsWithTombstones(local, remote, new Set(['deleted-id']));
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({ id: 'keep', title: 'Keep me updated', updatedAt: 500 });
  });

  it('applies Last-Write-Wins based on updatedAt', () => {
    const local: MockItem[] = [
      { id: 'x', title: 'Local newer', updatedAt: 300 },
      { id: 'y', title: 'Local older', updatedAt: 100 },
    ];
    const remote: MockItem[] = [
      { id: 'x', title: 'Remote older', updatedAt: 200 },
      { id: 'y', title: 'Remote newer', updatedAt: 400 },
    ];

    const merged = mergeItemsWithTombstones(local, remote, new Set());
    expect(merged).toEqual([
      { id: 'x', title: 'Local newer', updatedAt: 300 },
      { id: 'y', title: 'Remote newer', updatedAt: 400 },
    ]);
  });

  it('cleanUndefined strips undefined properties recursively', () => {
    const cleaned = cleanUndefined({
      id: '1',
      tag: undefined,
      nested: { a: 1, b: undefined },
    });

    expect('tag' in cleaned).toBe(false);
    expect('b' in cleaned.nested).toBe(false);
    expect(cleaned.nested.a).toBe(1);
  });
});
