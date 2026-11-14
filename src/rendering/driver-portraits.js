/* Composable transparent character art. No state writes, RNG or network. */
(() => {
 'use strict';
 const ink='#171f26', skin=['#f0c49d','#dca375','#bd825b','#925f41','#69452f','#e6b69b','#b77b65','#cd986c'], hairs=['#242429','#513b2f','#a86b35','#d9af58','#874935','#817b73','#d3c8af'];
 const helmetColors=['#e45846','#e5bd44','#51afb8','#6b83b6','#a8719e','#76a267','#e19249','#e4ded0'];
 const cache=new Map();
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const path=(d,fill,stroke=ink,width=3)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
 const ellipse=(x,y,rx,ry,fill,stroke=ink,w=3)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
 const hairShapes=[
 'M86 116Q73 57 116 49Q173 32 187 108L171 95L167 74Q124 89 91 87Z',
 'M82 117L74 84L89 79L83 61L104 64L115 39L132 54L153 38L160 58L181 60L175 80L189 91L180 118L166 90Q135 101 97 84Z',
 'M79 111Q59 90 76 78Q65 57 90 56Q86 31 112 39Q129 16 146 36Q173 26 178 48Q204 52 191 77Q211 94 182 113L174 91Q130 101 89 88Z',
 'M84 125Q59 97 81 60Q101 30 144 42Q196 43 190 112L172 127L169 80Q139 109 102 82L91 130Z',
 'M85 116Q78 55 121 46Q169 28 190 91L180 108L164 75Q122 91 93 88Z',
 'M84 116Q67 65 96 51L108 68Q139 32 174 49L179 64L191 84L181 119L167 82Q119 90 92 100Z',
 'M83 113L83 79Q129 40 177 71L182 111L171 94L164 77L99 80L94 112Z',
 'M82 126Q69 86 88 72L98 105L103 117L95 143ZM169 75Q193 79 187 133L174 144L171 111Z',
 'M83 113L80 81L93 57L114 64L137 41L153 56L177 56L189 95L177 113L167 81L106 86L94 105Z',
 'M87 114Q75 69 97 61L112 79Q149 49 178 69L185 103L173 113L164 86Q125 104 95 91Z',
 'M82 123Q67 100 87 69L100 78L96 115L90 141ZM165 78Q189 73 190 116L178 141L169 117Z',
 'M82 117L79 78Q89 50 118 52L106 68L133 58L149 35L156 52L177 49L172 66L187 74L180 112L166 85L99 88L94 119Z'];
 function vectorSVG(driver,team=null,size='large'){
  if(!driver?.id)return '';
  const p=globalThis.CGPDriverIdentities?.[driver.id];if(!p)return '';
  const key=[driver.id,team?.id,team?.color,team?.secondaryColor,size,driver.age].join(':');if(cache.has(key))return cache.get(key);
  const colors=globalThis.CGPRaceSprites?.teams[team?.id], main=colors?.body||'#566570',secondary=colors?.wing||'#ddd7c6',accent=colors?.accent||'#e6bc64';
  const tone=skin[p.skin],hair=hairs[p.hairColor], hw=[45,48,50,39,46,43,51,41][p.face],chin=[32,41,44,25,39,30,43,32][p.face],eyeY=117+p.eyes%3*2,eyeGap=19+p.eyes%3*3;
  const head=`M${134-hw} 89Q${132-hw-10} 72 130 66Q${139+hw+9} 65 ${136+hw} 103L${134+hw-4} 155Q${135+chin} 181 135 185Q${134-chin} 184 ${134-hw+6} 157Z`;
  const brow=p.eyes%2? -7:5, shoulder=8*p.shoulders, hc=helmetColors[p.helmet];
  let art=path(`M56 363L61 241Q${64-shoulder} 218 104 207L114 183L155 182L168 206Q${205+shoulder} 212 214 245L231 363Z`,main);
  art+=path('M112 181L112 209Q134 228 159 206L156 181',tone)+path('M105 202L133 217L164 201L168 216L138 235L103 216Z',secondary);
  art+=path('M68 231L88 226L87 322L68 353L55 345Z',secondary)+path('M180 224L199 232L217 337L200 349L177 293Z',secondary);
  art+=path('M93 231L105 235L103 355L88 355Z',accent,'none')+path('M166 234L174 232L184 355L170 355Z',accent,'none');
  art+=path('M163 220Q188 259 188 298L213 309L214 353L176 353L155 236Z','#162b36','none').replace('fill="#162b36"','fill="#162b36" opacity=".22"');
  art+=path('M72 236L81 233L78 282M97 304L114 301M162 310L174 315M177 327L194 320','none','#fff3d6',1.5).replace('fill="none"','fill="none" opacity=".4"');
  art+=path('M135 237L135 358','none','#172029',2)+path('M144 239L143 352','none','#fff5db',1);
  art+=`<text x="133" y="264" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="900" fill="${esc(accent)}">${esc((team?.name||'CARPET GP').split(' ')[0].toUpperCase().slice(0,12))}</text>`;
  art+=path('M111 274L133 267L155 274L146 291L123 291Z',secondary)+`<text x="133" y="285" text-anchor="middle" font-size="8" font-family="sans-serif" font-weight="bold" fill="${ink}">APEX LAB</text>`;
  // A country badge is independent of the facial phenotype.
  const flagStripes={IT:['#478158','#eee8da','#ba4c46'],FR:['#42699b','#eee8da','#ba4c46'],IE:['#498555','#eee8da','#d5964d'],MX:['#498555','#eee8da','#ba4c46'],NG:['#498555','#eee8da','#498555'],DE:['#27292d','#b94c46','#e4bf58'],HU:['#b94c46','#eee8da','#498555'],NL:['#b94c46','#eee8da','#42699b'],RU:['#eee8da','#42699b','#b94c46'],ID:['#b94c46','#eee8da'],PL:['#eee8da','#b94c46'],AT:['#b94c46','#eee8da','#b94c46'],UA:['#42699b','#e4bf58'],ES:['#b94c46','#e4bf58','#b94c46'],HR:['#b94c46','#eee8da','#42699b'],CO:['#e4bf58','#42699b','#b94c46'],EG:['#b94c46','#eee8da','#27292d'],IR:['#498555','#eee8da','#b94c46'],TH:['#b94c46','#eee8da','#42699b','#eee8da','#b94c46']};
  const vertical=['IT','FR','IE','MX','NG'].includes(driver.countryCode),stripes=flagStripes[driver.countryCode];let badge='';
  if(stripes)badge=stripes.map((c,i)=>`<rect x="${vertical?i*24/stripes.length:0}" y="${vertical?0:i*15/stripes.length}" width="${vertical?24/stripes.length:24}" height="${vertical?15:15/stripes.length}" fill="${c}"/>`).join('');
  else if(['SE','FI','DK','NO'].includes(driver.countryCode)){const bg={SE:'#42699b',FI:'#eee8da',DK:'#b94c46',NO:'#b94c46'}[driver.countryCode],cross={SE:'#e4bf58',FI:'#42699b',DK:'#eee8da',NO:'#eee8da'}[driver.countryCode];badge=`<rect width="24" height="15" fill="${bg}"/><path d="M8 0V15M0 7H24" stroke="${cross}" stroke-width="3"/>`;if(driver.countryCode==='NO')badge+='<path d="M8 0V15M0 7H24" stroke="#42699b" stroke-width="1.5"/>';}
  else if(driver.countryCode==='GB')badge='<rect width="24" height="15" fill="#42699b"/><path d="M0 0L24 15M24 0L0 15M12 0V15M0 7.5H24" stroke="#eee8da" stroke-width="3"/><path d="M12 0V15M0 7.5H24" stroke="#b94c46" stroke-width="1.7"/>';
  else if(driver.countryCode==='JP')badge='<rect width="24" height="15" fill="#eee8da"/><circle cx="12" cy="7.5" r="4" fill="#b94c46"/>';
  else if(driver.countryCode==='CH')badge='<rect width="24" height="15" fill="#b94c46"/><path d="M12 3V12M7.5 7.5H16.5" stroke="#eee8da" stroke-width="3"/>';
  else if(driver.countryCode==='CN')badge='<rect width="24" height="15" fill="#b94c46"/><path d="M5 2L6 5H9L6.5 7L7.5 10L5 8L2.5 10L3.5 7L1 5H4Z" fill="#e4bf58"/>';
  else {const colors={PT:['#498555','#b94c46'],BR:['#498555','#e4bf58'],GR:['#42699b','#eee8da'],US:['#b94c46','#eee8da'],KR:['#eee8da','#42699b'],TW:['#b94c46','#42699b'],ZA:['#498555','#e4bf58'],RW:['#42699b','#e4bf58'],CZ:['#eee8da','#b94c46']}[driver.countryCode]||['#ddd7c6','#536978'];badge=`<rect width="24" height="15" fill="${colors[0]}"/><rect y="9" width="24" height="6" fill="${colors[1]}"/>`;}
  art+=`<g transform="translate(66 246) rotate(-8)">${badge}<rect width="24" height="15" fill="none" stroke="${ink}"/><text y="25" font-size="7" font-family="sans-serif" fill="${ink}">${esc(driver.countryCode)}</text></g>`;
  art+=ellipse(134-hw-1,123,11,17,tone)+ellipse(134+hw,122,10,16,tone)+path(head,tone);
  art+=path(`M${136+hw-5} 101L${136+hw-7} 153Q155 182 135 182L136 166Q161 151 162 113Z`,'#573a34','none').replace('fill="#573a34"','fill="#573a34" opacity=".22"');
  art+=path(`M${110-hw/4} 99Q115 82 136 80`,'none','#ffe6c5',2);
  for(const side of [-1,1]){const x=135+side*eyeGap;art+=ellipse(x,eyeY,12,8+(p.eyes%3), '#fff6e6',ink,2);art+=ellipse(x+(p.mouth%3-1)*2,eyeY+1,3.5,5,'#253139','none');art+=ellipse(x+1,eyeY-1,1,1,'#fff','none');art+=path(`M${x-12} ${eyeY-14+side*brow}Q${x} ${eyeY-18} ${x+12} ${eyeY-14-side*brow}`,'none',hair,4+p.eyes%3);}
  if(p.eyes>=3)for(const side of [-1,1]){const x=135+side*eyeGap;art+=path(`M${x-12} ${eyeY-1}Q${x} ${eyeY-6+p.eyes} ${x+12} ${eyeY-2}`,tone,ink,1.5);}
  art+=path(`M135 119L${128-p.nose} ${141+p.nose}Q${139+p.nose*2} ${150+p.nose} ${146+p.nose} 138`,tone,ink,2.5);
  const mouths=['M116 158Q135 169 152 155','M119 161L151 160','M118 158Q137 154 151 161','M119 157Q135 176 152 157Z','M120 163Q137 166 148 158','M122 158L149 154','M119 162Q130 171 150 161'];art+=path(mouths[p.mouth],p.mouth===3?'#fff1da':'none',ink,2.5);
  if(p.beard===1)art+=path('M105 155Q132 174 166 151L155 175Q137 194 116 175Z',hair);
  if(p.beard===2)art+=path('M117 151Q128 141 135 148Q146 142 157 152L139 154L132 153Z',hair,'none');
  if(p.beard===3)art+=path('M125 169L147 168L141 181L129 179Z',hair,'none');
  if(p.beard===4)for(let i=0;i<17;i++){const x=108+i*3;art+=path(`M${x} ${167+Math.sin(i*.2)*6}l1 2`,'none',hair,1);}
  if(p.beard===5)art+=path('M103 148L118 163L136 169L158 159L168 146L161 173L144 185L123 180L110 168Z',hair);
  art+=path('M104 142L111 146M158 146L165 140M128 176Q136 180 143 175','none','#815841',1).replace('fill="none"','fill="none" opacity=".5"');
  if(p.detail===0)for(const x of [109,115,122,153,160])art+=ellipse(x,139+(x%3),1,1,'#8a5847','none');
  if(p.detail===1)art+=ellipse(157,148,1.5,1.5,'#5d463a','none');
  if(p.age>=35)art+=path('M104 106L118 103M151 102L164 105M118 85Q135 80 151 84','none','#906850',1.3);
  art+=path(hairShapes[p.hair],hair);
  if(p.hair===2){for(let i=0;i<7;i++)art+=path(`M${83+i*14} ${66+Math.sin(i)*8}q-9 -8 0 -13`,'none','#ffffff',1).replace('fill="none"','fill="none" opacity=".17"');}
  else art+=path('M97 73Q126 54 155 64M106 69Q130 59 144 61','none','#fff8e3',1.5).replace('fill="none"','fill="none" opacity=".22"');
  if(p.accessory===1)art+=path('M93 101Q135 85 176 101L176 111Q135 97 93 111Z',hc);
  if(p.accessory===2)art+=`<g fill="none" stroke="${ink}" stroke-width="3"><rect x="99" y="108" width="28" height="21" rx="7"/><rect x="143" y="108" width="29" height="21" rx="7"/><path d="M127 115Q135 110 143 115M91 110L99 113M172 113L181 109"/></g>`;
  if(p.accessory===3)art+=path('M94 88L100 74L126 77L127 88L102 91ZM140 77L168 71L173 84L145 90Z','#384c5e','#bc9258',3);
  if(p.accessory===4)art+=ellipse(180,135,4,6,'#e1be66',ink,1.5);
  if(p.accessory===5)art+=path('M81 94Q82 56 135 55Q184 52 186 88L167 91Q128 77 81 94ZM167 88L200 96L169 103Z',hc);
  // Personal helmet is invariant under transfers; the glove/sleeve belongs to the team.
  art+=`<g data-personal-helmet="${esc(driver.id)}" transform="translate(${p.pose===1?16:0} 0)">`+path('M68 300Q31 287 27 319L25 353L101 362L115 325Q96 306 68 300Z',hc)+path('M35 318L102 321L106 341L30 339Z','#253744')+path(p.helmetPattern%2?'M56 298L65 298L70 319L61 319ZM42 341L51 341L54 359L45 358Z':'M31 308L90 311L102 318L28 315ZM31 347L96 349L90 355L28 353Z',helmetColors[(p.helmet+3)%8],'none')+path('M37 324L62 325','none','#96bfc6',2)+`<text x="77" y="308" font-size="8" font-family="sans-serif" fill="${ink}">${esc(driver.id.slice(-3))}</text></g>`;
  art+=path(p.pose===2?'M190 291Q151 294 116 316L125 334Q175 329 207 316L211 303Z':'M194 277Q180 302 100 330L106 351Q179 343 214 311L211 293Z',main)+path('M102 329Q90 323 85 335L91 349L108 351L116 340Z',secondary);
  art+=path('M69 355L71 365L215 365L214 353Z','#24313a')+path('M126 354H144V366H126Z',accent);
  const result=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${size==='small'?'68 28 133 166':'0 20 270 355'}" width="270" height="355" role="img" aria-label="Porträt von ${esc(driver.name)}" data-driver-portrait="${esc(driver.id)}"><g stroke-linejoin="round">${art}</g></svg>`;
  if(cache.size>512)cache.clear();cache.set(key,result);return result;
 }
 function code(name){const words=String(name||'').trim().split(/\s+/),clean=(words.at(-1)||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z]/g,'').toUpperCase();return(clean.slice(0,3)||'???').padEnd(3,'X');}
 function uploaded(id){return globalThis.CGPUploadedPortraits?.[id]||null;}
 function svg(driver,team=null,size='large'){
  const art=uploaded(driver?.id);if(!art)return vectorSVG(driver,team,size);
  const color=/^#[\da-f]{3,8}$/i.test(team?.color||'')?team.color:'#536974';
  const box=size==='small'?'55 0 160 178':'0 0 270 355';
  const border=size==='small'?'<rect x="57" y="2" width="156" height="174" rx="6"':'<rect x="2" y="2" width="266" height="351" rx="8"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="270" height="355" role="img" aria-label="${esc(driver.name)} · ${esc(art.code)} · ${esc(driver.id)}" data-driver-portrait="${esc(driver.id)}" data-portrait-source="uploaded"><image href="${esc(art.src)}" x="0" y="0" width="270" height="338" preserveAspectRatio="xMidYMin meet"/>${size==='small'?'':`<rect x="3" y="328" width="264" height="25" rx="4" fill="${color}"/><text x="135" y="344" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="bold" fill="#fff" stroke="#17232c" stroke-width=".2">${esc(art.code)} · ${esc(team?.name||'VERTRAGSFREI')}</text>`}${border} fill="none" stroke="${color}" stroke-width="3"/></svg>`;
 }
 globalThis.CGPDriverPortraits=Object.freeze({svg,vectorSVG,uploaded,code,identity:id=>globalThis.CGPDriverIdentities?.[id],escape:esc});
})();
