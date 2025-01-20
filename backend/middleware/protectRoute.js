//protectRoute
import User from "../models/user.model.js";
//Error in protectRoute middleware jwt is not defined
//answer import jwt
import jwt from 'jsonwebtoken';

export const protectRoute = async (req, res, next) => {
    try {
        // Extract the JWT from cookies
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ error: "Unauthorized: no token provided" });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ error: "Unauthorized: invalid token" });
        }

        // Find the user by ID from the decoded token
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Attach the user to the request object
        req.user = user;
        next();
    } catch (error) {
        console.log("Error in protectRoute middleware", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
