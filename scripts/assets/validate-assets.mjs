import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd(); const reg=JSON.parse(fs.readFileSync(path.join(root,'assets/pixel-bloom/system/manifests/asset-registry.v1.json'),'utf8')); const errors=[]; const ids=new Set(); for(const a of reg.assets){if(ids.has(a.id))errors.push(`duplicate ${a.id}`);ids.add(a.id);if(a.status==='runtime-ready'&&!fs.existsSync(path.join(root,a.path)))errors.push(`missing ${a.path}`);} if(errors.length){console.error(errors.join('\n'));process.exit(1)} console.log(`Asset validation passed: ${reg.assets.length} runtime assets.`)
