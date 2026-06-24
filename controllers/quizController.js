const db = require('../config/database');

exports.updateXp = async (req, res) => {
    const { userId, gainedXp } = req.body;
    try {
        await db.query('UPDATE users SET xp = xp + ? WHERE id = ?', [gainedXp, userId]);
        const [rows] = await db.query('SELECT xp FROM users WHERE id = ?', [userId]);
        const newXp = rows[0].xp;
        const calcLevel = Math.floor(newXp / 100) + 1;
        await db.query('UPDATE users SET level = ? WHERE id = ?', [calcLevel, userId]);
        
        res.json({ success: true, xp: newXp, level: calcLevel });
    } catch (err) { res.status(500).json({ success: false }); }
};