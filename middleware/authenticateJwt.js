const jwt = require("jsonwebtoken");
const privateKey = "somesecret@keyfor-users-and-admins-alike";

function authenticateJwt(req, res, next) {
  const authHeader = req.headers.authorization || null;

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, privateKey, (err, user) => {
      if (err) {
        res.status(403).json({ message: "invalid token" });
      } else {
        req.user = user;
        next();
      }
    });
  } else {
    res.status(403).json({ message: "token missing" });
  }
}

module.exports = { authenticateJwt, privateKey };
