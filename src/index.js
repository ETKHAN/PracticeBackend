import connectDB from "./db/connectDB.js";
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import dotenv from "dotenv";

dotenv.config({
  path : "./env"
});

connectDB();




