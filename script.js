(()=>{
const $=id=>document.getElementById(id);
const cv=$('cv'),g=cv.getContext('2d');
const audio=new Audio();audio.preload='auto';
let ac,an,freq,wave,started=false;
let tracks=[],bench=[],idx=-1,rep=0;
let W=0,H=0,dpr=1;
const P={sens:.5,part:150,blur:0}; // sens: 表示値1.0 = 内部0.5
const lv={bass:0,mid:0,high:0};

/* ---------- toast ---------- */
let tt;
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),3200)}

/* ---------- resize / hi-dpi ---------- */
function resize(){
  dpr=Math.min(window.devicePixelRatio||1,3);
  W=innerWidth;H=innerHeight;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle='#05060f';g.fillRect(0,0,W,H);
}
addEventListener('resize',resize);resize();

/* ---------- audio init ---------- */
function initAudio(){
  if(!ac){
    const AC=window.AudioContext||window.webkitAudioContext;
    ac=new AC();
    const src=ac.createMediaElementSource(audio);
    an=ac.createAnalyser();an.fftSize=2048;an.smoothingTimeConstant=.82;
    src.connect(an);an.connect(ac.destination);
    freq=new Uint8Array(an.frequencyBinCount);wave=new Uint8Array(an.fftSize);
  }
  if(ac.state==='suspended')return ac.resume();
}
$('goBtn').onclick=async()=>{
  try{await initAudio()}catch(e){}
  started=true;$('start').style.display='none';kick();
};

/* ---------- playlist ---------- */
const OK=/\.(mp3|wav|m4a|aac|flac|ogg)$/i;
function addFiles(fl){
  let added=0,bad=0;
  for(const f of fl){
    if(OK.test(f.name)||(f.type&&f.type.startsWith('audio/'))){tracks.push({name:f.name.replace(/\.[^.]+$/,''),url:URL.createObjectURL(f)});added++}
    else bad++;
  }
  if(bad)toast('再生できないファイル形式です');
  renderList();
  if(added&&idx<0)load(tracks.length-added,true);
}
function load(i,play){
  if(i<0||i>=tracks.length)return;
  idx=i;audio.src=tracks[i].url;audio.loop=(rep===1);
  $('title').textContent=tracks[i].name;renderList();
  if(play)playNow();
}
async function playNow(){
  if(idx<0){$('file').click();return}
  try{await initAudio();await audio.play()}catch(e){if(e&&e.name!=='AbortError')toast('再生できないファイル形式です')}
}
audio.addEventListener('error',()=>{
  if(idx<0)return;
  toast('再生できないファイル形式です');
  const bad=idx;URL.revokeObjectURL(tracks[bad].url);tracks.splice(bad,1);
  audio.removeAttribute('src');idx=-1;$('title').textContent='曲が読み込まれていません';
  renderList();
  if(tracks.length)load(Math.min(bad,tracks.length-1),false);
});
audio.addEventListener('ended',()=>{
  if(idx<tracks.length-1)load(idx+1,true);
  else if(rep===2)load(0,true);
});
audio.addEventListener('play',()=>$('bPlay').textContent='⏸');
audio.addEventListener('pause',()=>$('bPlay').textContent='▶');
function step(d){
  if(!tracks.length)return;
  let n=idx+d;
  if(n<0)n=rep===2?tracks.length-1:0;
  if(n>=tracks.length)n=rep===2?0:tracks.length-1;
  load(n,!audio.paused||d!==0);
}
function removeAt(i,toBench){
  const t=tracks.splice(i,1)[0];
  if(toBench)bench.push(t);else URL.revokeObjectURL(t.url);
  if(i===idx){
    const was=!audio.paused;
    if(tracks.length)load(Math.min(i,tracks.length-1),was);
    else{idx=-1;audio.pause();audio.removeAttribute('src');audio.load();$('title').textContent='曲が読み込まれていません'}
  }else if(i<idx)idx--;
  renderList();
}
function restore(i){
  tracks.push(bench.splice(i,1)[0]);
  if(idx<0)load(tracks.length-1,false);
  renderList();
}
function delBench(i){URL.revokeObjectURL(bench.splice(i,1)[0].url);renderList()}
function row(t,cur,actions){
  const li=document.createElement('li');if(cur)li.className='cur';
  const nm=document.createElement('span');nm.className='nm';nm.textContent=(cur?'♪ ':'')+t.name;li.appendChild(nm);
  const box=document.createElement('span');box.className='acts';
  for(const [label,title,fn] of actions){
    const b=document.createElement('button');b.textContent=label;b.title=title;b.setAttribute('aria-label',title);
    b.onclick=e=>{e.stopPropagation();fn()};box.appendChild(b);
  }
  li.appendChild(box);return li;
}
function renderList(){
  const ul=$('ul'),ub=$('ub');ul.innerHTML='';ub.innerHTML='';
  if(!tracks.length){const d=document.createElement('li');d.className='empty';d.textContent='プレイリストは空です。音声ファイルをドロップして追加してください。';ul.appendChild(d)}
  tracks.forEach((t,i)=>{
    const li=row(t,i===idx,[['待機','待機リストへ移動',()=>removeAt(i,true)],['✕','削除',()=>removeAt(i,false)]]);
    li.onclick=()=>load(i,true);ul.appendChild(li);
  });
  $('benchBox').hidden=!bench.length;
  bench.forEach((t,i)=>ub.appendChild(row(t,false,[['戻す','プレイリストに戻す',()=>restore(i)],['✕','削除',()=>delBench(i)]])));
}
renderList();

