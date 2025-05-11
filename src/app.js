import express from "express";
import cors from "cors";
const app = express();

app.use(cors({
  origin : process.env.CORS_ORIGIN,
  credentials: true
}));
// middlewares ignored



import userRouter from "./routes/user.routes.js";
app.use('/api/v1/users', userRouter)


export { app }