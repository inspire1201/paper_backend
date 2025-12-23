import prisma from "../prisma.js";

/**
 * Get all BJP results from the database
 */
export const getAllBjpResults = async (req: any, res: any) => {
    try {
        const results = await prisma.bjp_results_paper.findMany({
            orderBy: {
                election_year: 'asc'
            }
        });

        if (!results || results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No BJP results found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "BJP results fetched successfully",
            data: results
        });

    } catch (error) {
        console.error("Error fetching BJP results:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * Get BJP results by election type (Assembly/Parliament)
 */
export const getBjpResultsByType = async (req: any, res: any) => {
    try {
        const { election_type } = req.params;

        if (!election_type) {
            return res.status(400).json({
                success: false,
                message: "Election type is required"
            });
        }

        const results = await prisma.bjp_results_paper.findMany({
            where: {
                election_type: election_type
            },
            orderBy: {
                election_year: 'asc'
            }
        });

        if (!results || results.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No results found for election type: ${election_type}`
            });
        }

        return res.status(200).json({
            success: true,
            message: "BJP results fetched successfully",
            data: results
        });

    } catch (error) {
        console.error("Error fetching BJP results by type:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * Get BJP results by year
 */
export const getBjpResultsByYear = async (req: any, res: any) => {
    try {
        const { year } = req.params;

        if (!year) {
            return res.status(400).json({
                success: false,
                message: "Year is required"
            });
        }

        const results = await prisma.bjp_results_paper.findMany({
            where: {
                election_year: parseInt(year)
            }
        });

        if (!results || results.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No results found for year: ${year}`
            });
        }

        return res.status(200).json({
            success: true,
            message: "BJP results fetched successfully",
            data: results
        });

    } catch (error) {
        console.error("Error fetching BJP results by year:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
