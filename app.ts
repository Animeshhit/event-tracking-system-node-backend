import express from "express";
import cors from "cors";
import ProductRoutes from "./src/routes/product.routes";

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/v1",ProductRoutes);















export default app;
