const vm=require('vm'); const _c={}; vm.runInNewContext(require('fs').readFileSync('./node_modules/d3/dist/d3.min.js','utf8'), _c); const d3=_c.d3;
const fs=require('fs'); const D=JSON.parse(fs.readFileSync('../data/raw.json','utf8'));
function fix(r){ const ring=r.concat([r[0]]); const a=d3.geoArea({type:"Polygon",coordinates:[ring]}); return a>2*Math.PI? ring.reverse(): ring; }
D.ice.forEach(s=>{ s.ring=fix(s.ring); console.log(s.id, d3.geoArea({type:"Polygon",coordinates:[s.ring]})*6371*6371/1e6,'M km2'); });
D.sahara=fix(D.sahara); console.log('sahara', d3.geoArea({type:"Polygon",coordinates:[D.sahara]})*6371*6371/1e6);
D.megachad=JSON.parse(fs.readFileSync('megachad.json','utf8'));
fs.writeFileSync('../data/paleo.json', JSON.stringify(D));
