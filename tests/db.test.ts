import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { neon } from '@neondatabase/serverless';
const url=process.env.DATABASE_URL;
test('atomic swaps and archive protection', {skip:!url && 'DATABASE_URL is unset'}, async()=>{
 const sql=neon(url!); const marker='TEST archive-and-swap'; const a=marker+' A', b=marker+' B';
 const one=[{day:'MON',room:'JS MP1',slot:'08:00'}], two=[{day:'MON',room:'JS MP2',slot:'08:00'}];
 let week=0;
 const json=(value:unknown)=>JSON.stringify(value);
 try {
  const exists=await sql`SELECT id FROM weeks WHERE start_date='2099-03-02'`; if(exists.length) throw new Error('Test date already exists; refusing to overwrite');
  await sql`INSERT INTO teachers(name) VALUES(${a}),(${b})`;
  const rows=await sql`INSERT INTO weeks(start_date,label) VALUES('2099-03-02',${marker}) RETURNING id`; week=Number(rows[0].id);
  async function setup(){await sql`SELECT change_week_cells(${week},${marker},'admin','admin',${json(one)}::jsonb,${a})`;await sql`SELECT change_week_cells(${week},${marker},'admin','admin',${json(two)}::jsonb,${b})`;}
  async function propose(){await sql`SELECT propose_swap(${week},${a},${b},${json(one)}::jsonb,${json(two)}::jsonb,NULL)`;const r=await sql`SELECT id FROM swap_requests WHERE week_id=${week} AND status='pending' ORDER BY id DESC LIMIT 1`;return Number(r[0].id);}
  await setup(); let id=await propose(); await assert.rejects(propose());
  const results=await Promise.allSettled([sql`SELECT decide_swap_result(${id},${b},'staff','accept')`,sql`SELECT decide_swap_result(${id},${b},'staff','accept')`]); assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const cells=await sql`SELECT room,name FROM week_cells WHERE week_id=${week} ORDER BY room`; assert.deepEqual(cells.map(c=>c.name),[b,a]);
  await setup(); id=await propose(); await sql`SELECT change_week_cells(${week},${a},'staff','release',${json(one)}::jsonb,NULL)`;
  const expired=await sql`SELECT decide_swap_result(${id},${b},'staff','accept') AS result`; assert.match(String(expired[0].result),/changed/); assert.equal((await sql`SELECT status FROM swap_requests WHERE id=${id}`)[0].status,'expired');
  await setup(); id=await propose(); await sql`SELECT change_week_cells(${week},${a},'staff','release',${json(one)}::jsonb,NULL)`;
  await sql`SELECT decide_swap_result(${id},${b},'staff','decline')`; assert.equal((await sql`SELECT status FROM swap_requests WHERE id=${id}`)[0].status,'declined');
  await setup(); id=await propose(); await sql`UPDATE weeks SET start_date='2000-01-03', restored_at=NULL WHERE id=${week}`;
  const past=await sql`SELECT decide_swap_result(${id},${b},'staff','accept') AS result`; assert.match(String(past[0].result),/unavailable/); assert.equal((await sql`SELECT status FROM swap_requests WHERE id=${id}`)[0].status,'expired');
  await sql`UPDATE weeks SET start_date='2099-03-02' WHERE id=${week}`;
  await setup(); id=await propose();
  const race=await Promise.allSettled([sql`SELECT decide_swap_result(${id},${b},'staff','accept')`,sql`SELECT change_week_cells(${week},${marker},'staff','claim',${json(one)}::jsonb,NULL)`]);
  assert.equal(race[0].status,'fulfilled'); assert.equal(race[1].status,'rejected');
  const raceCells=await sql`SELECT name FROM week_cells WHERE week_id=${week} AND room IN ('JS MP1','JS MP2')`; assert.deepEqual(new Set(raceCells.map(c=>c.name)),new Set([a,b]));
  await setup(); id=await propose();
  const releaseRace=await Promise.allSettled([sql`SELECT decide_swap_result(${id},${b},'staff','accept')`,sql`SELECT change_week_cells(${week},${a},'staff','release',${json(one)}::jsonb,NULL)`]);
  const status=(await sql`SELECT status FROM swap_requests WHERE id=${id}`)[0].status;
  assert.ok(status==='accepted' || status==='expired');
  if(status==='accepted') assert.equal(releaseRace[1].status,'rejected');
  else assert.equal(releaseRace[1].status,'fulfilled');
  await setup(); id=await propose(); await sql`SELECT decide_swap_result(${id},${b},'staff','decline')`; id=await propose(); await sql`SELECT decide_swap_result(${id},${a},'staff','cancel')`;
  await sql`SELECT admin_swap(${week},${marker},${json(one)}::jsonb,${json(two)}::jsonb,${a},${b})`; await assert.rejects(sql`SELECT admin_swap(${week},${marker},${json(one)}::jsonb,${json(two)}::jsonb,${a},${b})`);
  await setup(); id=await propose(); await sql`SELECT set_week_archive(${week},${marker},true)`; const visibility=await sql`SELECT archived_at IS NOT NULL AS hidden FROM weeks WHERE id=${week}`; assert.equal(visibility[0].hidden,true); await assert.rejects(sql`SELECT change_week_cells(${week},${marker},'admin','admin',${json(one)}::jsonb,${b})`); const blocked=await sql`SELECT decide_swap_result(${id},${b},'staff','accept') AS result`; assert.match(String(blocked[0].result),/unavailable/);
 } finally { if(week) await sql`DELETE FROM weeks WHERE id=${week}`; await sql`DELETE FROM teachers WHERE name IN (${a},${b})`; await sql`DELETE FROM audit_log WHERE actor IN (${marker},${a},${b})`; }
});
