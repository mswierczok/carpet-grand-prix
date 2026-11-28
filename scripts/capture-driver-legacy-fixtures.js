import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=process.argv.find(s=>s.startsWith('--source-root='))?.slice(14);
if(!root)throw Error('Provide --source-root pointing to unchanged PR56.');
const sourceCommit='d8c4d31cb7daacf594f24bbc08b367c601a4f03a',files=['racing/opponents.js','racing/race-session.js','racing/race-weekend.js','racing/qualifying-session.js','racing/qualifying-drivers.js','data/campaign-config.js'];
const hashes=Object.fromEntries(files.map(f=>{const bytes=readFileSync(root+'/src/'+f),original=execFileSync('git',['show',sourceCommit+':src/'+f]);if(!bytes.equals(original))throw Error('Modified source: '+f);return[f,createHash('sha256').update(bytes).digest('hex')];}));
const {loadArcade}=await import(pathToFileURL(root+'/tests/helpers/arcade.js').href),{api:A}=loadArcade({race:true});
const cases=[];
for(const qualifying of [false,true]){
 const weekend=qualifying?A.CampaignWeekend.create(A.Campaign.create({driverId:'d012',difficulty:'expert'})):A.RaceWeekend.create(A.TrackCatalog.get('bahrain'),{playerTeam:'t13',difficulty:'expert',performance:A.VehiclePerformance.campaign});
 if(qualifying)weekend.startQualifying();
 weekend.pause(false);for(let i=0;i<240;i++)weekend.advance({throttle:1,brake:0,steer:0},1/30);weekend.pause(true);
 const before=weekend.exportState();weekend.pause(false);for(let i=0;i<60;i++)weekend.advance({throttle:1,brake:0,steer:0},1/30);weekend.pause(true);
 cases.push({qualifying,before,after:weekend.exportState()});
}
mkdirSync('dist',{recursive:true});writeFileSync('dist/driver-pr56-legacy.json',JSON.stringify({sourceCommit,hashes,protocol:'Unchanged PR56; normal throttle, 8s then 2s, no pose/clock/result changes. Physics v1; race and flying-one-v1 qualifying retain previous team-ID AI.',cases})+'\n');
