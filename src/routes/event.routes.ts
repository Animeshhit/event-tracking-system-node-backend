import {Router} from "express";
import {deviceUsers, events} from "../db/schema";
import { db } from "../db";
import { createAEvent } from "../controllers/event.controllers";
import { checkAuth } from "../middlewares/auth.middlewares";


const EventRouter = Router();



EventRouter.post("/events",checkAuth, createAEvent);

// only for testing 
EventRouter.get("/events", async (req, res) => {
    try {
        const eventsFromDb = await db.select().from(events).limit(100);
        res.json(eventsFromDb).status(200);
    }
    catch (err) {
        console.log(err);
        res.json({ message: "internal server error" }).status(500);
    }
});


EventRouter.get("/devices", async (req,res) => {
     try {
        const eventsFromDb = await db.select().from(deviceUsers).limit(100);
        res.json(eventsFromDb).status(200);
    }
    catch (err) {
        console.log(err);
        res.json({ message: "internal server error" }).status(500);
    }
})



export default EventRouter;