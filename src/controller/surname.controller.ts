import { Request, Response } from "express";
import prisma from "../prisma.js";

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate and sanitize assembly_id parameter
 */
const validateAssemblyId = (assembly_id: any): { isValid: boolean; error?: string } => {
    if (!assembly_id) {
        return { isValid: true }; // Optional parameter
    }

    if (assembly_id === 'all') {
        return { isValid: true };
    }

    // Check for comma-separated values
    if (typeof assembly_id === 'string' && assembly_id.includes(',')) {
        const ids = assembly_id.split(',');
        for (const id of ids) {
            const trimmedId = id.trim();
            if (!/^\d+$/.test(trimmedId)) {
                return { isValid: false, error: 'Assembly IDs must be numeric' };
            }
            const numId = parseInt(trimmedId);
            if (numId < 1 || numId > 999999) {
                return { isValid: false, error: 'Assembly ID out of valid range' };
            }
        }
        return { isValid: true };
    }

    // Single value
    if (!/^\d+$/.test(String(assembly_id))) {
        return { isValid: false, error: 'Assembly ID must be numeric' };
    }

    const numId = parseInt(String(assembly_id));
    if (numId < 1 || numId > 999999) {
        return { isValid: false, error: 'Assembly ID out of valid range' };
    }

    return { isValid: true };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (page: any, limit: any): { isValid: boolean; error?: string; page?: number; limit?: number } => {
    const pageNum = parseInt(String(page || 1));
    const limitNum = parseInt(String(limit || 100));

    if (isNaN(pageNum) || pageNum < 1) {
        return { isValid: false, error: 'Page must be a positive integer' };
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        return { isValid: false, error: 'Limit must be between 1 and 1000' };
    }

    return { isValid: true, page: pageNum, limit: limitNum };
};

/**
 * Validate and sanitize string parameter
 */
const validateStringParam = (param: any, paramName: string, required: boolean = true): { isValid: boolean; error?: string; value?: string } => {
    if (!param || param.trim() === '') {
        if (required) {
            return { isValid: false, error: `${paramName} is required` };
        }
        return { isValid: true, value: '' };
    }

    const trimmed = String(param).trim();

    // Check for SQL injection patterns
    const sqlInjectionPattern = /('|(\-\-)|(;)|(\|\|)|(\*)|(\bOR\b)|(\bAND\b)|(\bUNION\b)|(\bSELECT\b)|(\bDROP\b)|(\bINSERT\b)|(\bUPDATE\b)|(\bDELETE\b))/i;
    if (sqlInjectionPattern.test(trimmed)) {
        return { isValid: false, error: `${paramName} contains invalid characters` };
    }

    if (trimmed.length > 255) {
        return { isValid: false, error: `${paramName} is too long (max 255 characters)` };
    }

    return { isValid: true, value: trimmed };
};

/**
 * Validate view_mode parameter
 */
const validateViewMode = (view_mode: any): { isValid: boolean; error?: string; value?: string } => {
    if (!view_mode) {
        return { isValid: true, value: 'separate' };
    }

    const validModes = ['separate', 'combined'];
    const mode = String(view_mode).toLowerCase().trim();

    if (!validModes.includes(mode)) {
        return { isValid: false, error: 'view_mode must be either "separate" or "combined"' };
    }

    return { isValid: true, value: mode };
};


export const getAssemblies = async (req: Request, res: Response) => {
    try {
        const assemblies = await prisma.assembly_vandan.findMany({
            orderBy: {
                assembly_name: "asc",
            },
        });
        res.status(200).json({ success: true, data: assemblies });
    } catch (error) {
        console.error("Error fetching assemblies:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getSurnames = async (req: Request, res: Response) => {
    try {
        const { assembly_id, page = 1, limit = 100 } = req.body;

        // Validate assembly_id
        const assemblyValidation = validateAssemblyId(assembly_id);
        if (!assemblyValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: assemblyValidation.error
            });
        }

        // Validate pagination
        const paginationValidation = validatePagination(page, limit);
        if (!paginationValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: paginationValidation.error
            });
        }

        const pageNum = paginationValidation.page!;
        const limitNum = paginationValidation.limit!;

        // Use a dynamic where clause
        const whereClause: any = {};

        // Logic: If specific assembly selected, filter by it.
        if (assembly_id && assembly_id !== "" && assembly_id !== "all") {
            whereClause.assembly_no = parseInt(assembly_id);
        }

        const skip = (pageNum - 1) * limitNum;

        // Count total based on filters
        const totalCount = await prisma.tbl_all_surname.count({
            where: whereClause,
        });

        const data = await prisma.tbl_all_surname.findMany({
            where: whereClause,
            take: limitNum,
            skip: skip,
            orderBy: {
                count_num: 'desc' // Sort by count descending (Top Surnames)
            },
            select: {
                id: true,
                surname: true,
                surname_caste: true,
                surname_category: true,
                assembly_no: true,
                count_num: true
                // Excluding updation_date explicitly
            }
        });

        res.status(200).json({
            success: true,
            count: totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
            currentPage: pageNum,
            data
        });
    } catch (error) {
        console.error("Error searching surnames:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



// ============================================================================
// HELPER FUNCTION: Build filter for assembly selection
// ============================================================================
const buildAssemblyFilter = (assembly_id: string) => {
    let filter: any = {};

    if (assembly_id && assembly_id !== 'all') {
        if (assembly_id.includes(',')) {
            // Multiple assemblies: "1,2,3"
            const assemblyIds = assembly_id.split(',').map((id: string) => {
                const parsed = parseInt(id.trim());
                if (isNaN(parsed)) {
                    throw new Error('Invalid assembly ID format');
                }
                return parsed;
            });
            filter.assembly_no = { in: assemblyIds };
        } else {
            // Single assembly: "1"
            const parsed = parseInt(assembly_id);
            if (isNaN(parsed)) {
                throw new Error('Invalid assembly ID format');
            }
            filter.assembly_no = parsed;
        }
    }

    return filter;
};

// ============================================================================
// HELPER FUNCTION: Get assembly details
// ============================================================================
const getAssemblyDetails = async (assemblyNumbers: number[]) => {
    const assemblyList = await prisma.assembly_vandan.findMany({
        where: {
            assembly_id: { in: assemblyNumbers }
        },
        select: {
            id: true,
            assembly_id: true,
            assembly_name: true
        }
    });

    return new Map(
        assemblyList.map(assembly => [assembly.assembly_id, assembly])
    );
};

// ============================================================================
// CONTROLLER 1: Get Category Stats - SEPARATE VIEW (From Each)
// ============================================================================
export const getCategoryStatsSeparate = async (req: any, res: any) => {
    try {
        const { assembly_id } = req.query;

        // Validate assembly_id
        const assemblyValidation = validateAssemblyId(assembly_id);
        if (!assemblyValidation.isValid) {
            return res.status(400).json({
                error: 'Invalid assembly_id',
                message: assemblyValidation.error
            });
        }

        const filter = buildAssemblyFilter(assembly_id);

        // Get category statistics grouped by assembly and category using raw SQL
        let categoryStats: any[];

        if (filter.assembly_no && filter.assembly_no.in) {
            const assemblyIds = filter.assembly_no.in.join(',');
            categoryStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_category,
                    assembly_no,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no IN (${assemblyIds})
                  AND surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY surname_category, assembly_no
                ORDER BY assembly_no ASC
            `);
        } else if (filter.assembly_no) {
            const assemblyId = filter.assembly_no;
            categoryStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_category,
                    assembly_no,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no = ${assemblyId}
                  AND surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY surname_category, assembly_no
                ORDER BY assembly_no ASC
            `);
        } else {
            categoryStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_category,
                    assembly_no,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY surname_category, assembly_no
                ORDER BY assembly_no ASC
            `);
        }

        // Count distinct castes per (assembly, category) using raw SQL
        // This is much more efficient than fetching all records and counting in memory
        let casteCounts: any[];

        if (filter.assembly_no && filter.assembly_no.in) {
            // Multiple assemblies selected
            const assemblyIds = filter.assembly_no.in.join(',');
            casteCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    assembly_no,
                    surname_category,
                    COUNT(DISTINCT surname_caste) as caste_count
                FROM tbl_all_surname
                WHERE assembly_no IN (${assemblyIds})
                  AND surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY assembly_no, surname_category
            `);
        } else if (filter.assembly_no) {
            // Single assembly selected
            const assemblyId = filter.assembly_no;
            casteCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    assembly_no,
                    surname_category,
                    COUNT(DISTINCT surname_caste) as caste_count
                FROM tbl_all_surname
                WHERE assembly_no = ${assemblyId}
                  AND surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY assembly_no, surname_category
            `);
        } else {
            // All assemblies
            casteCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    assembly_no,
                    surname_category,
                    COUNT(DISTINCT surname_caste) as caste_count
                FROM tbl_all_surname
                WHERE surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY assembly_no, surname_category
            `);
        }

        // Build map from the count results
        const casteCountMap = new Map<string, number>();
        casteCounts.forEach((record: any) => {
            const key = `${record.assembly_no}_${record.surname_category}`;
            casteCountMap.set(key, Number(record.caste_count));
        });

        // Get assembly information
        const assemblyNumbers = [...new Set(categoryStats.map(item => item.assembly_no))];
        const assemblyMap = await getAssemblyDetails(assemblyNumbers);

        // Build result grouped by assembly
        const resultByAssembly: any = {};

        categoryStats.forEach(item => {
            const assemblyNo = item.assembly_no;

            if (!resultByAssembly[assemblyNo]) {
                resultByAssembly[assemblyNo] = {
                    assembly: assemblyMap.get(assemblyNo),
                    stats: []
                };
            }

            const key = `${assemblyNo}_${item.surname_category}`;
            const totalCast = casteCountMap.get(key) || 0;

            resultByAssembly[assemblyNo].stats.push({
                surname_category: item.surname_category,
                total_count: Number(item.total_count),
                total_cast: totalCast
            });
        });

        const result = Object.values(resultByAssembly);

        // If single assembly, return single object
        if (assembly_id && assembly_id !== 'all' && !assembly_id.includes(',')) {
            return res.status(200).json(result[0] || { assembly: null, stats: [] });
        }

        // For multiple assemblies, return array
        return res.status(200).json(result);

    } catch (error: any) {
        console.error('Error in getCategoryStatsSeparate:', error);
        return res.status(500).json({
            error: 'Failed to fetch category statistics',
            message: error.message
        });
    }
};

