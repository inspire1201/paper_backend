import express from "express";
import { getAllCategoryStatus, getAssemblies, getSurnames, getCasteDetailsByCategory, getAllCasteStatus, getSurnameDetailsByCaste, getAllSurnameSimilarStats, getAllCastesWithCount, getCasteByAssembly } from "../controller/surname.controller.js";

export const surnameRoute = express.Router();

surnameRoute.get("/assemblies", getAssemblies);
surnameRoute.post("/search", getSurnames);
surnameRoute.get("/category", getAllCategoryStatus);
surnameRoute.get("/caste-details", getCasteDetailsByCategory);
surnameRoute.get("/caste", getAllCasteStatus);
surnameRoute.get("/surname-details", getSurnameDetailsByCaste);
surnameRoute.get("/surname-similar", getAllSurnameSimilarStats);

// In Area Search - By Caste
surnameRoute.get("/by-caste/all", getAllCastesWithCount);
surnameRoute.get("/by-caste/assembly", getCasteByAssembly);
