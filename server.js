const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.get('/health', (_, res) => res.json({ ok: true }));

// Role catalogue is intentionally broad: base set + popular expansion roles.
const ROLES = [
  ['villager','Dân làng','town','Không có năng lực đặc biệt. Dùng suy luận và biểu quyết để tìm Ma Sói.','🧑‍🌾'],
  ['werewolf','Ma Sói','wolf','Mỗi đêm cùng những Ma Sói khác chọn một người để cắn.','🐺'],
  ['seer','Tiên Tri','town','Mỗi đêm chọn một người để soi thân phận.','🔮'],
  ['witch','Phù Thủy','town','Có một bình cứu và một bình độc, mỗi bình dùng một lần trong ván.','🧙‍♀️'],
  ['hunter','Thợ Săn','town','Khi chết có thể kéo theo một người chơi khác.','🏹'],
  ['guard','Bảo Vệ','town','Mỗi đêm bảo vệ một người khỏi bị Ma Sói tấn công.','🛡️'],
  ['cupid','Thần Tình Yêu','town','Đêm đầu ghép đôi hai người; nếu một người chết, người còn lại thường chết theo.','💘'],
  ['little_girl','Cô Bé','town','Có thể hé mắt quan sát Ma Sói trong đêm theo luật bộ bài đang dùng.','👧'],
  ['elder','Già Làng','town','Có sức chịu đựng đặc biệt; luật mất năng lực khi bị loại tùy phiên bản.','🧓'],
  ['idiot','Thằng Ngốc','town','Nếu bị dân làng treo cổ, có thể lật bài để sống nhưng mất quyền biểu quyết.','🤡'],
  ['scapegoat','Vật Tế Thần','town','Có thể bị loại thay khi cuộc bỏ phiếu hòa, tùy luật chơi.','🐐'],
  ['piper','Kẻ Thổi Sáo','solo','Mỗi đêm mê hoặc người chơi; thắng khi tất cả người còn sống đều bị mê hoặc.','🎼'],
  ['white_wolf','Sói Trắng','wolf','Thuộc phe sói nhưng có mục tiêu riêng, thường muốn trở thành sói cuối cùng.','🐺'],
  ['big_bad_wolf','Sói Lớn','wolf','Có thể có lượt tấn công bổ sung khi điều kiện của luật chơi được đáp ứng.','🌕'],
  ['alpha_wolf','Sói Alpha','wolf','Có năng lực biến đổi hoặc tác động đặc biệt theo biến thể sử dụng.','🐺'],
  ['wolf_hound','Chó Sói','wild','Đầu ván chọn theo phe Dân hoặc phe Sói theo luật biến thể.','🐕'],
  ['wild_child','Đứa Trẻ Hoang Dã','wild','Chọn một hình mẫu; nếu hình mẫu chết, có thể hóa sói.','🧒'],
  ['fox','Cáo','town','Có khả năng kiểm tra một nhóm người để phát hiện dấu hiệu Ma Sói.','🦊'],
  ['bear_tamer','Người Thuần Gấu','town','Quản trò có thể thông báo gấu gầm khi có sói ở gần theo luật.','🐻'],
  ['knight','Hiệp Sĩ','town','Có thể thách đấu một người; kết quả xử lý theo luật biến thể.','⚔️'],
  ['angel','Thiên Thần','solo','Thắng nếu bị treo cổ ở ngày đầu hoặc điều kiện mở màn của biến thể.','👼'],
  ['thief','Kẻ Trộm','wild','Có thể chọn một trong các lá bài dự phòng ở đầu ván.','🗝️'],
  ['scout','Trưởng Làng','town','Có quyền hoặc trọng số biểu quyết đặc biệt theo luật nhóm.','🔔'],
  ['stutterer','Người Hay Nói Lắp','town','Vai trò biến thể với điều kiện biểu quyết riêng do quản trò quy định.','🗣️'],
  ['two_sisters','Hai Chị Em','town','Hai người biết nhau và có thể thức dậy cùng nhau ở đêm đầu.','👭'],
  ['three_brothers','Ba Anh Em','town','Ba người biết nhau và có thể thức dậy cùng nhau ở đêm đầu.','👬'],
  ['rusty_sword_knight','Hiệp Sĩ Gươm Gỉ','town','Khi bị sói cắn, có thể khiến sói đầu tiên bên cạnh bị ảnh hưởng theo luật.','🗡️'],
  ['villager_villager','Dân Làng (biến thể)','town','Một biến thể dân làng dùng trong các bộ mở rộng.','🧑‍🌾'],
  ['wolf_cub','Sói Con','wolf','Khi bị loại, có thể khiến phe sói được quyền tấn công mạnh hơn đêm kế tiếp.','🐺'],
  ['accursed','Người Bị Nguyền','wild','Có thể đổi phe nếu bị Ma Sói tấn công mà sống sót theo luật.','🕯️'],
  ['wild_woman','Cô Gái Hoang Dã','wild','Vai trò mở rộng có lựa chọn hoặc điều kiện chuyển phe riêng.','🌲'],
  ['judge','Quan Tòa','town','Có quyền kích hoạt một phiên xét xử hoặc biểu quyết đặc biệt.','⚖️'],
  ['raven','Quạ','town','Có thể đánh dấu một người để người đó nhận thêm phiếu bất lợi.','🐦‍⬛'],
  ['fox_spirit','Hồ Ly','solo','Vai trò trung lập với điều kiện thắng riêng theo biến thể.','🦊'],
  ['grave_digger','Người Đào Mộ','town','Có thể nhận thông tin về người đã chết theo luật biến thể.','⚰️'],
  ['actor','Diễn Viên','wild','Có thể nhận một vai trò phụ hoặc chọn vai từ các lá dự phòng.','🎭']
].map(([id,name,team,description,emoji])=>({id,name,team,description,emoji}));
const roleById = Object.fromEntries(ROLES.map(r=>[r.id,r]));
const rooms = new Map();
const socketRoom = new Map();

