import test from 'node:test';
import assert from 'node:assert/strict';
import {cropBounds,fitImage} from '../dist/photo-editor.mjs';
test('crop normalises reverse drags and clamps to image bounds',()=>{assert.deepEqual(cropBounds({x:90,y:80},{x:10,y:20},100,100),{x:10,y:20,width:80,height:60});assert.deepEqual(cropBounds({x:-10,y:-30},{x:200,y:180},100,80),{x:0,y:0,width:100,height:80});assert.deepEqual(cropBounds({x:10,y:20},{x:10,y:20},100,100),{x:10,y:20,width:0,height:0});});
test('working image retains aspect ratio without upscaling',()=>{assert.deepEqual(fitImage(4800,3200),{width:2400,height:1600});assert.deepEqual(fitImage(800,1200),{width:800,height:1200});assert.deepEqual(fitImage(1600,4800),{width:800,height:2400});});