// ============================================================================
// CONTROLLER 2: Get Category Stats - COMBINED VIEW (From All)
// ============================================================================
export const getCategoryStatsCombined = async (req: any, res: any) => {
    try {
        const { assembly_id } = req.query;

        // Validate assembly_id
        const assemblyValidation = validateAssemblyId(assembly_id);
        if (!assemblyValidation.isValid) {
            return res.status(400).json({
                error: 'Invalid assembly_id',
                message: assemblyValidation.error
            });
        }

        const filter = buildAssemblyFilter(assembly_id);


        // Get category statistics using raw SQL
        let categoryStats: any[];

        if (filter.assembly_no && filter.assembly_no.in) {
            const assemblyIds = filter.assembly_no.in.join(',');
            categoryStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_category,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no IN (${assemblyIds})
                  AND surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY surname_category
            `);
        } else if (filter.assembly_no) {
            const assemblyId = filter.assembly_no;
            categoryStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_category,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no = ${assemblyId}
                  AND surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY surname_category
            `);
        } else {
            categoryStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_category,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY surname_category
            `);
        }

        // Count distinct castes per category using raw SQL (much faster!)
        let casteCounts: any[];

        if (filter.assembly_no && filter.assembly_no.in) {
            // Multiple assemblies selected
            const assemblyIds = filter.assembly_no.in.join(',');
            casteCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_category,
                    COUNT(DISTINCT surname_caste) as caste_count
                FROM tbl_all_surname
                WHERE assembly_no IN (${assemblyIds})
                  AND surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY surname_category
            `);
        } else if (filter.assembly_no) {
            // Single assembly selected
            const assemblyId = filter.assembly_no;
            casteCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_category,
                    COUNT(DISTINCT surname_caste) as caste_count
                FROM tbl_all_surname
                WHERE assembly_no = ${assemblyId}
                  AND surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY surname_category
            `);
        } else {
            // All assemblies
            casteCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_category,
                    COUNT(DISTINCT surname_caste) as caste_count
                FROM tbl_all_surname
                WHERE surname_category IS NOT NULL
                  AND surname_category != ''
                GROUP BY surname_category
            `);
        }

        console.log("castcount", casteCounts);
        // Build map from the count results
        const CastCountInCategory: any = {};
        casteCounts.forEach((record: any) => {
            CastCountInCategory[record.surname_category] = Number(record.caste_count);
        });

        // Convert to array format
        const statsArray = categoryStats.map(item => ({
            surname_category: item.surname_category,
            total_count: Number(item.total_count) || 0,
            total_cast: CastCountInCategory[item.surname_category] || 0
        }));

        // Sort by count (highest first)
        statsArray.sort((a: any, b: any) => b.total_count - a.total_count);

        // Create combined assembly info
        const combinedAssembly = {
            id: 0,
            assembly_id: 0,
            assembly_name: 'All Assemblies Combined'
        };

        return res.status(200).json({
            assembly: combinedAssembly,
            stats: statsArray,
            isCombined: true
        });

    }
    catch (error: any) {
        console.error('Error in getCategoryStatsCombined:', error);
        return res.status(500).json({
            error: 'Failed to fetch combined category statistics',
            message: error.message
        });
    }
};

