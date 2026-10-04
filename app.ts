import express from "express";
import cors from "cors";


const app = express();

// middlewares 
app.use(cors());
app.use(express.json());


app.get("/",(req,res) => {
    res.json({message:"hello world"});
})









export default app;