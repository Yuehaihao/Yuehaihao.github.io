import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultLevels, topPercentage } from '../src/defaults';
test('six default stages match the reference', () => { const levels=createDefaultLevels(); assert.deepEqual(levels.map(l=>l.value),[108,101,94,61,50,40]); assert.deepEqual(levels.map(l=>l.label),['赠送客户数','任务开启客户数','获得分发客户数','分发后接管客户数','接管后发A客户数','发AB客户数']); });
test('every rate uses the first stage, including zero and changed first-stage values', () => { assert.deepEqual([108,101,94,61,50,40].map(v=>topPercentage(v,108)),['100%','93.5%','87%','56.5%','46.3%','37%']); assert.equal(topPercentage(50,100),'50%'); assert.equal(topPercentage(0,108),'0%'); assert.equal(topPercentage(40,0),'—'); });