// ============================================================================
// MAIN CONTROLLER: Route to appropriate view controller
// ============================================================================
export const getAllCategoryStatus = async (req: any, res: any) => {
    const { assembly_id, view_mode = 'separate' } = req.query;

    // Validate assembly_id
    const assemblyValidation = validateAssemblyId(assembly_id);
    if (!assemblyValidation.isValid) {
        return res.status(400).json({
            error: 'Invalid assembly_id',
            message: assemblyValidation.error
        });
    }

    // Validate view_mode
    const viewModeValidation = validateViewMode(view_mode);
    if (!viewModeValidation.isValid) {
        return res.status(400).json({
            error: 'Invalid view_mode',
            message: viewModeValidation.error
        });
    }

    // Determine if combined view should be used
    const shouldCombine = viewModeValidation.value === 'combined' &&
        (assembly_id === 'all' || (assembly_id && assembly_id.includes(',')));

    if (shouldCombine) {
        return getCategoryStatsCombined(req, res);
    } else {
        return getCategoryStatsSeparate(req, res);
    }
};
export const getCasteDetailsByCategory = async (req: any, res: any) => {
    try {
        const { assembly_id, category } = req.query;

        // Validate category
        const categoryValidation = validateStringParam(category, 'Category', true);
        if (!categoryValidation.isValid) {
            return res.status(400).json({
                error: categoryValidation.error
            });
        }

        // Validate assembly_id
        const assemblyValidation = validateAssemblyId(assembly_id);
        if (!assemblyValidation.isValid) {
            return res.status(400).json({
                error: 'Invalid assembly_id',
                message: assemblyValidation.error
            });
        }

        // Build the where clause
        let whereClause: any = {
            surname_category: category
        };

        // Handle assembly filtering
        if (assembly_id && assembly_id !== 'all') {
            if (assembly_id.includes(',')) {
                // Multiple assemblies
                const assemblyIds = assembly_id.split(',').map((id: string) => parseInt(id.trim()));
                whereClause.assembly_no = {
                    in: assemblyIds
                };
            } else {
                // Single assembly
                whereClause.assembly_no = parseInt(assembly_id);
            }
        }


        // Get caste data grouped by caste name
        const casteStats = await prisma.tbl_all_surname.groupBy({
            by: ['surname_caste'],
            where: whereClause,
            _sum: {
                count_num: true
            },
            orderBy: {
                _sum: {
                    count_num: 'desc'
                }
            }
        });

        // Format the response
        const casteDetails = casteStats.map(item => ({
            caste_name: item.surname_caste,
            count: item._sum.count_num || 0
        }));

        return res.status(200).json({
            category: category,
            total_castes: casteDetails.length,
            castes: casteDetails
        });

    } catch (error: any) {
        console.error('Error in getCasteDetailsByCategory:', error);
        return res.status(500).json({
            error: 'Failed to fetch caste details',
            message: error.message
        });
    }
}




