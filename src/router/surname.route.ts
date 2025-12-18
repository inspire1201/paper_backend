import express from "express";
import { getAllCategoryStatus, getAssemblies, getSurnames, getCasteDetailsByCategory, getAllCasteStatus, getSurnameDetailsByCaste, getAllSurnameSimilarStats, getAllCastesWithCount, getCasteByAssembly, getAllCategoriesWithCount, getCategoryByAssembly, getAllAssemblyCasteDetail } from "../controller/surname.controller.js";
import { isAuthenticated } from "../middleware/auth.js";

export const surnameRoute = express.Router();

surnameRoute.get("/assemblies", isAuthenticated, getAssemblies);
surnameRoute.post("/search", isAuthenticated, getSurnames);
surnameRoute.get("/category", isAuthenticated, getAllCategoryStatus);
surnameRoute.get("/caste-details", isAuthenticated, getCasteDetailsByCategory);
surnameRoute.get("/caste", isAuthenticated, getAllCasteStatus);
surnameRoute.get("/surname-details", isAuthenticated, getSurnameDetailsByCaste);
surnameRoute.get("/surname-similar", isAuthenticated, getAllSurnameSimilarStats);

// In Area Search - By Caste
surnameRoute.get("/by-caste/all", isAuthenticated, getAllCastesWithCount);
surnameRoute.get("/by-caste/assembly", isAuthenticated, getCasteByAssembly);

// In Area Search - By Category
surnameRoute.get("/by-category/all", isAuthenticated, getAllCategoriesWithCount);
surnameRoute.get("/by-category/assembly", isAuthenticated, getCategoryByAssembly);

// Assembly Caste Detail
// surnameRoute.get("/assembly-caste-detail", isAuthenticated, getAllAssemblyCasteDetail);
surnameRoute.get("/assembly-caste-detail", getAllAssemblyCasteDetail);
