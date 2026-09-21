import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd(); const p=path.join(root,'assets/pixel-bloom/system/manifests/asset-registry.v1.json'); const reg=JSON.parse(fs.readFileSync(p,'utf8')); const assets={}; for(const a of reg.assets)assets[a.id]={path:a.path,kind:a.kind,role:a.role,status:a.status}; fs.writeFileSync(path.join(root,'assets/pixel-bloom/system/manifests/asset-index.v1.json'),JSON.stringify({schemaVersion:1,theme:'pixel-bloom',assets},null,2)+'\n'); console.log(`Indexed ${Object.keys(assets).length} assets.`)
