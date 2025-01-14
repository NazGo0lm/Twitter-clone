//console.log("server is running ss");

import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js"
import connectMongoDB from "./db/connectMongoDB.js";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json()); //to parse req.body
app.use(express.urlencoded({ extended: true })); //to parse data(urlcoded)

app.use(cookieParser());
/* app.get('/', (req, res) => {
    res.send("server is ready");
}) */

app.use("/api/auth", authRoutes);


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectMongoDB();
})











