const socket = io({reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:500,reconnectionDelayMax:3000,timeout:10000});
let playerKey='';try{playerKey=localStorage.getItem('nightfallPlayerKey')||'';if(!playerKey){playerKey=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());localStorage.setItem('nightfallPlayerKey',playerKey)}}catch(e){playerKey='guest-'+Math.random().toString(36).slice(2)}
let gmData=null, activeSkill=null;
const $ = id => document.getElementById(id);
let currentRoom=null, catalogue=[], counts={}, myRole=null, isHost=false, viewingRoom=false;
const teams={town:'DÂN LÀNG',wolf:'MA SÓI',solo:'ĐỘC LẬP',wild:'KHÁC / BIẾN THỂ'};
function showScreen(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');}
let toastTimer;function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800)}
function myName(){return $('playerName').value.trim()}
$('createBtn').onclick=()=>{if(!myName())return toast('Hãy nhập tên của bạn trước nhé.');socket.emit('room:create',{name:myName(),key:playerKey})};
$('joinBtn').onclick=()=>{if(!myName())return toast('Hãy nhập tên của bạn trước nhé.');if(!$('roomCode').value.trim())return toast('Nhập mã phòng để tham gia.');socket.emit('room:join',{name:myName(),code:$('roomCode').value,key:playerKey})};
$('roomCode').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''));
socket.on('app:error',toast);
socket.on('connect',()=>{let saved=null;try{saved=JSON.parse(localStorage.getItem('nightfallRoomSession')||'null')}catch(e){}if(saved?.code&&saved?.key===playerKey)socket.emit('room:resume',{code:saved.code,key:playerKey});});
socket.on('room:resume-failed',()=>{try{localStorage.removeItem('nightfallRoomSession')}catch(e){};});
socket.on('room:joined',({room,roles})=>{try{localStorage.setItem('nightfallRoomSession',JSON.stringify({code:room.code,key:playerKey}))}catch(e){};catalogue=roles;currentRoom=room;counts=Object.fromEntries((room.deck||[]).map(x=>[x.id,x.count]));myRole=null;viewingRoom=true;isHost=room.hostId===playerKey;renderRoles();renderRoom(room);showScreen('lobby');});
socket.on('gm:state',data=>{gmData=data;renderGM();});
socket.on('room:update',room=>{
  currentRoom=room; isHost=room.hostId===playerKey; renderRoom(room);
  if(room.status==='started'&&!viewingRoom){showScreen('game');$('resetBtn').hidden=!isHost;}
  $('gmConsole').classList.toggle('hidden',!(isHost&&room.status==='started'));
  if(room.status==='lobby'&&myRole===null){viewingRoom=true;$('resetBtn').hidden=true;showScreen('lobby');}
});
socket.on('game:your-role',({role})=>{viewingRoom=false;myRole=role;$('roleName').textContent=role.name.toUpperCase();$('roleEmoji').textContent=role.emoji;$('roleDescription').textContent=role.description;$('roleTeam').textContent=teams[role.team]||'VAI TRÒ ĐẶC BIỆT';$('roleTeam').className='team-pill '+role.team;$('cardBack').classList.remove('hidden');$('roleCard').classList.add('hidden');$('revealBtn').disabled=false;$('revealBtn').textContent='MỞ LÁ BÀI';showScreen('game');});
socket.on('game:role-cleared',()=>{
  myRole=null; viewingRoom=true;
  $('cardBack').classList.remove('hidden'); $('roleCard').classList.add('hidden');
  $('resetBtn').hidden=true; $('gmConsole').classList.add('hidden'); $('revealBtn').disabled=false;
  showScreen('lobby');
});
function renderRoom(room){if(isHost&&Array.isArray(room.deck))counts=Object.fromEntries(room.deck.map(x=>[x.id,x.count]));$('roomCodeDisplay').textContent=room.code;$('startBtn').disabled=!isHost||room.status==='started';$('returnRoleBtn').classList.toggle('hidden',!(room.status==='started'&&!!myRole));$('playerCount').textContent=`${room.players.length}/30`;$('playersList').innerHTML='';room.players.forEach(p=>{const div=document.createElement('div');div.className='player-item';const av=document.createElement('span');av.className='avatar';av.textContent=p.name.slice(0,1).toUpperCase();const nm=document.createElement('span');nm.textContent=p.name;div.append(av,nm);if(p.connected===false){const off=document.createElement('span');off.className='offline-tag';off.textContent='MẤT KẾT NỐI';div.append(off)}if(p.isHost){const h=document.createElement('span');h.className='host';h.textContent='CHỦ PHÒNG';div.append(h)}$('playersList').append(div)});$('gamePlayerCount').textContent=`${room.players.length} NGƯỜI CHƠI · PHÒNG ${room.code}`;$('startBtn').disabled=!isHost||room.status==='started';$('startBtn').style.opacity=(isHost&&room.status!=='started')?'1':'.45';document.querySelector('.host-tag').textContent=isHost?'CHỦ PHÒNG':'NGƯỜI CHƠI';document.querySelector('.host-tag').style.color=isHost?'var(--gold)':'var(--muted)';$('roleGroups').style.opacity=isHost?'1':'.55';document.querySelectorAll('.counter button').forEach(b=>b.disabled=!isHost);updateDeckSummary();}
function renderRoles(){const container=$('roleGroups');container.innerHTML='';const groups=[['town','PHE DÂN LÀNG'],['wolf','PHE MA SÓI'],['solo','PHE ĐỘC LẬP'],['wild','VAI TRÒ MỞ RỘNG / KHÁC']];groups.forEach(([team,title])=>{const section=document.createElement('div');section.dataset.team=team;const heading=document.createElement('div');heading.className='role-group-title';heading.textContent=title;section.append(heading);catalogue.filter(r=>r.team===team).forEach(role=>{const row=document.createElement('div');row.className='role-option';row.dataset.search=role.name.toLowerCase();const emoji=document.createElement('span');emoji.className='role-emoji';emoji.textContent=role.emoji;const label=document.createElement('div');label.className='role-label';const b=document.createElement('b');b.textContent=role.name;const desc=document.createElement('small');desc.textContent=role.description;label.append(b,desc);const counter=document.createElement('div');counter.className='counter';const minus=document.createElement('button');minus.textContent='−';minus.onclick=()=>setCount(role.id,-1);const num=document.createElement('strong');num.id='count-'+role.id;num.textContent=counts[role.id]||0;const plus=document.createElement('button');plus.textContent='+';plus.onclick=()=>setCount(role.id,1);counter.append(minus,num,plus);row.append(emoji,label,counter);section.append(row)});container.append(section)});filterRoles();}
function setCount(id,delta){if(!isHost)return;counts[id]=Math.max(0,Math.min(30,(counts[id]||0)+delta));const el=$('count-'+id);if(el)el.textContent=counts[id];socket.emit('room:select',{selected:Object.entries(counts).map(([id,count])=>({id,count}))});updateDeckSummary();}
function updateDeckSummary(){const total=Object.values(counts).reduce((a,b)=>a+b,0);$('deckCount').textContent=total;const players=currentRoom?.players.length||0;$('deckHint').textContent=total<players?`Còn thiếu ${players-total} lá bài`:total>players?`Dư ${total-players} lá (sẽ không phát)`:`Đủ bài cho ${players} người chơi`;}
function filterRoles(){const q=$('roleSearch').value.toLowerCase(),team=$('teamFilter').value;document.querySelectorAll('.role-group-title').forEach(h=>{const sec=h.parentElement;let visible=0;sec.querySelectorAll('.role-option').forEach(r=>{const show=(team==='all'||sec.dataset.team===team)&&r.dataset.search.includes(q);r.style.display=show?'flex':'none';if(show)visible++});sec.style.display=visible?'block':'none'});}
$('roleSearch').oninput=filterRoles;$('teamFilter').onchange=filterRoles;
$('startBtn').onclick=()=>{if(!isHost)return toast('Chỉ chủ phòng mới có thể bắt đầu.');socket.emit('game:start')};
$('revealBtn').onclick=()=>{if(!myRole)return;$('cardBack').classList.add('hidden');$('roleCard').classList.remove('hidden');$('revealBtn').disabled=true};
$('resetBtn').onclick=()=>{if(confirm('Tạo ván mới trong phòng này? Mọi người sẽ quay về sảnh chờ, giữ nguyên danh sách và cấu hình vai trò.'))socket.emit('game:reset')};
$('backRoomBtn').onclick=()=>{if(!currentRoom)return toast('Bạn không còn ở trong phòng.');viewingRoom=true;showScreen('lobby');};
$('returnRoleBtn').onclick=()=>{if(!myRole)return toast('Bạn chưa nhận được vai trò.');viewingRoom=false;showScreen('game');};
$('homeBtn').onclick=()=>{if(!confirm('Rời phòng hiện tại và quay về trang chủ?'))return;viewingRoom=true;try{localStorage.removeItem('nightfallRoomSession')}catch(e){};socket.emit('room:leave');currentRoom=null;myRole=null;isHost=false;showScreen('home');};
$('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText(currentRoom.code);toast('Đã sao chép mã phòng!')}catch{toast('Mã phòng: '+currentRoom.code)}};
window.addEventListener('beforeunload',()=>{});

// Game-master console: private role map and night action ledger.
const SKILLS={
 werewolf:[['wolf_attack','Sói cắn']],white_wolf:[['wolf_attack','Sói cắn']],big_bad_wolf:[['wolf_attack','Sói cắn'],['wolf_extra','Sói tấn công thêm']],alpha_wolf:[['wolf_attack','Sói cắn']],wolf_cub:[['wolf_attack','Sói cắn']],
 witch:[['witch_save','Bình cứu'],['witch_poison','Bình độc']],seer:[['seer_check','Tiên tri soi']],guard:[['guard_protect','Bảo vệ']],cupid:[['cupid_link','Ghép đôi']],hunter:[['hunter_shoot','Thợ săn bắn']],piper:[['piper_charm','Mê hoặc']],fox:[['fox_check','Cáo kiểm tra']],raven:[['raven_mark','Quạ đánh dấu']],wild_child:[['wild_child_model','Chọn hình mẫu']],wolf_hound:[['wolf_hound_choose','Chọn phe']],thief:[['thief_choose','Chọn lá bài']],two_sisters:[['sisters_reveal','Xác nhận chị em']],three_brothers:[['brothers_reveal','Xác nhận anh em']],knight:[['knight_challenge','Thách đấu']],judge:[['judge_call','Gọi xét xử']],accursed:[['accursed_mark','Theo dõi người bị nguyền']],wild_woman:[['wild_woman_model','Chọn hình mẫu']],actor:[['actor_choose','Chọn vai phụ']]
};
function chooseGMAction(skillId,actorId,actorName){activeSkill={skillId,actorId,actorName};$('gmPrompt').textContent=`${actorName}: ${SKILLS[gmData.players.find(p=>p.name===actorName)?.role]?.find(x=>x[0]===skillId)?.[1]||'Kỹ năng'} · Chọn mục tiêu`;renderGMTargets();}
function renderGM(){if(!gmData||!isHost)return;$('gmNight').textContent=`ĐÊM ${gmData.night}`;$('gmPlayers').innerHTML='';gmData.players.forEach(p=>{const card=document.createElement('div');card.className='gm-player';const top=document.createElement('div');top.className='gm-player-top';const name=document.createElement('b');name.textContent=p.name;const role=document.createElement('span');const found=catalogue.find(r=>r.id===p.role);role.textContent=found?`${found.emoji} ${found.name}`:'Chưa có vai';top.append(name,role);card.append(top);const skills=SKILLS[p.role]||[];if(skills.length){const actions=document.createElement('div');actions.className='gm-skill-list';skills.forEach(([id,label])=>{const b=document.createElement('button');b.className='btn secondary gm-skill';b.textContent=label;b.disabled=(gmData.usedSkills||[]).includes(id);if(b.disabled)b.title='Đã sử dụng trong ván này';b.onclick=()=>chooseGMAction(id,p.id,p.name);actions.append(b)});card.append(actions)}else{const note=document.createElement('small');note.className='gm-no-skill';note.textContent='Không có kỹ năng đêm được thiết lập';card.append(note)}$('gmPlayers').append(card)});$('gmLog').innerHTML='';const logs=gmData.actions.filter(a=>a.night===gmData.night);if(!logs.length){$('gmLog').textContent='Chưa ghi nhận hành động nào trong đêm này.'}else logs.forEach(a=>{const row=document.createElement('div');row.className='gm-log-row';row.textContent=`${a.actorName||'Quản trò'} · ${a.skillId.replaceAll('_',' ')} → ${a.targetName}`;$('gmLog').append(row)});renderGMTargets();}
function renderGMTargets(){const box=$('gmTargets');box.innerHTML='';if(!activeSkill){$('gmPrompt').textContent='Chưa chọn kỹ năng';return;}gmData.players.forEach(p=>{const b=document.createElement('button');b.className='btn secondary';b.textContent=p.name;b.onclick=()=>{socket.emit('gm:action',{skillId:activeSkill.skillId,actorId:activeSkill.actorId,targetId:p.id});toast(`Đã ghi nhận mục tiêu: ${p.name}`);activeSkill=null;$('gmPrompt').textContent='Đã ghi nhận hành động';box.innerHTML=''};box.append(b)});}
$('gmUndo').onclick=()=>socket.emit('gm:undo');$('gmNextNight').onclick=()=>{if(confirm('Chuyển sang đêm tiếp theo?')){activeSkill=null;socket.emit('gm:next-night')}};
// Welcome / creator credit: shown once per browser unless the visitor opts out.
(function(){
  const modal=$('creatorModal');
  if(!modal) return;
  const close=()=>{modal.classList.add('hidden');document.body.style.overflow='';if($('neverShowAgain')?.checked){try{localStorage.setItem('nightfallIntroDismissed','1')}catch(e){}}};
  let dismissed=false;
  try{dismissed=localStorage.getItem('nightfallIntroDismissed')==='1'}catch(e){}
  if(!dismissed){modal.classList.remove('hidden');document.body.style.overflow='hidden'}
  $('creatorClose').onclick=close;
  $('creatorStart').onclick=close;
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
})();
