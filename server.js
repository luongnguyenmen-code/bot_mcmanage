const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');
const path = require('path');
const basicAuth = require('express-basic-auth'); // Đưa lên đầu cho gọn

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 1. Bảo mật: Ưu tiên mật khẩu từ hệ thống, nếu không có mới dùng mật mã dự phòng
const ADMIN_USER = process.env.WEB_USER || 'admin';
const ADMIN_PASS = process.env.WEB_PASSWORD || 'ahwetygdjahwdk2323sdba';

app.use(basicAuth({
    users: { [ADMIN_USER]: ADMIN_PASS }, 
    challenge: true,
    realm: 'Minecraft Bot Manager',
}));

app.use(express.static(path.join(__dirname, 'public')));

// 2. Cấu hình Server: Cho phép lấy IP/Port từ Biến môi trường
const MC_SERVER = { 
    host: process.env.MC_HOST || '127.0.0.1', // Mặc định là localhost nếu chưa cài
    port: parseInt(process.env.MC_PORT) || 25565 
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

    socket.on('updateConfig', (data) => {
        MC_SERVER.host = data.host;
        MC_SERVER.port = data.port;
        console.log(`📡 Đã đổi Server Target sang: ${MC_SERVER.host}:${MC_SERVER.port}`);
    });

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

    socket.on('sendMassChat', (message) => {
        let delay = 0;
        activeBots.forEach((bot, username) => {
            setTimeout(() => {
                if (bot) bot.chat(message);
            }, delay);
            delay += 500; // Mỗi bot cách nhau 0.5 giây để tránh bị kick spam
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