import { describe,it,expect } from 'vitest';
import { resolveApiBase } from './apiBase.js';
describe('API base configuration',()=>{
  it('defaults to the same-origin API in development and production',()=>{expect(resolveApiBase(undefined,true)).toBe('/api/v1');expect(resolveApiBase()).toBe('/api/v1')});
  it('allows an explicit local development API',()=>expect(resolveApiBase('http://localhost:3000/api/v1')).toBe('http://localhost:3000/api/v1'));
  it.each(['http://localhost:3000/api/v1','https://localhost/api/v1','//evil.example/api',''])('rejects invalid production endpoint %s',value=>expect(()=>resolveApiBase(value,true)).toThrow());
});
