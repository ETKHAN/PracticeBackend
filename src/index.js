import connectDB from "./db/connectDB.js";
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config({
  path : "./env"
});

connectDB()
.then(() => {


  // app.on()
  app.listen(process.env.PORT || 8000 , () => {
    console.log(`server is running on http://localhost:${process.env.PORT}/`);
  })
})
.catch(err => {
  console.log("MONGODB CONNECTION FAILED: ",err);
})



