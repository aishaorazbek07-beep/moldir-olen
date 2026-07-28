import { describe, expect, it } from 'vitest';
import type { TeamRecord } from './content';
import {
  buildTeams,
  displayVotes,
  publicTeam,
  votesForAmount,
  withPercentages,
  type TeamCounts,
} from './votes';

const counts = (c: Partial<TeamCounts>): TeamCounts => ({
  claimed: 0,
  confirmed: 0,
  rejected: 0,
  adjustment: 0,
  ...c,
});

const team = (slug: string, over: Partial<TeamRecord> = {}): TeamRecord => ({
  id: 1,
  slug,
  name: slug,
  placeLabel: 'Финалист',
  colorIndex: 1,
  kaspiUrl: 'https://pay.kaspi.kz/pay/x',
  displayOrder: 1,
  isActive: true,
  ...over,
});

describe('displayVotes', () => {
  it('складывает заявленные и подтверждённые', () => {
    expect(displayVotes(counts({ claimed: 40, confirmed: 10 }))).toBe(50);
  });

  it('отклонённые не считаются — в этом весь смысл ручной сверки', () => {
    expect(displayVotes(counts({ claimed: 40, confirmed: 10, rejected: 100 }))).toBe(50);
  });

  it('учитывает корректировку в обе стороны', () => {
    expect(displayVotes(counts({ claimed: 40, adjustment: 60 }))).toBe(100);
    expect(displayVotes(counts({ claimed: 40, adjustment: -30 }))).toBe(10);
  });

  it('никогда не уходит ниже нуля', () => {
    expect(displayVotes(counts({ claimed: 10, adjustment: -999 }))).toBe(0);
  });
});

describe('publicTeam', () => {
  it('наружу уходит только итог, без разбивки', () => {
    const view = publicTeam(team('astana'), counts({ claimed: 10, confirmed: 5, adjustment: 2 }));

    expect(view.votes).toBe(17);
    expect(Object.keys(view)).toEqual([
      'slug',
      'name',
      'placeLabel',
      'colorIndex',
      'kaspiUrl',
      'votes',
    ]);
  });
});

describe('withPercentages', () => {
  const pub = (slug: string, votes: number) => ({
    slug,
    name: slug,
    placeLabel: '',
    colorIndex: 1,
    kaspiUrl: '',
    votes,
  });

  it('считает проценты и находит лидера', () => {
    const rows = withPercentages([pub('a', 60), pub('b', 40)]);

    expect(rows.map((r) => r.percent)).toEqual([60, 40]);
    expect(rows.map((r) => r.isLeader)).toEqual([true, false]);
    expect(rows[0].fillPercent).toBe(80);
  });

  it('при равном счёте лидера нет — две короны читались бы как ошибка', () => {
    const rows = withPercentages([pub('a', 50), pub('b', 50)]);
    expect(rows.every((r) => !r.isLeader)).toBe(true);
  });

  it('не делит на ноль, когда голосов ещё нет', () => {
    const rows = withPercentages([pub('a', 0), pub('b', 0)]);
    expect(rows.every((r) => r.percent === 0)).toBe(true);
    expect(rows.every((r) => Number.isFinite(r.fillPercent))).toBe(true);
  });
});

describe('buildTeams', () => {
  const teams = [team('astana', { id: 1 }), team('pavlodar', { id: 2, slug: 'pavlodar' })];

  it('показывает все города, даже без единой заявки', () => {
    const rows = buildTeams(teams, new Map());

    expect(rows.map((r) => r.slug)).toEqual(['astana', 'pavlodar']);
    expect(rows.every((r) => r.votes === 0)).toBe(true);
  });

  it('подставляет счётчики по слагу', () => {
    const rows = buildTeams(teams, new Map([['astana', counts({ claimed: 7 })]]));

    expect(rows.find((r) => r.slug === 'astana')!.votes).toBe(7);
    expect(rows.find((r) => r.slug === 'pavlodar')!.votes).toBe(0);
  });

  it('город без ссылки Kaspi всё равно показывается — но это видно по пустой ссылке', () => {
    const rows = buildTeams([team('pavlodar', { kaspiUrl: '' })], new Map());
    expect(rows[0].kaspiUrl).toBe('');
  });
});

describe('votesForAmount', () => {
  it('считает голоса по сумме', () => {
    expect(votesForAmount(500, 500)).toBe(1);
    expect(votesForAmount(5000, 500)).toBe(10);
    expect(votesForAmount(25_000, 500)).toBe(50);
  });

  it('остаток сверх целого голоса не округляется вверх', () => {
    expect(votesForAmount(999, 500)).toBe(1);
    expect(votesForAmount(1400, 500)).toBe(2);
  });

  it('сумма меньше цены голоса не даёт ничего', () => {
    expect(votesForAmount(499, 500)).toBe(0);
    expect(votesForAmount(0, 500)).toBe(0);
    expect(votesForAmount(Number.NaN, 500)).toBe(0);
  });

  it('нулевая цена не приводит к делению на ноль', () => {
    expect(votesForAmount(1000, 0)).toBe(0);
  });
});
