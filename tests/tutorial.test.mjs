import test from 'node:test';
import assert from 'node:assert/strict';
import {readTutorial,saveTutorial,tutorialStep} from '../dist/tutorial.mjs';
const store=value=>({value:JSON.stringify(value),getItem(){return this.value;},setItem(key,value){assert.equal(key,'sfbr-tutorial-v1');this.value=value;}});
test('tutorial migration keeps old progress at its corresponding workflow stage without restarting completed guides',()=>{
 for(const [oldStep,newStep] of [[0,0],[1,1],[2,2],[3,4],[4,6],[5,7],[6,8],[7,9]]){
 const storage=store({step:oldStep,done:oldStep===7,paused:true});const value=readTutorial(storage);
 assert.equal(value.step,newStep);assert.equal(value.done,oldStep===7);assert.equal(value.paused,true);
 saveTutorial(storage,value);assert.deepEqual(readTutorial(storage),value);
 }
});
test('new tutorial persists both AI and summary steps and clamps navigation to completion',()=>{
 for(const step of [3,5,9]){const storage=store(null);saveTutorial(storage,{step,paused:false,done:false});assert.equal(readTutorial(storage).step,step);}
 assert.equal(tutorialStep(0,-1),0);assert.equal(tutorialStep(8,1),9);assert.equal(tutorialStep(9,1),9);
 for(const value of [{step:8},{version:2,step:10},{step:-1},{step:'3'},null])assert.equal(readTutorial(store(value)),null);
});
