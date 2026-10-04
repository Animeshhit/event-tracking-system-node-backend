import express from "express";
import cors from "cors";
import ProductRoutes from "./src/routes/product.routes";
import EventRoutes from "./src/routes/event.routes";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



app.use("/api/v1",ProductRoutes);
app.use("/api/v1",EventRoutes);











export default app;
