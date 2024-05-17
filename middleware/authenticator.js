const authenticator = (req, res, next) => {
    const authHeader = req.get('Authorization');
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);

    if (token !== process.env.ACCESS_TOKEN_SECRET) return res.sendStatus(403);

    next();
};

module.exports = authenticator;