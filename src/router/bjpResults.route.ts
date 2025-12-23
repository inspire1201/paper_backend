import { Router } from "express";
import {
    getAllBjpResults,
    getBjpResultsByType,
    getBjpResultsByYear
} from "../controller/bjpResults.controller.js";
import { isAuthenticated } from "../middleware/auth.js";

export const bjpResultsRoute = Router();

// Get all BJP results
bjpResultsRoute.get("/all",isAuthenticated, getAllBjpResults);

// Get BJP results by election type (Assembly/Parliament)
bjpResultsRoute.get("/type/:election_type", isAuthenticated,getBjpResultsByType);

// Get BJP results by year
bjpResultsRoute.get("/year/:year", isAuthenticated,getBjpResultsByYear);
