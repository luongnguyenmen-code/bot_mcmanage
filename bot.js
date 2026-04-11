const mineflayer = require('mineflayer');

// Danh sách tài khoản (10 tài khoản)
const accounts = [
    { username: 'Atuan87' },
    { username: 'KhanhLinh86' }, 
    { username: 'Duyne902' }, 
    { username: 'Umie' }, 
    { username: 'hanixinh'},
    // { username: 'Nikita123' }, 
    // { username: 'TGamer' },
    // { username: 'Gamerule99' }, 
    // { username: 'Gacontv' }, 
    // { username: 'Tinhtuti' },
    // { username: 'hep123' }, 
    // { username: 'nooblaem' },
    // { username: 'Skymai' },
    // { username: 'ThoSanConGa' },
    // { username: 'DragonFury' },
    // { username: 'Myee' },
    // { username: 'Warrio' },
    // { username: 'IceQueen' },
    // { username: 'FireLord' },
    // { username: 'Tuan12' },
    // { username: 'Lockute' },
    // { username: 'manh61' },
    // { username: 'NightShade' },
    // { username: 'StormBreaker' },
    // { username: 'ThunderBolt' },
    // { username: 'PhoenixRising' },
    // { username: 'EagleEye' },
    // { username: 'SilentAssassin' },
    // { username: 'GoldenKnight' },
    // { username: 'SilverWolf' },
    // { username: 'CrimsonRogue' },
    // { username: 'VenomousViper' },
    // { username: 'TitanSlayer' },
    // { username: 'FrostBite' },
    // { username: 'CelestialStar' },
    // { username: 'NebulaDreamer' },
    // { username: 'CosmicVoyager' },
    // { username: 'DuskBringer' },
    // { username: 'GlacierGiant' },
    // { username: 'VortexWarrior' },
    // { username: 'LunarEclipse' },
    // { username: 'DarkKnight' },
    // { username: 'SteelPaladin' },
    // { username: 'RogueAssassin' },
    // { username: 'BlazingSword' },
    // { username: 'WildSpirit' },
    // { username: 'AncientGuardian' },
    // { username: 'StormChaser' },
    // { username: 'RadiantMage' },
    // { username: 'WraithShadow' },
    // { username: 'MysticWarlock' },
    // { username: 'FallenHero' },
    // { username: 'DemonHunter' },
    // { username: 'ChaosWarrior' },
]


// Thông tin máy chủ Minecraft
const server = {
    host: '180.93.103.76',
    port: 26700, // 25521 , 25616 pe 25606
};

// Số lần thử kết nối lại
const maxReconnectAttempts = 5;
const connectionDelay = 15000
function createBot(account, attempt = 1) {
    const bot = mineflayer.createBot({
        host: server.host,
        port: server.port,
        username: account.username,
        version: '1.21.4',
        brand: 'vanilla'
    });

    bot.on('spawn', () => {
        console.log(`✅ ${account.username} đã vào server.`);
        // setTimeout(() => bot.chat('/register menvip123 menvip123'), 5000);
        setTimeout(() => bot.chat('/login menvip123'), 1000);
       
    });

    bot.on('end', (reason) => {
        console.warn(`🚪 ${account.username} đã thoát! Lý do: ${reason}`);
        if (attempt < maxReconnectAttempts) {
            let delay = Math.random() * 15000 + 5000; // Chờ từ 5 - 20 giây để tránh spam
            console.log(`🔁 Thử kết nối lại trong ${delay / 1000} giây... (${attempt}/${maxReconnectAttempts})`);
            setTimeout(() => createBot(account, attempt + 1), delay);
        } else {
            console.error(`❌ ${account.username} đã đạt giới hạn kết nối lại.`);
        }
    });

    bot.on('error', (err) => {
        console.error(`⚠️ ${account.username}: Lỗi - ${err.message}`);
        bot.end();
    });
}
// Chạy bot với độ trễ ngẫu nhiên để tránh bị server phát hiện spam
(async () => {
    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        let delay = Math.random() * 3000 + connectionDelay; // Ngẫu nhiên từ 5-8 giây mỗi bot
        console.log(`🚀 Khởi động bot ${account.username} sau ${delay / 1000} giây...`);
        setTimeout(() => createBot(account), delay * i);
    }
})();