function code(){ let s; do { s=crypto.randomBytes(3).toString('hex').toUpperCase(); } while(rooms.has(s)); return s; }
function cleanName(s){ return String(s||'').trim().replace(/[<>]/g,'').slice(0,18); }
function publicRoom(room){ return { code:room.code, hostId:room.hostId, status:room.status, players:[...room.players.values()].map(p=>({id:p.id,name:p.name,isHost:p.id===room.hostId})), selected:room.selected, deckSize:room.deck.reduce((a,x)=>a+x.count,0) }; }
function emitRoom(room){ io.to(room.code).emit('room:update',publicRoom(room)); }
function fail(socket,msg){ socket.emit('app:error',msg); }
function leave(socket){
  const c=socketRoom.get(socket.id); if(!c) return;
  const room=rooms.get(c); socketRoom.delete(socket.id); socket.leave(c);
  if(!room) return;
  room.players.delete(socket.id);
  if(room.players.size===0){rooms.delete(c);return;}
  if(room.hostId===socket.id){ room.hostId=room.players.keys().next().value; }
  emitRoom(room);
}

io.on('connection', socket=>{
  socket.on('room:leave',()=>leave(socket));
  socket.on('room:create', ({name}={})=>{
    if(socketRoom.has(socket.id)) leave(socket);
    name=cleanName(name); if(!name) return fail(socket,'Bạn hãy nhập tên trước khi tạo phòng.');
    const c=code(); const room={code:c,hostId:socket.id,players:new Map(),status:'lobby',selected:[],deck:[],roles:{}};
    room.players.set(socket.id,{id:socket.id,name}); rooms.set(c,room); socket.join(c); socketRoom.set(socket.id,c);
    socket.emit('room:joined',{room:publicRoom(room),roles:ROLES}); emitRoom(room);
  });
  socket.on('room:join',({code:c,name}={})=>{
    if(socketRoom.has(socket.id)) leave(socket);
    c=String(c||'').trim().toUpperCase(); name=cleanName(name);
    const room=rooms.get(c); if(!name) return fail(socket,'Bạn hãy nhập tên của mình.');
    if(!room) return fail(socket,'Không tìm thấy phòng. Hãy kiểm tra lại mã phòng.');
    if(room.status!=='lobby') return fail(socket,'Ván chơi đã bắt đầu, không thể tham gia lúc này.');
    if(room.players.size>=30) return fail(socket,'Phòng đã đủ 30 người.');
    room.players.set(socket.id,{id:socket.id,name}); socket.join(c); socketRoom.set(socket.id,c);
    socket.emit('room:joined',{room:publicRoom(room),roles:ROLES}); emitRoom(room);
  });
  socket.on('room:select',({selected}={})=>{
    const room=rooms.get(socketRoom.get(socket.id)); if(!room||room.hostId!==socket.id) return fail(socket,'Chỉ chủ phòng mới được chọn role.');
    if(room.status!=='lobby') return fail(socket,'Ván chơi đã bắt đầu.');
    if(!Array.isArray(selected)) return;
    const counts={};
    for(const item of selected){ const id=String(item.id||''); const count=Math.max(0,Math.min(30,parseInt(item.count,10)||0)); if(roleById[id]&&count) counts[id]=count; }
    room.selected=Object.keys(counts); room.deck=Object.entries(counts).map(([id,count])=>({id,count})); emitRoom(room);
  });
  socket.on('game:start',()=>{
    const room=rooms.get(socketRoom.get(socket.id)); if(!room||room.hostId!==socket.id) return fail(socket,'Chỉ chủ phòng mới có thể bắt đầu.');
    if(room.status!=='lobby') return fail(socket,'Ván chơi đã bắt đầu.');
    const players=[...room.players.values()]; const deck=[]; room.deck.forEach(x=>{for(let i=0;i<x.count;i++)deck.push(x.id)});
    if(deck.length<players.length) return fail(socket,`Cần ít nhất ${players.length} lá bài cho ${players.length} người chơi. Hiện có ${deck.length} lá.`);
    // Fisher-Yates shuffle: every card has equal chance at every position.
    for(let i=deck.length-1;i>0;i--){const j=crypto.randomInt(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}
    room.roles={}; players.forEach((p,i)=>{room.roles[p.id]=deck[i]; io.to(p.id).emit('game:your-role',{role:roleById[deck[i]]});});
    room.status='started'; emitRoom(room);
  });
  socket.on('game:reset',()=>{
    const room=rooms.get(socketRoom.get(socket.id)); if(!room||room.hostId!==socket.id) return fail(socket,'Chỉ chủ phòng mới có thể tạo ván mới.');
    room.status='lobby'; room.roles={};
    for(const p of room.players.values()) io.to(p.id).emit('game:role-cleared');
    emitRoom(room);
  });
  socket.on('disconnect',()=>leave(socket));
});

server.listen(PORT,()=>console.log(`Ma Sói Online running on ${PORT}`));
