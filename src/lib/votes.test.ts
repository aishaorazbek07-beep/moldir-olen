import { describe, expect, it } from 'vitest';
import { displayVotes, publicTeamView, withPercentages } from './votes';

describe('displayVotes', () => {
  it('складывает оплаченные голоса и корректировку', () => {
    expect(displayVotes(4218, 0)).toBe(4218);
    expect(displayVotes(4218, 100)).toBe(4318);
    expect(displayVotes(4218, -218)).toBe(4000);
  });

  it('никогда не уходит ниже нуля', () => {
    expect(displayVotes(10, -100)).toBe(0);
    expect(displayVotes(0, -1)).toBe(0);
  });
});

describe('publicTeamView', () => {
  const team = {
    id: 1,
    slug: 'almaty',
    name: 'Алматы облысы',
    placeLabel: '1-орын иегері',
    colorIndex: 1,
    paidVotes: 4218,
    adminAdjustment: 500,
  };

  it('отдаёт наружу только итоговое число голосов', () => {
    const view = publicTeamView(team);

    expect(view.votes).toBe(4718);
    expect(view).not.toHaveProperty('adminAdjustment');
    expect(view).not.toHaveProperty('paidVotes');
  });

  it('в отданном объекте нет ни одного ключа с разбивкой', () => {
    const keys = Object.keys(publicTeamView(team));
    expect(keys).toEqual(['id', 'slug', 'name', 'placeLabel', 'colorIndex', 'votes']);
  });
});

describe('withPercentages', () => {
  it('считает проценты и находит лидера', () => {
    const rows = withPercentages([
      { id: 1, slug: 'a', name: 'A', placeLabel: '', colorIndex: 1, votes: 50 },
      { id: 2, slug: 'b', name: 'B', placeLabel: '', colorIndex: 2, votes: 30 },
      { id: 3, slug: 'c', name: 'C', placeLabel: '', colorIndex: 3, votes: 20 },
    ]);

    expect(rows.map((r) => r.percent)).toEqual([50, 30, 20]);
    expect(rows.map((r) => r.isLeader)).toEqual([true, false, false]);
    expect(rows[0].fillPercent).toBe(80);
  });

  it('не делит на ноль, когда голосов ещё нет', () => {
    const rows = withPercentages([
      { id: 1, slug: 'a', name: 'A', placeLabel: '', colorIndex: 1, votes: 0 },
      { id: 2, slug: 'b', name: 'B', placeLabel: '', colorIndex: 2, votes: 0 },
    ]);

    expect(rows.every((r) => r.percent === 0)).toBe(true);
    expect(rows.every((r) => Number.isFinite(r.fillPercent))).toBe(true);
  });
});