// ============================================================================
// CASTE SEARCH CONTROLLERS
// ============================================================================

// ============================================================================
// CONTROLLER 1: Get Caste Stats - SEPARATE VIEW (From Each)
// ============================================================================
export const getCasteStatsSeparate = async (req: any, res: any) => {
    try {
        const { assembly_id } = req.query;

        // Validate assembly_id
        const assemblyValidation = validateAssemblyId(assembly_id);
        if (!assemblyValidation.isValid) {
            return res.status(400).json({
                error: 'Invalid assembly_id',
                message: assemblyValidation.error
            });
        }

        const filter = buildAssemblyFilter(assembly_id);

        // Get caste statistics grouped by assembly and caste using raw SQL
        let casteStats: any[];

        if (filter.assembly_no && filter.assembly_no.in) {
            const assemblyIds = filter.assembly_no.in.join(',');
            casteStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_caste,
                    assembly_no,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no IN (${assemblyIds})
                  AND surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY surname_caste, assembly_no
                ORDER BY assembly_no ASC
            `);
        } else if (filter.assembly_no) {
            const assemblyId = filter.assembly_no;
            casteStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_caste,
                    assembly_no,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no = ${assemblyId}
                  AND surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY surname_caste, assembly_no
                ORDER BY assembly_no ASC
            `);
        } else {
            casteStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_caste,
                    assembly_no,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY surname_caste, assembly_no
                ORDER BY assembly_no ASC
            `);
        }

        // Count distinct surname_similar per (assembly, caste) using raw SQL
        let similarCounts: any[];

        if (filter.assembly_no && filter.assembly_no.in) {
            // Multiple assemblies selected
            const assemblyIds = filter.assembly_no.in.join(',');
            similarCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    assembly_no,
                    surname_caste,
                    COUNT(DISTINCT surname_similar) as similar_count
                FROM tbl_all_surname
                WHERE assembly_no IN (${assemblyIds})
                  AND surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY assembly_no, surname_caste
            `);
        } else if (filter.assembly_no) {
            // Single assembly selected
            const assemblyId = filter.assembly_no;
            similarCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    assembly_no,
                    surname_caste,
                    COUNT(DISTINCT surname_similar) as similar_count
                FROM tbl_all_surname
                WHERE assembly_no = ${assemblyId}
                  AND surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY assembly_no, surname_caste
            `);
        } else {
            // All assemblies
            similarCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    assembly_no,
                    surname_caste,
                    COUNT(DISTINCT surname_similar) as similar_count
                FROM tbl_all_surname
                WHERE surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY assembly_no, surname_caste
            `);
        }

        // Build map from the count results
        const similarCountMap = new Map<string, number>();
        similarCounts.forEach((record: any) => {
            const key = `${record.assembly_no}_${record.surname_caste}`;
            similarCountMap.set(key, Number(record.similar_count));
        });

        // Get assembly information
        const assemblyNumbers = [...new Set(casteStats.map(item => item.assembly_no))];
        const assemblyMap = await getAssemblyDetails(assemblyNumbers);

        // Build result grouped by assembly
        const resultByAssembly: any = {};

        casteStats.forEach(item => {
            const assemblyNo = item.assembly_no;

            if (!resultByAssembly[assemblyNo]) {
                resultByAssembly[assemblyNo] = {
                    assembly: assemblyMap.get(assemblyNo),
                    stats: []
                };
            }

            const key = `${assemblyNo}_${item.surname_caste}`;
            const totalSimilar = similarCountMap.get(key) || 0;

            resultByAssembly[assemblyNo].stats.push({
                surname_caste: item.surname_caste,
                total_count: Number(item.total_count),
                total_similar: totalSimilar
            });
        });

        const result = Object.values(resultByAssembly);

        // If single assembly, return single object
        if (assembly_id && assembly_id !== 'all' && !assembly_id.includes(',')) {
            return res.status(200).json(result[0] || { assembly: null, stats: [] });
        }

        // For multiple assemblies, return array
        return res.status(200).json(result);

    } catch (error: any) {
        console.error('Error in getCasteStatsSeparate:', error);
        return res.status(500).json({
            error: 'Failed to fetch caste statistics',
            message: error.message
        });
    }
};

