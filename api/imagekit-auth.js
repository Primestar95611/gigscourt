export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
        
        if (!privateKey) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        
        const expire = Math.floor(Date.now() / 1000) + 60;

        const crypto = require('crypto');
        const signature = crypto
            .createHmac('sha1', privateKey)
            .update(token + expire)
            .digest('hex');

        res.status(200).json({
            token: token,
            expire: expire,
            signature: signature
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to generate authentication' });
    }
}
