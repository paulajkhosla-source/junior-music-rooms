import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { hiddenFromStaff, weekTitle } from './weeks';
import { bookingBlocks, requestValid } from './swaps';
test('week visibility uses the Sunday boundary and archive overrides',()=>{
 const week={start_date:'2026-03-23'};
 assert.equal(hiddenFromStaff(week,'2026-03-29'),false);
 assert.equal(hiddenFromStaff(week,'2026-03-30'),true);
 assert.equal(hiddenFromStaff(week,'2026-03-22'),false);
 assert.equal(hiddenFromStaff({...week,archived_at:'now'},'2026-03-23'),true);
 assert.equal(hiddenFromStaff({...week,restored_at:'now'},'2026-03-30'),false);
 assert.equal(hiddenFromStaff({...week,restored_at:'now',archived_at:'now'},'2026-03-30'),true);
});
test('booking blocks and request validity',()=>{
 const cells=[{day:'MON',room:'Room 1',slot:'09:00',name:'A'},{day:'MON',room:'Room 1',slot:'09:30',name:'A'},{day:'MON',room:'Room 1',slot:'10:30',name:'B'}];
 assert.deepEqual(bookingBlocks(cells).map(b=>b.length),[2,1]);
 assert.equal(requestValid([cells[0]],[cells[2]],'A','B',cells),true);
 assert.equal(requestValid([cells[0]],[cells[2]],'A','C',cells),false);
});

test('week titles avoid repeating default labels',()=>{
 const week={start_date:'2026-11-23'};
 const title='Week beginning Monday, 23 November 2026';
 assert.equal(weekTitle(week),title);
 assert.equal(weekTitle({...week,label:'  '}),title);
 assert.equal(weekTitle({...week,label:title.toUpperCase()}),title);
 assert.equal(weekTitle({...week,label:`Autumn: ${title}`}),title);
 assert.equal(weekTitle({...week,label:'Concert week'}),'Concert week · 23 November 2026');
});
