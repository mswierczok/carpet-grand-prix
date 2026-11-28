// New reference only, from an unchanged committed V2 engine. Never overwrite an
// existing checked-in fixture to hide a regression.
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';
import{pathToFileURL}from'node:url';
const opt=k=>process.argv.find(a=>a.startsWith(k+'='))?.slice(k.length+1),root=opt('--source-root'),sourceCommit=opt('--source-commit');
if(!root||!sourceCommit)throw Error('Provide an unchanged committed source root/commit');
const files=['racing/vehicle-performance.js','racing/physics.js','racing/race-session.js','racing/race-weekend.js','racing/qualifying-session.js','racing/qualifying-approach.js','racing/opponents.js','racing/driver-personalities.js','championship/campaign-weekend.js'];
const hashes=Object.fromEntries(files.map(f=>{const bytes=readFileSync(root+'/src/'+f),original=execFileSync('git',['show',sourceCommit+':src/'+f]);if(!bytes.equals(original))throw Error('Modified reference source: '+f);return[f,createHash('sha256').update(bytes).digest('hex')];}));
const{loadArcade}=await import(pathToFileURL(root+'/tests/helpers/arcade.js').href),{api:A}=loadArcade({race:true}),cases=[];
for(const qualifying of[false,true]){const game=A.Campaign.create({driverId:'d035',difficulty:'expert'}),w=A.RaceWeekend.create(A.TrackCatalog.get('bahrain'),{playerTeam:'t13',difficulty:'expert',performance:{version:2,context:'campaign'},driving:A.DriverPersonalities.create(game.lineup,4171),diagnostics:true});
 if(qualifying)w.startQualifying();else w.pause(false);for(let i=0;i<240;i++)w.advance({throttle:1,brake:0,steer:0},1/30);w.pause(true);const before=w.exportState();w.pause(false);
 for(let i=0;i<60;i++)w.advance({throttle:1,brake:0,steer:0},1/30);w.pause(true);cases.push({qualifying,before,after:w.exportState()});
}
mkdirSync('dist/vehicle-balance',{recursive:true});writeFileSync('dist/vehicle-balance/v2-checkpoints.json',JSON.stringify({sourceCommit,hashes,protocol:'Unchanged committed V2 engine, driver model3/seed4171, native 13-car race/isolated one-lap qualifying; normal throttle8s then2s. No pose/speed/time/result edits.',cases})+'\n');
