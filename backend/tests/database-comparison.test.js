import { it,expect } from 'vitest';
import { normalizeArrayCast,compareInventories } from '../../scripts/compare-database-inventories.mjs';

it('normalizes only equivalent varchar literal array casts',()=>{
  expect(normalizeArrayCast("CHECK (s = ANY ((ARRAY['A'::character varying, 'B'::character varying])::text[]))")).toBe("CHECK (s = ANY (ARRAY[('A'::character varying)::text, ('B'::character varying)::text]))");
  expect(normalizeArrayCast('CHECK (amount > 0)')).toBe('CHECK (amount > 0)');
});
it('does not mask data loss or changed constraints',()=>{
  const fields=['schemas','objects','columns','constraints','indexes','functions','triggers','views','extensions','tables','sequences','migrations','defaultPrivileges','grants'];
  const source=Object.fromEntries(fields.map(field=>[field,[]]));
  source.tables=[{name:'orders',count:'2',digest:'one'}];source.constraints=[{definition:'CHECK (amount > 0)'}];
  const target={...source,tables:[{name:'orders',count:'1',digest:'two'}],constraints:[{definition:'CHECK (amount >= 0)'}]};
  expect(compareInventories(source,target).filter(row=>!row.equal).map(row=>row.field)).toEqual(['constraints','tables']);
});

it('accepts owner-only default sequence ACL but preserves added grants',()=>{
  const fields=['schemas','objects','columns','constraints','indexes','functions','triggers','views','extensions','tables','sequences','migrations','defaultPrivileges','grants'];
  const source=Object.fromEntries(fields.map(field=>[field,[]]));
  source.objects=[{name:'seq',kind:'S',owner:'brinco_owner',acl:'{brinco_owner=rwU/brinco_owner}'}];
  const target={...source,objects:[{...source.objects[0],acl:null}]};
  expect(compareInventories(source,target).every(row=>row.equal)).toBe(true);
  target.objects[0].acl='{brinco_owner=rwU/brinco_owner,brinco_app=U/brinco_owner}';
  expect(compareInventories(source,target).find(row=>row.field==='objects').equal).toBe(false);
});
