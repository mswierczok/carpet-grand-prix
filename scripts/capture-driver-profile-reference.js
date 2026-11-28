// Record an immutable, already committed driver engine, never overwrite a
// checked-in reference. Compare actual native follow-up states, not guessed times.
import{readFileSync,writeFileSync,mkdirSync,existsSync}from'node:fs';
import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';
import{pathToFileURL}from'node:url';
const opt=k=>process.argv.find(a=>a.startsWith(k+'='))?.slice(k.length+1),root=opt('--source-root'),sourceCommit=opt('--source-commit');
if(!root||!sourceCommit)throw Error('Provide an unchanged committed source root and source commit.');
const files=['data/driver-attributes.js','racing/driver-personalities.js','racing/obstacle-avoidance.js','racing/opponents.js','racing/race-session.js','racing/race-weekend.js','championship/campaign-weekend.js'].filter(f=>existsSync(root+'/src/'+f));
const hashes=Object.fromEntries(files.map(f=>{const bytes=readFileSync(root+'/src/'+f),original=execFileSync('git',['show',sourceCommit+':src/'+f]);if(!bytes.equals(original))throw Error('Modified source: '+f);return[f,createHash('sha256').update(bytes).digest('hex')];}));
const{loadArcade}=await import(pathToFileURL(root+'/tests/helpers/arcade.js').href),{api:A}=loadArcade({race:true}),cases=[];
for(const qualifying of[false,true]){
 const g=A.Campaign.create({driverId:'d012',difficulty:'expert'}),driving=A.DriverPersonalities.create(g.lineup,4171),w=A.RaceWeekend.create(A.TrackCatalog.get('bahrain'),{playerTeam:'t13',difficulty:'expert',performance:A.VehiclePerformance.campaign,driving,diagnostics:true});
 if(qualifying)w.startQualifying();else w.pause(false);
 for(let n=0;n<240;n++)w.advance({throttle:1,brake:0,steer:0},1/30);w.pause(true);const before=w.exportState();w.pause(false);
 for(let n=0;n<60;n++)w.advance({throttle:1,brake:0,steer:0},1/30);w.pause(true);cases.push({qualifying,before,after:w.exportState()});
}
mkdirSync('dist',{recursive:true});writeFileSync(`dist/driver-v${A.DriverPersonalities.version}-checkpoints.json`,JSON.stringify({sourceCommit,hashes,driverModel:A.DriverPersonalities.version,protocol:'Native driver model, seed4171; real native race/qualifying, ordinary throttle 8s then2s, 13 vehicles. No pose, clock or result assignments.',cases})+'\n');