// ============================================================================
// CONTROLLER 2: Get Caste Stats - COMBINED VIEW (From All)
// ============================================================================
export const getCasteStatsCombined = async (req: any, res: any) => {
    try {
        const { assembly_id } = req.query;

        // Validate assembly_id
        const assemblyValidation = validateAssemblyId(assembly_id);
        if (!assemblyValidation.isValid) {
            return res.status(400).json({
                error: 'Invalid assembly_id',
                message: assemblyValidation.error
            });
        }

        const filter = buildAssemblyFilter(assembly_id);

        // Get caste statistics using raw SQL
        let casteStats: any[];

        if (filter.assembly_no && filter.assembly_no.in) {
            const assemblyIds = filter.assembly_no.in.join(',');
            casteStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_caste,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no IN (${assemblyIds})
                  AND surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY surname_caste
            `);
        } else if (filter.assembly_no) {
            const assemblyId = filter.assembly_no;
            casteStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_caste,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no = ${assemblyId}
                  AND surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY surname_caste
            `);
        } else {
            casteStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_caste,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY surname_caste
            `);
        }

        // Count distinct surname_similar per caste using raw SQL (much faster!)
        let similarCounts: any[];

        if (filter.assembly_no && filter.assembly_no.in) {
            // Multiple assemblies selected
            const assemblyIds = filter.assembly_no.in.join(',');
            similarCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_caste,
                    COUNT(DISTINCT surname_similar) as similar_count
                FROM tbl_all_surname
                WHERE assembly_no IN (${assemblyIds})
                  AND surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY surname_caste
            `);
        } else if (filter.assembly_no) {
            // Single assembly selected
            const assemblyId = filter.assembly_no;
            similarCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_caste,
                    COUNT(DISTINCT surname_similar) as similar_count
                FROM tbl_all_surname
                WHERE assembly_no = ${assemblyId}
                  AND surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY surname_caste
            `);
        } else {
            // All assemblies
            similarCounts = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_caste,
                    COUNT(DISTINCT surname_similar) as similar_count
                FROM tbl_all_surname
                WHERE surname_caste IS NOT NULL
                  AND surname_caste != ''
                GROUP BY surname_caste
            `);
        }

        // Build map from the count results
        const SimilarCountInCaste: any = {};
        similarCounts.forEach((record: any) => {
            SimilarCountInCaste[record.surname_caste] = Number(record.similar_count);
        });

        // Convert to array format
        const statsArray = casteStats.map(item => ({
            surname_caste: item.surname_caste,
            total_count: Number(item.total_count) || 0,
            total_similar: SimilarCountInCaste[item.surname_caste] || 0
        }));

        // Sort by count (highest first)
        statsArray.sort((a: any, b: any) => b.total_count - a.total_count);

        // Create combined assembly info
        const combinedAssembly = {
            id: 0,
            assembly_id: 0,
            assembly_name: 'All Assemblies Combined'
        };

        return res.status(200).json({
            assembly: combinedAssembly,
            stats: statsArray,
            isCombined: true
        });

    }
    catch (error: any) {
        console.error('Error in getCasteStatsCombined:', error);
        return res.status(500).json({
            error: 'Failed to fetch combined caste statistics',
            message: error.message
        });
    }
};

