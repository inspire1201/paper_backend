import { Router } from "express";
import {

    getPositionWiseAnalytics,
    getPositionDetailsByParty,

} from "../controller/electionResults.controller.js";
import { isAuthenticated } from "../middleware/auth.js";

export const electionResultsRoute = Router();

// Get position-wise analytics (main endpoint for the analytics page)
electionResultsRoute.get("/analytics/:position", isAuthenticated, getPositionWiseAnalytics);

// Get detailed position data by party and year
electionResultsRoute.get("/details", isAuthenticated, getPositionDetailsByParty);