/* ---------- controls ---------- */
$('bPlay').onclick=()=>{audio.paused?playNow():audio.pause()};
$('bStop').onclick=()=>{audio.pause();audio.currentTime=0};
$('bNext').onclick=()=>step(1);
$('bPrev').onclick=()=>{if(audio.currentTime>3)audio.currentTime=0;else step(-1)};
$('bRep').onclick=()=>{
  rep=(rep+1)%3;audio.loop=(rep===1);
  $('bRep').textContent=['リピート OFF','1曲リピート','全曲リピート'][rep];
  $('bRep').classList.toggle('on',rep>0);
};
$('bAdd').onclick=()=>$('file').click();
$('file').onchange=e=>{addFiles(e.target.files);e.target.value=''};
$('bFull').onclick=()=>{
  if(document.fullscreenElement)document.exitFullscreen();
  else (document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen||(()=>toast('このブラウザはフルスクリーンに対応していません')))
    .call(document.documentElement);
};
audio.volume=.8;
$('vol').oninput=e=>audio.volume=e.target.value/100;
let seeking=false;
$('seek').addEventListener('input',()=>{seeking=true;if(audio.duration)audio.currentTime=$('seek').value/1000*audio.duration});
$('seek').addEventListener('change',()=>seeking=false);
const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
setInterval(()=>{
  $('time').textContent=fmt(audio.currentTime)+' / '+fmt(audio.duration);
  if(!seeking&&audio.duration)$('seek').value=audio.currentTime/audio.duration*1000;
},250);
addEventListener('keydown',e=>{
  if(e.code==='Space'&&e.target.tagName!=='BUTTON'&&started){e.preventDefault();$('bPlay').click()}
});

/* params */
$('sens').oninput=e=>{P.sens=e.target.value/200;$('vSens').textContent=(e.target.value/100).toFixed(1)};
$('part').oninput=e=>{P.part=+e.target.value;$('vPart').textContent=P.part};
$('blur').oninput=e=>{P.blur=+e.target.value;$('vBlur').textContent=P.blur;applyBlur()};
function applyBlur(){cv.style.filter=(P.blur===0)?'none':`blur(${P.blur}px) saturate(1.2)`}

