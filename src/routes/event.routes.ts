import {Router} from "express";
import {deviceUsers, events} from "../db/schema";
import { db } from "../db";
import { createAEvent, getEvents } from "../controllers/event.controller";
import { checkAuth } from "../middlewares/auth.middlewares";


const EventRouter = Router();



EventRouter.post("/events",checkAuth, createAEvent);

EventRouter.get(
  "/events",
  checkAuth,
  getEvents,
);

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