// ============================================================================
// MAIN CONTROLLER: Route to appropriate view controller
// ============================================================================
export const getAllCasteStatus = async (req: any, res: any) => {
    const { assembly_id, view_mode = 'separate' } = req.query;

    // Validate assembly_id
    const assemblyValidation = validateAssemblyId(assembly_id);
    if (!assemblyValidation.isValid) {
        return res.status(400).json({
            error: 'Invalid assembly_id',
            message: assemblyValidation.error
        });
    }

    // Validate view_mode
    const viewModeValidation = validateViewMode(view_mode);
    if (!viewModeValidation.isValid) {
        return res.status(400).json({
            error: 'Invalid view_mode',
            message: viewModeValidation.error
        });
    }

    // Determine if combined view should be used
    const shouldCombine = viewModeValidation.value === 'combined' &&
        (assembly_id === 'all' || (assembly_id && assembly_id.includes(',')));

    if (shouldCombine) {
        return getCasteStatsCombined(req, res);
    } else {
        return getCasteStatsSeparate(req, res);
    }
};

// ============================================================================
// Get Surname Similar Details by Caste
// ============================================================================
export const getSurnameDetailsByCaste = async (req: any, res: any) => {
    try {
        const { assembly_id, caste } = req.query;

        // Validate caste
        const casteValidation = validateStringParam(caste, 'Caste', true);
        if (!casteValidation.isValid) {
            return res.status(400).json({
                error: casteValidation.error
            });
        }

        // Validate assembly_id
        const assemblyValidation = validateAssemblyId(assembly_id);
        if (!assemblyValidation.isValid) {
            return res.status(400).json({
                error: 'Invalid assembly_id',
                message: assemblyValidation.error
            });
        }

        // Build the where clause
        let whereClause: any = {
            surname_caste: caste
        };

        // Handle assembly filtering
        if (assembly_id && assembly_id !== 'all') {
            if (assembly_id.includes(',')) {
                // Multiple assemblies
                const assemblyIds = assembly_id.split(',').map((id: string) => parseInt(id.trim()));
                whereClause.assembly_no = {
                    in: assemblyIds
                };
            } else {
                // Single assembly
                whereClause.assembly_no = parseInt(assembly_id);
            }
        }

        // Get surname_similar data grouped by surname_similar name
        const surnameStats = await prisma.tbl_all_surname.groupBy({
            by: ['surname_similar'],
            where: whereClause,
            _sum: {
                count_num: true
            },
            orderBy: {
                _sum: {
                    count_num: 'desc'
                }
            }
        });

        // Format the response
        const surnameDetails = surnameStats.map(item => ({
            surname_similar: item.surname_similar,
            count: item._sum.count_num || 0
        }));

        return res.status(200).json({
            caste: caste,
            total_surnames: surnameDetails.length,
            surnames: surnameDetails
        });

    } catch (error: any) {
        console.error('Error in getSurnameDetailsByCaste:', error);
        return res.status(500).json({
            error: 'Failed to fetch surname details',
            message: error.message
        });
    }
}