/* customize */
const PAL={Midnight:['#ff2e93','#8a3cff','#27e1ff'],Sunset:['#ff5e3a','#ff2e93','#ffd166'],Ocean:['#00c2ff','#3a5bff','#7af0d0'],Emerald:['#2effa0','#00a86b','#d4ff7a'],Violet:['#c06bff','#5b3cff','#ff8ad8'],Mono:['#ffffff','#9aa0b4','#e6e9f5']};
const S={pal:[...PAL.Midnight],shape:'bars',stars:true,moon:true,windows:true,glow:true,bw:.5,rot:1};
function chips(id,items,isOn,click){
  const box=$(id);box.innerHTML='';
  items.forEach(([k,label])=>{const b=document.createElement('button');b.textContent=label;b.className=isOn(k)?'on':'';b.onclick=()=>{click(k);chips(id,items,isOn,click)};box.appendChild(b)});
}
const syncCols=()=>[0,1,2].forEach(i=>$('c'+(i+1)).value=S.pal[i]);
function renderPals(){
  const box=$('pals');box.innerHTML='';
  for(const [name,cols] of Object.entries(PAL)){
    const b=document.createElement('button');b.title=name;b.setAttribute('aria-label',name);
    b.style.background=`linear-gradient(135deg,${cols.join(',')})`;
    b.className=cols.join()===S.pal.join()?'on':'';
    b.onclick=()=>{S.pal=[...cols];syncCols();renderPals()};box.appendChild(b);
  }
}
[0,1,2].forEach(i=>$('c'+(i+1)).oninput=e=>{S.pal[i]=e.target.value;renderPals()});
renderPals();syncCols();
chips('shapes',[['bars','ビル'],['mirror','ミラー'],['circle','円形'],['line','ライン']],k=>S.shape===k,k=>S.shape=k);
chips('tog',[['stars','星'],['moon','月'],['windows','窓あかり'],['glow','足元の光']],k=>S[k],k=>S[k]=!S[k]);
$('bw').oninput=e=>{S.bw=e.target.value/100;$('vBw').textContent=e.target.value};
$('rot').oninput=e=>{S.rot=e.target.value/10;$('vRot').textContent=S.rot.toFixed(1)};
$('bList').onclick=()=>{$('cust').classList.remove('open');$('list').classList.toggle('open')};
$('bCust').onclick=()=>{$('list').classList.remove('open');$('cust').classList.toggle('open')};

/* drag & drop */
let dc=0;
addEventListener('dragenter',e=>{e.preventDefault();dc++;$('drop').classList.add('on')});
addEventListener('dragleave',e=>{e.preventDefault();if(--dc<=0){dc=0;$('drop').classList.remove('on')}});
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{e.preventDefault();dc=0;$('drop').classList.remove('on');if(e.dataTransfer.files.length)addFiles(e.dataTransfer.files)});

/* auto-hide UI (interior mode only) */
let hideT;
function wake(){
  document.body.classList.remove('idle');clearTimeout(hideT);
  hideT=setTimeout(()=>{if(started&&!audio.paused)document.body.classList.add('idle')},3000);
}
['mousemove','mousedown','touchstart','keydown','click'].forEach(ev=>addEventListener(ev,wake,{passive:true}));
wake();

/* ---------- analysis ---------- */
const avg=(a,s,e)=>{let t=0;for(let i=s;i<e;i++)t+=a[i];return t/(e-s)/255};
function analyse(t){
  const live=an&&!audio.paused;
  if(live){an.getByteFrequencyData(freq);an.getByteTimeDomainData(wave)}
  else if(!freq){freq=new Uint8Array(1024);wave=new Uint8Array(2048)}
  if(!live){ // 待機中はゆるやかな疑似データ
    for(let i=0;i<freq.length;i++)freq[i]=Math.max(0,(30+22*Math.sin(t*.0009+i*.05))*Math.exp(-i/160));
    for(let i=0;i<wave.length;i++)wave[i]=128+10*Math.sin(t*.002+i*.03)+6*Math.sin(t*.0013+i*.011);
  }
  const k=P.sens;
  const b=Math.min(1,avg(freq,1,8)*k),m=Math.min(1,avg(freq,8,80)*k*1.4),h=Math.min(1,avg(freq,80,300)*k*2.2);
  lv.bass+=(b-lv.bass)*.35;lv.mid+=(m-lv.mid)*.3;lv.high+=(h-lv.high)*.3;
}

/* ---------- drawing ---------- */
function fade(a){g.globalCompositeOperation='source-over';g.fillStyle=`rgba(5,6,15,${a})`;g.fillRect(0,0,W,H)}
const rgba=(h,a)=>`rgba(${[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(',')},${a})`;
const spec=f=>Math.min(1,freq[1+Math.floor(Math.pow(f,1.7)*320)]/255*P.sens*(1+f));

function bars(t,n,gr){
  const [c1,c2,c3]=S.pal,bw=W/n,mir=S.shape==='mirror',c=(n-1)/2||1;
  for(let i=0;i<n;i++){
    const v=spec(mir?Math.abs(i-c)/c:i/n);
    const h=H*(.06+v*.62),x=i*bw+bw*(1-S.bw)/2,w=bw*S.bw;
    const bg=g.createLinearGradient(0,H,0,H-h);
    bg.addColorStop(0,c1);bg.addColorStop(.5,c2);bg.addColorStop(1,c3);
    g.globalAlpha=.55+v*.45;g.fillStyle=bg;g.fillRect(x,H-h,w,h);
    if(S.windows){
      g.globalAlpha=.5;g.fillStyle='#fff5c2';
      for(let y=H-h+10;y<H-8;y+=18)if((i*7+Math.floor(y/18)+Math.floor(t/900))%5===0)g.fillRect(x+w*.25,y,Math.max(2,w*.16),4);
    }
  }
  g.globalAlpha=1;
}

