import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseRoom} from '../dist/room-prefix.mjs';
test('room correction removes only matching building/level prefixes and preserves identifier suffixes',()=>{
 for(const [room,expected] of [['E8-05-07','07'],['05-07','07'],['e8-05-007A','007A'],['E8-05-07-01','07-01'],['07','07'],['E9-05-07','E9-05-07'],['E8-06-07','E8-06-07'],['5-07','5-07'],['E8-05-','E8-05-'],['05-','05-']])assert.equal(normaliseRoom({building:'E8',floor:'05',room}),expected);
 assert.equal(normaliseRoom({building:'E8',floor:'',room:'E8-05-07'}),'E8-05-07');
 assert.equal(normaliseRoom({building:' E8 ',floor:' 05 ',room:' E8-05-007 '}),'007');
});
