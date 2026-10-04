import express from "express";
import cors from "cors";
import { db } from "./src/db";
import {products} from "./src/db/schema";

const app = express();

app.use(cors());
app.use(express.json());


app.get("/",async (req,res) => {    
    try{
        let productsDataFromDatabase = await db.select().from(products);
        res.json(productsDataFromDatabase).status(200);
    }
    catch(err){
        console.log(err);
        res.json({message:"something went wrong"}).status(500);
    }
})











export default app;
