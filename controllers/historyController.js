const db = require('../config/database');

exports.getHistory = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM history_logs WHERE user_id = ? ORDER BY created_at DESC', [req.params.userId]);
        res.json({ success: true, data: rows });
    } catch (err) { res.status(500).json({ success: false }); }
};

exports.addHistory = async (req, res) => {
    const { userId, mode, content, meta } = req.body;
    try {
        await db.query('INSERT INTO history_logs (user_id, mode, content, meta_info) VALUES (?, ?, ?, ?)', [userId, mode, content, meta]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
};

exports.clearHistory = async (req, res) => {
    try {
        await db.query('DELETE FROM history_logs WHERE user_id = ?', [req.params.userId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
};