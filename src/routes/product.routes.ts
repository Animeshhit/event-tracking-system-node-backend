import { Router } from "express";
import {
  getAllProducts,
  getAProduct,
  searchProducts,
} from "../controllers/products.controller";

const ProductRouter = Router();

ProductRouter.get("/products", getAllProducts);
ProductRouter.get("/products/search", searchProducts);

ProductRouter.get("/products/:id", getAProduct);



export default ProductRouter;
