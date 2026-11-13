import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { bookingBlocks, describeRanges } from './swaps';
test('booking blocks follow day, room and slot order',()=>{
 const cells=[['FRI','JS MP1','08:00'],['MON','JS MP2','08:00'],['MON','JS MP1','08:30'],['MON','JS MP1','08:00']].map(([day,room,slot])=>({day,room,slot,name:'A'}));
 assert.deepEqual(bookingBlocks(cells).map(b=>b.map(c=>`${c.day} ${c.room} ${c.slot}`)),[['MON JS MP1 08:00','MON JS MP1 08:30'],['MON JS MP2 08:00'],['FRI JS MP1 08:00']]);
});
test('describes dated contiguous ranges without joining gaps or lunch',()=>{
 const cells=['08:30','08:00','09:30'].map(slot=>({day:'TUE',room:'JS MP1',slot}));
 assert.deepEqual(describeRanges(cells,'2026-11-16'),['Tue 17 Nov · JS MP1 · 8.00–9.00','Tue 17 Nov · JS MP1 · 9.30–10.00']);
});
