import fs from 'node:fs/promises';
import path from 'node:path';

// PostgreSQL can deparse a cast of a varchar literal array as casts of each
// element after pg_dump/restore. Normalize only that exact, equivalent form.
export function normalizeArrayCast(sql) {
  return sql.replace(/\(\(ARRAY\[((?:'[^']*'::character varying)(?:, '[^']*'::character varying)*)\]\)::text\[\]\)/g,
    (_,values) => '(ARRAY[' + values.split(', ').map(value=>'('+value+')::text').join(', ') + '])');
}
export function compareInventories(source,target) {
  const normalize=(field,rows)=>rows.map(row=>{
    const value={...row};
    if(field==='objects'&&value.kind==='r'&&value.acl===`{${value.owner}=arwdDxtm/${value.owner}}`)value.acl=null;
    if(field==='objects'&&value.kind==='S'&&value.acl===`{${value.owner}=rwU/${value.owner}}`)value.acl=null;
    if(value.definition)value.definition=normalizeArrayCast(value.definition);
    if(value.indexdef)value.indexdef=normalizeArrayCast(value.indexdef);
    return JSON.stringify(value);
  }).sort();
  const fields=['schemas','objects','columns','constraints','indexes','functions','triggers','views','extensions','tables','sequences','migrations','defaultPrivileges','grants'];
  return fields.map(field=>({field,rawEqual:JSON.stringify(source[field])===JSON.stringify(target[field]),equal:JSON.stringify(normalize(field,source[field]))===JSON.stringify(normalize(field,target[field]))}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
  const folder=process.argv[2];
  const source=JSON.parse(await fs.readFile(path.join(folder,'source-inventory.json'),'utf8'));
  const target=JSON.parse(await fs.readFile(path.join(folder,'restored-inventory.json'),'utf8'));
  const comparison=compareInventories(source,target);
  await fs.writeFile(path.join(folder,'restore-semantic-comparison.json'),JSON.stringify(comparison,null,2));
  console.log(JSON.stringify(comparison));
  if(comparison.some(row=>!row.equal))process.exitCode=1;
}
