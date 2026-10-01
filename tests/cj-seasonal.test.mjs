import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {halloweenPartnerUrl}=require('../api/providers.js');
const tracked='https://www.anrdoezrs.net/click-123-456?url=https%3A%2F%2Fabracadabranyc.com%2F';

test('seasonal partner requires a safe tracked URL during October 2026',()=>{
  assert.equal(halloweenPartnerUrl(Date.parse('2026-10-15T12:00:00Z'),tracked),tracked);
  assert.equal(halloweenPartnerUrl(Date.parse('2026-09-30T23:59:59Z'),tracked),null);
  assert.equal(halloweenPartnerUrl(Date.parse('2026-11-01T00:00:00Z'),tracked),null);
  assert.equal(halloweenPartnerUrl(Date.parse('2026-10-15T12:00:00Z'),''),null);
  assert.equal(halloweenPartnerUrl(Date.parse('2026-10-15T12:00:00Z'),'http://example.com'),null);
  assert.equal(halloweenPartnerUrl(Date.parse('2026-10-15T12:00:00Z'),'https://user:pass@example.com'),null);
});
