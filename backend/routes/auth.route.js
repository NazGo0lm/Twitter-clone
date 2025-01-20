import express from "express";
import { getMe, login, logout, signup } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();


//GET routes
router.get("/me", protectRoute ,getMe);

// Use POST for signup and login routes 
router.post("/signup", signup); 
router.post("/login", login); //

router.post("/logout", logout);



export default router;






