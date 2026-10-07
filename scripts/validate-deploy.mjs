import fs from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// The upstream schema declares draft-04 but contains numeric exclusiveMinimum
// from draft-06+. Normalize draft-04 bounds to draft-07 without dropping rules.
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== 'object') return value;
  const result = Object.fromEntries(Object.entries(value).filter(([key]) => !(key === '$schema' && typeof value[key] === 'string')).map(([key,item]) => [key,normalize(item)]));
  for (const [exclusive,bound] of [['exclusiveMinimum','minimum'],['exclusiveMaximum','maximum']]) {
    if (typeof result[exclusive] === 'boolean') {
      if (result[exclusive]) { result[exclusive] = result[bound]; delete result[bound]; }
      else delete result[exclusive];
    }
  }
  return result;
}
const schema = normalize(JSON.parse(fs.readFileSync(new URL('../docs/schemas/vercel.schema.json',import.meta.url),'utf8')));
const ajv = new Ajv({strict:false,allErrors:true});
addFormats(ajv);
const validate = ajv.compile(schema);
const config = JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
if (!validate(config)) { console.error(validate.errors); process.exitCode = 1; }
else console.log('Vercel configuration matches the official schema.');
