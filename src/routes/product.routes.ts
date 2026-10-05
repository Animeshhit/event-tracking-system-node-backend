import { Router } from "express";
import {
  getAllProducts,
  getAProduct,
} from "../controllers/products.controllers";

const ProductRouter = Router();

ProductRouter.get("/products", getAllProducts);

ProductRouter.get("/products/:id", getAProduct);

export default ProductRouter;
