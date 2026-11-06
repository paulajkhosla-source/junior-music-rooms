import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dateLabel } from './constants';
import { addCivilDays, formatSelectedWeek, mondayOf, weekdayDate } from './dates';

const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

describe('selected week dates', () => {
  test('labels the week of 9 November 2026 in British form', () => {
    const week = formatSelectedWeek('2026-11-09');
    assert.deepEqual(week.days.map(day => day.iso), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
    assert.deepEqual(week.days.map(day => day.heading), [
      'Monday 9 November',
      'Tuesday 10 November',
      'Wednesday 11 November',
      'Thursday 12 November',
      'Friday 13 November',
    ]);
    assert.equal(week.range, 'Monday 9 November – Friday 13 November 2026');
    assert.equal(week.days[0].heading.includes(','), false);
    assert.equal(week.days[0].dateLabel, '9 November');
  });

  test('crosses a month boundary', () => {
    const week = formatSelectedWeek('2026-11-30');
    assert.deepEqual(week.days.map(day => day.iso), ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04']);
    assert.equal(week.days[0].heading, 'Monday 30 November');
    assert.equal(week.days[1].heading, 'Tuesday 1 December');
    assert.equal(week.days[4].heading, 'Friday 4 December');
    assert.equal(week.range, 'Monday 30 November – Friday 4 December 2026');
  });

  test('crosses a year boundary and keeps the new year on those days', () => {
    assert.equal(new Date(Date.UTC(2025, 11, 29)).getUTCDay(), 1);
    const week = formatSelectedWeek('2025-12-29');
    assert.deepEqual(week.days.map(day => day.iso), ['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']);
    assert.equal(week.days[0].heading, 'Monday 29 December');
    assert.equal(week.days[2].heading, 'Wednesday 31 December');
    assert.equal(week.days[3].heading, 'Thursday 1 January 2026');
    assert.equal(week.days[4].heading, 'Friday 2 January 2026');
    assert.equal(week.range, 'Monday 29 December 2025 – Friday 2 January 2026');
  });

  test('crosses a leap day', () => {
    const week = formatSelectedWeek('2024-02-26');
    assert.equal(week.days[3].iso, '2024-02-29');
    assert.equal(week.days[3].heading, 'Thursday 29 February');
    assert.equal(week.days[4].iso, '2024-03-01');
    assert.equal(week.days[4].heading, 'Friday 1 March');
  });

  test('stays on the civil date across the London daylight-saving changes', () => {
    assert.equal(formatSelectedWeek('2026-03-30').days[0].heading, 'Monday 30 March');
    assert.equal(formatSelectedWeek('2026-10-26').days[0].heading, 'Monday 26 October');
    assert.equal(weekdayDate('2026-03-30', 'FRI'), '2026-04-03');
  });

  test('treats a mid-week date as that week’s Monday', () => {
    assert.equal(mondayOf('2026-11-11'), '2026-11-09');
    assert.equal(mondayOf('2026-11-09'), '2026-11-09');
    assert.equal(weekdayDate('2026-11-13', 'MON'), '2026-11-09');
    assert.equal(formatSelectedWeek('2026-11-11').days[0].heading, 'Monday 9 November');
  });

  test('weekday names follow the dates, in order', () => {
    for (const start of ['2026-11-09', '2026-11-30', '2025-12-29', '2024-02-26']) {
      const week = formatSelectedWeek(start);
      week.days.forEach((day, index) => {
        assert.equal(day.heading.startsWith(weekdayNames[index]), true, day.heading);
        if (index > 0) assert.equal(day.iso, addCivilDays(week.days[0].iso, index));
      });
    }
  });

  test('rejects dates that are not a real calendar day', () => {
    assert.throws(() => formatSelectedWeek('2025-02-29'), /Invalid date/);
    assert.throws(() => formatSelectedWeek('2026-11-09T00:00:00Z'), /Invalid date/);
    assert.throws(() => addCivilDays('09-11-2026', 1), /Invalid date/);
  });

  test('existing week labels stay on the London civil date', () => {
    assert.equal(dateLabel('2026-11-09'), 'Monday, 9 November 2026');
    assert.equal(dateLabel('2026-11-09', false), '9 November 2026');
    assert.equal(dateLabel('2026-01-01', false), '1 January 2026');
  });
});

test('formatting does not follow the machine timezone', () => {
  if (process.env.DATE_TZ_CHILD) return;
  const file = fileURLToPath(new URL('./dates.test.ts', import.meta.url));
  for (const TZ of ['Pacific/Kiritimati', 'Pacific/Honolulu', 'Europe/London', 'UTC']) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', file], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env: { ...process.env, TZ, DATE_TZ_CHILD: '1' },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${TZ}\n${result.stdout}\n${result.stderr}`);
  }
});
