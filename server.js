const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Thông tin máy chủ

const MC_SERVER = { host: '180.93.103.76', port: 26700 };

// Lưu trữ trạng thái
let configuredAccounts = []; // Danh sách account do người dùng nhập từ UI
const activeBots = new Map(); // Các bot đang chạy

function createBot(username) {
    if (activeBots.has(username)) return;

    io.emit('botStatus', { username, status: 'connecting' });

    const bot = mineflayer.createBot({
        host: MC_SERVER.host,
        port: MC_SERVER.port,
        username: username,
        version: '1.20.1',
    });

    activeBots.set(username, bot);

    bot.on('spawn', () => {
        console.log(`✅ ${username} đã vào server.`);
        io.emit('botStatus', { username, status: 'online' });
    });

    // bot.on('spawn', () => {
    //     console.log(`✅ ${username} đã vào server.`);
    //     io.emit('botStatus', { username, status: 'online' });

    //     setTimeout(() => bot.chat('/register bach061912 bach061912'), 10000);
    //     setTimeout(() => bot.chat('/login bach061912'), 15000);
    //     setTimeout(() => bot.chat('/rtp'), 35000);
    // });

    bot.on('message', (message) => {
        io.emit('botChat', { username, message: message.toAnsi() });
    });

    bot.on('end', (reason) => {
        console.warn(`🚪 ${username} đã thoát. Lý do: ${reason}`);
        activeBots.delete(username);
        io.emit('botStatus', { username, status: 'offline' });
    });

    bot.on('error', (err) => {
        console.error(`⚠️ ${username}: Lỗi - ${err.message}`);
        bot.end();
    });
}

io.on('connection', (socket) => {
    // Gửi danh sách hiện tại cho client mới kết nối
    socket.emit('init', configuredAccounts.map(u => ({
        username: u,
        status: activeBots.has(u) ? 'online' : 'offline'
    })));

    // Nhận danh sách account từ Web UI
    socket.on('setAccounts', (usernames) => {
        // Gộp danh sách mới và lọc trùng lặp
        configuredAccounts = [...new Set([...configuredAccounts, ...usernames])];

        // Cập nhật lại UI cho tất cả mọi người
        io.emit('init', configuredAccounts.map(u => ({
            username: u,
            status: activeBots.has(u) ? 'online' : 'offline'
        })));
    });

    socket.on('startAll', () => {
        configuredAccounts.forEach((username, i) => {
            setTimeout(() => createBot(username), i * 5000);
        });
    });

    socket.on('stopAll', () => {
        let delay = 0;
        activeBots.forEach((bot, username) => {
            setTimeout(() => {
                if (bot) bot.quit('Tắt từ Web UI');
            }, delay);
            delay += 1000;
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