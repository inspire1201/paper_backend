import { Router } from "express";
import { login } from "../controller/auth.controller.js";

export  const authRoute = Router();


    authRoute.post("/login",login);
