const socket = io();
const $ = id => document.getElementById(id);
let currentRoom=null, catalogue=[], counts={}, myRole=null, isHost=false, viewingRoom=false;
const teams={town:'DÂN LÀNG',wolf:'MA SÓI',solo:'ĐỘC LẬP',wild:'KHÁC / BIẾN THỂ'};
function showScreen(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');}
let toastTimer;function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800)}
function myName(){return $('playerName').value.trim()}
$('createBtn').onclick=()=>{if(!myName())return toast('Hãy nhập tên của bạn trước nhé.');socket.emit('room:create',{name:myName()})};
$('joinBtn').onclick=()=>{if(!myName())return toast('Hãy nhập tên của bạn trước nhé.');if(!$('roomCode').value.trim())return toast('Nhập mã phòng để tham gia.');socket.emit('room:join',{name:myName(),code:$('roomCode').value})};
$('roomCode').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''));
socket.on('app:error',toast);
socket.on('room:joined',({room,roles})=>{catalogue=roles;currentRoom=room;counts={};myRole=null;viewingRoom=true;isHost=room.hostId===socket.id;renderRoles();renderRoom(room);showScreen('lobby');});
socket.on('room:update',room=>{
  currentRoom=room; isHost=room.hostId===socket.id; renderRoom(room);
  if(room.status==='started'&&!viewingRoom){showScreen('game');$('resetBtn').hidden=!isHost;}
  if(room.status==='lobby'&&myRole===null){viewingRoom=true;$('resetBtn').hidden=true;showScreen('lobby');}
});
socket.on('game:your-role',({role})=>{viewingRoom=false;myRole=role;$('roleName').textContent=role.name.toUpperCase();$('roleEmoji').textContent=role.emoji;$('roleDescription').textContent=role.description;$('roleTeam').textContent=teams[role.team]||'VAI TRÒ ĐẶC BIỆT';$('roleTeam').className='team-pill '+role.team;$('cardBack').classList.remove('hidden');$('roleCard').classList.add('hidden');$('revealBtn').disabled=false;$('revealBtn').textContent='MỞ LÁ BÀI';showScreen('game');});
socket.on('game:role-cleared',()=>{
  myRole=null; viewingRoom=true;
  $('cardBack').classList.remove('hidden'); $('roleCard').classList.add('hidden');
  $('resetBtn').hidden=true; $('revealBtn').disabled=false;
  showScreen('lobby');
});
function renderRoom(room){$('roomCodeDisplay').textContent=room.code;$('startBtn').disabled=!isHost||room.status==='started';$('returnRoleBtn').classList.toggle('hidden',!(room.status==='started'&&!!myRole));$('playerCount').textContent=`${room.players.length}/30`;$('playersList').innerHTML='';room.players.forEach(p=>{const div=document.createElement('div');div.className='player-item';const av=document.createElement('span');av.className='avatar';av.textContent=p.name.slice(0,1).toUpperCase();const nm=document.createElement('span');nm.textContent=p.name;div.append(av,nm);if(p.isHost){const h=document.createElement('span');h.className='host';h.textContent='CHỦ PHÒNG';div.append(h)}$('playersList').append(div)});$('gamePlayerCount').textContent=`${room.players.length} NGƯỜI CHƠI · PHÒNG ${room.code}`;$('startBtn').disabled=!isHost||room.status==='started';$('startBtn').style.opacity=(isHost&&room.status!=='started')?'1':'.45';document.querySelector('.host-tag').textContent=isHost?'CHỦ PHÒNG':'NGƯỜI CHƠI';document.querySelector('.host-tag').style.color=isHost?'var(--gold)':'var(--muted)';$('roleGroups').style.opacity=isHost?'1':'.55';document.querySelectorAll('.counter button').forEach(b=>b.disabled=!isHost);updateDeckSummary();}
function renderRoles(){const container=$('roleGroups');container.innerHTML='';const groups=[['town','PHE DÂN LÀNG'],['wolf','PHE MA SÓI'],['solo','PHE ĐỘC LẬP'],['wild','VAI TRÒ MỞ RỘNG / KHÁC']];groups.forEach(([team,title])=>{const section=document.createElement('div');section.dataset.team=team;const heading=document.createElement('div');heading.className='role-group-title';heading.textContent=title;section.append(heading);catalogue.filter(r=>r.team===team).forEach(role=>{const row=document.createElement('div');row.className='role-option';row.dataset.search=role.name.toLowerCase();const emoji=document.createElement('span');emoji.className='role-emoji';emoji.textContent=role.emoji;const label=document.createElement('div');label.className='role-label';const b=document.createElement('b');b.textContent=role.name;const desc=document.createElement('small');desc.textContent=role.description;label.append(b,desc);const counter=document.createElement('div');counter.className='counter';const minus=document.createElement('button');minus.textContent='−';minus.onclick=()=>setCount(role.id,-1);const num=document.createElement('strong');num.id='count-'+role.id;num.textContent=counts[role.id]||0;const plus=document.createElement('button');plus.textContent='+';plus.onclick=()=>setCount(role.id,1);counter.append(minus,num,plus);row.append(emoji,label,counter);section.append(row)});container.append(section)});filterRoles();}
function setCount(id,delta){if(!isHost)return;counts[id]=Math.max(0,Math.min(30,(counts[id]||0)+delta));const el=$('count-'+id);if(el)el.textContent=counts[id];socket.emit('room:select',{selected:Object.entries(counts).map(([id,count])=>({id,count}))});updateDeckSummary();}
function updateDeckSummary(){const total=Object.values(counts).reduce((a,b)=>a+b,0);$('deckCount').textContent=total;const players=currentRoom?.players.length||0;$('deckHint').textContent=total<players?`Còn thiếu ${players-total} lá bài`:`Đủ bài cho ${players} người chơi`;}
function filterRoles(){const q=$('roleSearch').value.toLowerCase(),team=$('teamFilter').value;document.querySelectorAll('.role-group-title').forEach(h=>{const sec=h.parentElement;let visible=0;sec.querySelectorAll('.role-option').forEach(r=>{const show=(team==='all'||sec.dataset.team===team)&&r.dataset.search.includes(q);r.style.display=show?'flex':'none';if(show)visible++});sec.style.display=visible?'block':'none'});}
$('roleSearch').oninput=filterRoles;$('teamFilter').onchange=filterRoles;
$('startBtn').onclick=()=>{if(!isHost)return toast('Chỉ chủ phòng mới có thể bắt đầu.');socket.emit('game:start')};
$('revealBtn').onclick=()=>{if(!myRole)return;$('cardBack').classList.add('hidden');$('roleCard').classList.remove('hidden');$('revealBtn').disabled=true};
$('resetBtn').onclick=()=>{if(confirm('Tạo ván mới trong phòng này? Mọi người sẽ quay về sảnh chờ, giữ nguyên danh sách và cấu hình vai trò.'))socket.emit('game:reset')};
$('backRoomBtn').onclick=()=>{if(!currentRoom)return toast('Bạn không còn ở trong phòng.');viewingRoom=true;showScreen('lobby');};
$('returnRoleBtn').onclick=()=>{if(!myRole)return toast('Bạn chưa nhận được vai trò.');viewingRoom=false;showScreen('game');};
$('homeBtn').onclick=()=>{if(!confirm('Rời phòng hiện tại và quay về trang chủ?'))return;viewingRoom=true;socket.emit('room:leave');currentRoom=null;myRole=null;isHost=false;showScreen('home');};
$('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText(currentRoom.code);toast('Đã sao chép mã phòng!')}catch{toast('Mã phòng: '+currentRoom.code)}};
window.addEventListener('beforeunload',()=>{});

// Welcome / creator credit: shown once per browser unless the visitor opts out.
(function(){
  const modal=$('creatorModal');
  if(!modal) return;
  const close=()=>{modal.classList.add('hidden');if($('neverShowAgain')?.checked){try{localStorage.setItem('nightfallIntroDismissed','1')}catch(e){}}};
  if(!localStorage.getItem('nightfallIntroDismissed')) modal.classList.remove('hidden');
  $('creatorClose').onclick=close;
  $('creatorStart').onclick=close;
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
})();
