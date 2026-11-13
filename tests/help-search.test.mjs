import test from 'node:test';
import assert from 'node:assert/strict';
import {helpMatches} from '../dist/help-search.mjs';
test('Help search matches case-insensitive terms across a section and handles empty queries',()=>{
 assert.equal(helpMatches('Create an API key. Connect your key in AI Settings.','  API   KEY '),true);
 assert.equal(helpMatches('Photographs and exports','photos key'),false);
 assert.equal(helpMatches('Selected photographs are sent to OpenAI.','OPENAI photographs'),true);
 assert.equal(helpMatches('Any section',''),true);
 assert.equal(helpMatches('API keys','ＡＰＩ'),true);
});
