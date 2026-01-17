export const blockBots = (req, res, next) => {
    const userAgent = req.get('User-Agent');

    // Block requests with no User-Agent
    if (!userAgent) {
        return res.status(403).json({ error: 'Access forbidden: No User-Agent provided' });
    }

    const suspiciousUserAgents = [
        'curl', 'wget', 'python-requests', 'scrapy', 'axios', 'go-http-client',
        'java/', 'libwww-perl', 'httpclient', 'okhttp', 'postman'
    ];

    const isSuspicious = suspiciousUserAgents.some(agent =>
        userAgent.toLowerCase().includes(agent.toLowerCase())
    );

    if (isSuspicious) {
        console.warn(`🚫 Blocked suspicious User-Agent: ${userAgent} from IP: ${req.ip}`);
        return res.status(403).json({
            error: 'Access forbidden: Unidentified or suspicious client',
            message: 'Please access this site via a standard web browser.'
        });
    }

    next();
};

export const validateApiParams = (req, res, next) => {
    // Validate 'limit' and 'offset' to prevent database strain
    if (req.query.limit) {
        const limit = parseInt(req.query.limit);
        if (isNaN(limit) || limit < 1 || limit > 100) {
            req.query.limit = 20; // Default fallback
        }
    }

    if (req.query.offset) {
        const offset = parseInt(req.query.offset);
        if (isNaN(offset) || offset < 0) {
            req.query.offset = 0;
        }
    }

    next();
};

export const sanitizeHuggingFaceUrl = (req, res, next) => {
    if (req.path === '/api/huggingface/fetch-images' && req.method === 'POST') {
        const { folder_url } = req.body;

        if (!folder_url || typeof folder_url !== 'string') {
            return res.status(400).json({ error: 'Invalid folder_url' });
        }

        if (folder_url.length > 500) {
            return res.status(400).json({ error: 'URL too long' });
        }

        // Strict pattern check before processing deeper
        // Allows: https://huggingface.co/datasets/owner/repo/tree/branch/path...
        const strictPattern = /^https:\/\/huggingface\.co\/datasets\/[a-zA-Z0-9_\-.]+\/[a-zA-Z0-9_\-.]+\/tree\/[a-zA-Z0-9_\-.]+\/.+$/;

        if (!strictPattern.test(folder_url)) {
            return res.status(400).json({ error: 'Invalid or potentially unsafe HuggingFace URL' });
        }
    }
    next();
};
