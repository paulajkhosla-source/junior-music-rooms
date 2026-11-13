import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import PrintSheet from '../components/PrintSheet';
import WeekContext from '../components/WeekContext';
import { formatSelectedWeek } from './dates';

const november = formatSelectedWeek('2026-11-09');
const newYear = formatSelectedWeek('2025-12-29');

test('selected week banner shows the dated range and keeps a label secondary', () => {
  const html = renderToStaticMarkup(<WeekContext week={november} label="Concert week" />);
  assert.match(html, /SELECTED WEEK/);
  assert.match(html, /Monday 9 November – Friday 13 November 2026/);
  assert.match(html, /<p class="week-context-note">Concert week<\/p>/);
  assert.match(html, /week-context dated/);
  assert.equal(html.includes('Standard template'), false);
});

test('selected week banner omits a default-text label', () => {
  const html = renderToStaticMarkup(<WeekContext week={november} label="Autumn: Week beginning Monday, 9 November 2026" />);
  assert.match(html, /Monday 9 November – Friday 13 November 2026/);
  assert.doesNotMatch(html, /week-context-note|Week beginning/);
});

test('regular rota banner has no calendar dates', () => {
  const html = renderToStaticMarkup(<WeekContext week={null} />);
  assert.match(html, /REGULAR ROTA/);
  assert.match(html, /Standard template — no calendar dates/);
  assert.match(html, /week-context template/);
  assert.equal(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\d/.test(html), false);
});

test('print sheet dates each weekday for a selected week', () => {
  const html = renderToStaticMarkup(<PrintSheet cells={[]} title="JUNIOR MUSIC TEACHING ROOMS — Monday 9 November – Friday 13 November 2026" weekStart="2026-11-09" />);
  for (const heading of november.days.map(day => day.heading)) assert.match(html, new RegExp(heading));
  assert.equal(html.includes('Monday 9 November 2026'), false);
});

test('print sheet keeps a year-boundary day explicit', () => {
  const html = renderToStaticMarkup(<PrintSheet cells={[]} title="Year boundary" weekStart="2025-12-29" />);
  assert.match(html, /Thursday 1 January 2026/);
  assert.match(html, /Monday 29 December/);
  assert.equal(html.includes(newYear.days[3].heading), true);
});

test('template print sheet does not invent dates', () => {
  const html = renderToStaticMarkup(<PrintSheet cells={[]} title="JUNIOR MUSIC TEACHING ROOMS — Regular rota" />);
  const headings = [...html.matchAll(/<h2>(.*?)<\/h2>/g)].map(match => match[1]);
  assert.deepEqual(headings, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
});