function circle(t,n){
  const [c1,c2,c3]=S.pal,cx=W/2,cy=H/2,m=Math.min(W,H),r0=m*(.17+lv.bass*.04),L=m*.3;
  const cg=g.createRadialGradient(cx,cy,0,cx,cy,r0);
  cg.addColorStop(0,rgba(c1,.05+lv.bass*.4));cg.addColorStop(1,rgba(c2,0));
  g.fillStyle=cg;g.beginPath();g.arc(cx,cy,r0,0,7);g.fill();
  const rg=g.createRadialGradient(0,0,r0,0,0,r0+L);
  rg.addColorStop(0,c1);rg.addColorStop(.55,c2);rg.addColorStop(1,c3);
  const N=n*2,w=Math.max(1.5,2*Math.PI*r0/N*S.bw),rot=t*.00006*S.rot;
  g.fillStyle=rg;
  for(let i=0;i<N;i++){
    const v=spec(i<N/2?i/(N/2):(N-1-i)/(N/2)),l=L*(.04+v*.96);
    g.save();g.translate(cx,cy);g.rotate(i/N*Math.PI*2+rot);
    g.globalAlpha=.55+v*.45;g.fillRect(-w/2,-r0-l,w,l);
    g.restore();
  }
  g.globalAlpha=1;
}

function line(n,gr){
  const p=[];
  for(let i=0;i<n;i++)p.push([i/(n-1)*W,H*.8*(1-(.03+spec(i/(n-1))*.6))]);
  g.beginPath();g.moveTo(p[0][0],p[0][1]);
  for(let i=1;i<n-1;i++)g.quadraticCurveTo(p[i][0],p[i][1],(p[i][0]+p[i+1][0])/2,(p[i][1]+p[i+1][1])/2);
  g.lineTo(p[n-1][0],p[n-1][1]);
  g.strokeStyle=gr;g.lineWidth=3;g.lineJoin='round';g.stroke();
  g.lineTo(W,H);g.lineTo(0,H);g.closePath();
  g.globalAlpha=.22;g.fillStyle=gr;g.fill();g.globalAlpha=1;
}

function midnight(t){
  const [c1,c2,c3]=S.pal;
  fade(.28);
  const sky=g.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,rgba(c2,.22));sky.addColorStop(1,rgba(c1,.12));
  g.fillStyle=sky;g.fillRect(0,0,W,H);
  if(S.stars){
    g.fillStyle=c3;
    for(let i=0;i<90;i++){
      g.globalAlpha=.15+.5*Math.abs(Math.sin(t*.0012+i*1.7))+lv.high*.3;
      g.fillRect((i*977%1000)/1000*W,(i*613%1000)/1000*H*.55,1.4,1.4);
    }
    g.globalAlpha=1;
  }
  if(S.moon){
    const mx=W*.78,my=H*.2,r=Math.min(W,H)*(.06+lv.bass*.03);
    const mg=g.createRadialGradient(mx,my,r*.2,mx,my,r*3);
    mg.addColorStop(0,'rgba(255,255,255,.9)');mg.addColorStop(.3,rgba(c1,.35));mg.addColorStop(1,rgba(c1,0));
    g.fillStyle=mg;g.beginPath();g.arc(mx,my,r*3,0,7);g.fill();
  }
  const n=Math.max(8,Math.round(P.part/2));
  const gr=g.createLinearGradient(0,H,0,H*.3);
  gr.addColorStop(0,c1);gr.addColorStop(.5,c2);gr.addColorStop(1,c3);
  if(S.shape==='circle')circle(t,n);
  else if(S.shape==='line')line(n,gr);
  else bars(t,n,gr);
  if(S.glow){
    const fg=g.createLinearGradient(0,H*.7,0,H);
    fg.addColorStop(0,rgba(c1,0));fg.addColorStop(1,rgba(c1,.08+lv.bass*.35));
    g.fillStyle=fg;g.fillRect(0,H*.7,W,H*.3);
  }
}

/* ---------- loop ---------- */
let raf=0;
function frame(t){
  analyse(t);
  midnight(t);
  raf=requestAnimationFrame(frame);
}
function kick(){if(!raf)raf=requestAnimationFrame(frame)}
kick();
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else kick()});
applyBlur();
})();