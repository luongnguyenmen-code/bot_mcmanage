const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');
const path = require('path');
const basicAuth = require('express-basic-auth'); // Đưa lên đầu cho gọn

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 1. LỚP BẢO MẬT PHẢI ĐẶT Ở ĐÂY ---
app.use(basicAuth({
    // Sử dụng biến môi trường hoặc mặc định là 'emluan123'
    users: { 'admin': process.env.WEB_PASSWORD || 'emluan123' }, 
    challenge: true,
    realm: 'Minecraft Bot Manager',
}));

// --- 2. SAU ĐÓ MỚI ĐẾN CÁC FILE TĨNH ---
app.use(express.static(path.join(__dirname, 'public')));

// Thông tin máy chủ - Có thể tùy chỉnh qua Variables nếu muốn
const MC_SERVER = { 
    host: process.env.MC_HOST || '180.93.103.76', 
    port: parseInt(process.env.MC_PORT) || 26700 
};

// Lưu trữ trạng thái
let configuredAccounts = []; 
const activeBots = new Map(); 

function createBot(username) {
    if (activeBots.has(username)) return;

    io.emit('botStatus', { username, status: 'connecting' });

    const bot = mineflayer.createBot({
        host: MC_SERVER.host,
        port: MC_SERVER.port,
        username: username,
        version: '1.20.1', // Đảm bảo version này khớp với server của bạn
    });

    activeBots.set(username, bot);

    bot.on('spawn', () => {
        console.log(`✅ ${username} đã vào server.`);
        io.emit('botStatus', { username, status: 'online' });
    });

    bot.on('message', (message) => {
        // Gửi tin nhắn về UI
        io.emit('botChat', { username, message: message.toAnsi() });
    });

    bot.on('end', (reason) => {
        console.warn(`🚪 ${username} đã thoát. Lý do: ${reason}`);
        activeBots.delete(username);
        io.emit('botStatus', { username, status: 'offline' });
    });

    bot.on('error', (err) => {
        console.error(`⚠️ ${username}: Lỗi - ${err.message}`);
        // Không cần gọi bot.end() ở đây vì sự kiện 'end' sẽ tự kích hoạt sau error
    });
}

// Socket.io Logic
io.on('connection', (socket) => {
    socket.emit('init', configuredAccounts.map(u => ({
        username: u,
        status: activeBots.has(u) ? 'online' : 'offline'
    })));

    socket.on('setAccounts', (usernames) => {
        configuredAccounts = [...new Set([...configuredAccounts, ...usernames])];
        io.emit('init', configuredAccounts.map(u => ({
            username: u,
            status: activeBots.has(u) ? 'online' : 'offline'
        })));
    });

    socket.on('startAll', () => {
        configuredAccounts.forEach((username, i) => {
            // Delay 5s mỗi bot để tránh bị kick do join quá nhanh
            setTimeout(() => createBot(username), i * 5000);
        });
    });

    socket.on('stopAll', () => {
        activeBots.forEach((bot) => {
            if (bot) bot.quit();
        });
    });

    socket.on('toggleBot', (username) => {
        if (activeBots.has(username)) {
            activeBots.get(username).quit();
        } else {
            createBot(username);
        }
    });

    socket.on('sendChat', (data) => {
        const bot = activeBots.get(data.username);
        if (bot) bot.chat(data.message);
    });
});

const PORT = process.env.PORT || 3000; 
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy tại port: ${PORT}`);
});