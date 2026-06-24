const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Isi semua data!' });
        const hashed = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (name, email, password, xp, level) VALUES (?, ?, ?, 10, 1)', [name, email, hashed]);
        res.json({ success: true, message: 'Registrasi berhasil! Silakan login.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Email sudah terpakai atau server error.' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ success: false, message: 'Email tidak ditemukan!' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        // Fallback khusus demo akun admin@gmail.com / admin123
        if (!isMatch && !(email === 'admin@gmail.com' && password === 'admin123')) {
            return res.status(401).json({ success: false, message: 'Password salah!' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token: token,
            user: { id: user.id, name: user.name, email: user.email, xp: user.xp, level: user.level }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error.' });
    }
};