// ============================================================================
// SURNAME SIMILAR SEARCH CONTROLLERS
// ============================================================================

// ============================================================================
// CONTROLLER 1: Get Surname Similar Stats - SEPARATE VIEW (From Each)
// ============================================================================
export const getSurnameSimilarStatsSeparate = async (req: any, res: any) => {
    try {
        const { assembly_id } = req.query;

        // Validate assembly_id
        const assemblyValidation = validateAssemblyId(assembly_id);
        if (!assemblyValidation.isValid) {
            return res.status(400).json({
                error: 'Invalid assembly_id',
                message: assemblyValidation.error
            });
        }

        const filter = buildAssemblyFilter(assembly_id);

        // Get surname_similar statistics grouped by assembly using raw SQL
        let surnameStats: any[];

        if (filter.assembly_no && filter.assembly_no.in) {
            const assemblyIds = filter.assembly_no.in.join(',');
            surnameStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_similar,
                    assembly_no,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no IN (${assemblyIds})
                  AND surname_similar IS NOT NULL
                  AND surname_similar != ''
                GROUP BY surname_similar, assembly_no
                ORDER BY assembly_no ASC, total_count DESC
            `);
        } else if (filter.assembly_no) {
            const assemblyId = filter.assembly_no;
            surnameStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_similar,
                    assembly_no,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no = ${assemblyId}
                  AND surname_similar IS NOT NULL
                  AND surname_similar != ''
                GROUP BY surname_similar, assembly_no
                ORDER BY assembly_no ASC, total_count DESC
            `);
        } else {
            surnameStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_similar,
                    assembly_no,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE surname_similar IS NOT NULL
                  AND surname_similar != ''
                GROUP BY surname_similar, assembly_no
                ORDER BY assembly_no ASC, total_count DESC
            `);
        }

        // Get assembly information
        const assemblyNumbers = [...new Set(surnameStats.map(item => item.assembly_no))];
        const assemblyMap = await getAssemblyDetails(assemblyNumbers);

        // Build result grouped by assembly
        const resultByAssembly: any = {};

        surnameStats.forEach(item => {
            const assemblyNo = item.assembly_no;

            if (!resultByAssembly[assemblyNo]) {
                resultByAssembly[assemblyNo] = {
                    assembly: assemblyMap.get(assemblyNo),
                    stats: []
                };
            }

            resultByAssembly[assemblyNo].stats.push({
                surname_similar: item.surname_similar,
                total_count: Number(item.total_count)
            });
        });

        const result = Object.values(resultByAssembly);

        // If single assembly, return single object
        if (assembly_id && assembly_id !== 'all' && !assembly_id.includes(',')) {
            return res.status(200).json(result[0] || { assembly: null, stats: [] });
        }

        // For multiple assemblies, return array
        return res.status(200).json(result);

    } catch (error: any) {
        console.error('Error in getSurnameSimilarStatsSeparate:', error);
        return res.status(500).json({
            error: 'Failed to fetch surname similar statistics',
            message: error.message
        });
    }
};

// ============================================================================
// CONTROLLER 2: Get Surname Similar Stats - COMBINED VIEW (From All)
// ============================================================================
export const getSurnameSimilarStatsCombined = async (req: any, res: any) => {
    try {
        const { assembly_id } = req.query;

        // Validate assembly_id
        const assemblyValidation = validateAssemblyId(assembly_id);
        if (!assemblyValidation.isValid) {
            return res.status(400).json({
                error: 'Invalid assembly_id',
                message: assemblyValidation.error
            });
        }

        const filter = buildAssemblyFilter(assembly_id);
        console.log("filter in the getsurnamesimilarstatuscombined", filter)

        // Get surname_similar statistics using raw SQL
        let surnameStats: any[];

        if (filter.assembly_no && filter.assembly_no.in) {
            const assemblyIds = filter.assembly_no.in.join(',');
            surnameStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_similar,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no IN (${assemblyIds})
                  AND surname_similar IS NOT NULL
                  AND surname_similar != ''
                GROUP BY surname_similar
                ORDER BY total_count DESC
            `);
        } else if (filter.assembly_no) {
            const assemblyId = filter.assembly_no;
            surnameStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_similar,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE assembly_no = ${assemblyId}
                  AND surname_similar IS NOT NULL
                  AND surname_similar != ''
                GROUP BY surname_similar
                ORDER BY total_count DESC
            `);
        } else {
            surnameStats = await prisma.$queryRawUnsafe(`
                SELECT 
                    surname_similar,
                    SUM(count_num) as total_count
                FROM tbl_all_surname
                WHERE surname_similar IS NOT NULL
                  AND surname_similar != ''
                GROUP BY surname_similar
                ORDER BY total_count DESC
            `);
        }

        // Convert to array format   
        const statsArray = surnameStats.map(item => ({
            surname_similar: item.surname_similar,
            total_count: Number(item.total_count) || 0
        }));

        // Create combined assembly info
        const combinedAssembly = {
            id: 0,
            assembly_id: 0,
            assembly_name: 'All Assemblies Combined'
        };

        return res.status(200).json({
            assembly: combinedAssembly,
            stats: statsArray,
            isCombined: true
        });

    }
    catch (error: any) {
        console.error('Error in getSurnameSimilarStatsCombined:', error);
        return res.status(500).json({
            error: 'Failed to fetch combined surname similar statistics',
            message: error.message
        });
    }
};

// ============================================================================
// MAIN CONTROLLER: Route to appropriate view controller 
// ============================================================================
export const getAllSurnameSimilarStats = async (req: any, res: any) => {
    const { assembly_id, view_mode = 'separate' } = req.query;

    // Validate assembly_id
    const assemblyValidation = validateAssemblyId(assembly_id);
    if (!assemblyValidation.isValid) {
        return res.status(400).json({
            error: 'Invalid assembly_id',
            message: assemblyValidation.error
        });
    }

    // Validate view_mode
    const viewModeValidation = validateViewMode(view_mode);
    if (!viewModeValidation.isValid) {
        return res.status(400).json({
            error: 'Invalid view_mode',
            message: viewModeValidation.error
        });
    }

    // Determine if combined view should be used
    const shouldCombine = viewModeValidation.value === 'combined' &&
        (assembly_id === 'all' || (assembly_id && assembly_id.includes(',')));

    if (shouldCombine) {
        return getSurnameSimilarStatsCombined(req, res);
    } else {
        return getSurnameSimilarStatsSeparate(req, res);
    }
};

// ============================================================================
// IN AREA SEARCH - BY CASTE
// ============================================================================

/**
 * Get all castes with their total counts across all assemblies
 * This is the initial view for "By Caste" search
 */
export const getAllCastesWithCount = async (req: any, res: any) => {
    try {
        // Get all castes with total count using raw SQL
        const casteData: any[] = await prisma.$queryRawUnsafe(`
            SELECT 
                surname_caste,
                SUM(count_num) as total_count
            FROM tbl_all_surname
            WHERE surname_caste IS NOT NULL
              AND surname_caste != ''
            GROUP BY surname_caste
            ORDER BY total_count DESC
        `);

        // Format response
        const formattedData = casteData.map(item => ({
            caste_name: item.surname_caste,
            total_count: Number(item.total_count)
        }));

        return res.status(200).json({
            success: true,
            total_castes: formattedData.length,
            data: formattedData
        });

    } catch (error: any) {
        console.error('Error in getAllCastesWithCount:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch caste data',
            message: error.message
        });
    }
};

/**
 * Get assembly-wise breakdown for a specific caste
 * Shows which assemblies have this caste and the count in each
 */
export const getCasteByAssembly = async (req: any, res: any) => {
    try {
        const { caste } = req.query;

        // Validate caste
        const casteValidation = validateStringParam(caste, 'Caste', true);
        if (!casteValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: casteValidation.error
            });
        }

        // Get assembly-wise data for the specific caste using raw SQL with JOIN
        const assemblyData: any[] = await prisma.$queryRawUnsafe(`
            SELECT 
                s.assembly_id,
                s.assembly_name,
                t.surname_caste,
                SUM(t.count_num) as total_count
            FROM tbl_all_surname t
            INNER JOIN assembly_vandan s ON t.assembly_no = s.assembly_id
            WHERE t.surname_caste = ?
            GROUP BY t.surname_caste, s.assembly_id, s.assembly_name
            ORDER BY total_count DESC
        `, caste);

        // Calculate total count across all assemblies
        const totalCount = assemblyData.reduce((sum, item) => sum + Number(item.total_count), 0);

        // Format response
        const formattedData = assemblyData.map(item => ({
            assembly_id: item.assembly_id,
            assembly_name: item.assembly_name,
            count: Number(item.total_count)
        }));

        return res.status(200).json({
            success: true,
            caste_name: caste,
            total_assemblies: formattedData.length,
            total_count: totalCount,
            data: formattedData
        });

    } catch (error: any) {
        console.error('Error in getCasteByAssembly:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch assembly data for caste',
            message: error.message
        });
    }
};

