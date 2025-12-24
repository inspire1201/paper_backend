import prisma from "../prisma.js";



/**
 * Get position-wise analytics data
 * Returns data grouped by election type (AC/PE) for a specific position
 */
export const getPositionWiseAnalytics = async (req: any, res: any) => {
    try {
        const { position } = req.params;

        if (!position) {
            return res.status(400).json({
                success: false,
                message: "Position is required"
            });
        }

        const results = await prisma.election_results_col.findMany({
            where: {
                position: position
            },
            orderBy: {
                electionyear: 'asc'
            }
        });

        if (!results || results.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No results found for position: ${position}`
            });
        }

        // Group results by election type (AC = Assembly, PE = Parliament)
        const assemblyResults = results.filter(r => r.electionname.toUpperCase() === 'AC');
        const parliamentResults = results.filter(r => r.electionname.toUpperCase() === 'PE');

        // Transform data for frontend consumption
        const transformData = (data: any[]) => {
            const parties = [
                { name: 'BJP', key: 'bjp_seat', color: '#FF8C00' },
                { name: 'INC', key: 'inc_seat', color: '#228B22' },
                { name: 'BSP', key: 'bsp_seat', color: '#4169E1' },
                { name: 'JCCJ', key: 'jccj_seat', color: '#FF1493' },
                { name: 'GGP', key: 'ggp_seat', color: '#9C27B0' },
                { name: 'CPI', key: 'cpi_seat', color: '#F44336' },
                { name: 'AAP', key: 'aap_seat', color: '#00BCD4' },
                { name: 'OTHER', key: 'other_seat', color: '#696969' }
            ];

            return parties.map(party => {
                const years: any = {};
                data.forEach(result => {
                    const seatValue = (result as any)[party.key];
                    years[result.electionyear] = seatValue ? parseInt(seatValue) : null;
                });

                return {
                    party: party.name,
                    color: party.color,
                    years: years
                };
            });
        };

        return res.status(200).json({
            success: true,
            message: "Position-wise analytics fetched successfully",
            data: {
                position: position.toUpperCase(),
                assembly: transformData(assemblyResults),
                parliament: transformData(parliamentResults),
                years: [...new Set(results.map(r => r.electionyear))].sort()
            }
        });

    } catch (error) {
        console.error("Error fetching position-wise analytics:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * Get detailed position data by party, year, and election type
 * Returns assembly/parliament constituency-wise data
 */
export const getPositionDetailsByParty = async (req: any, res: any) => {
    try {
        const { position, party, year, electionType } = req.query;

        if (!position || !party || !year || !electionType) {
            return res.status(400).json({
                success: false,
                message: "Position, party, year, and electionType are required"
            });
        }

        // Map year to column name
        const yearColumnMap: any = {
            '2008': 'ele_ae_2008',
            '2009': 'ele_pe_2009',
            '2013': 'ele_ae_2013',
            '2014': 'ele_pe_2014',
            '2018': 'ele_ae_2018',
            '2019': 'ele_pe_2019'
        };

        const columnName = yearColumnMap[year];
        if (!columnName) {
            return res.status(400).json({
                success: false,
                message: `Invalid year: ${year}`
            });
        }

        // Determine which table to query based on election type
        const tableName = electionType.toUpperCase() === 'AC'
            ? 'tbl_result_party_position'
            : 'tbl_result_party_position_pe';

        // Use raw query to filter by dynamic column and JOIN with assembly_paper
        const results = await prisma.$queryRawUnsafe(
            `SELECT 
                p.*, 
                a.assembly_id, 
                a.assembly_name 
            FROM ${tableName} p
            LEFT JOIN assembly_paper a ON p.ac_no = a.assembly_id
            WHERE p.position = ? AND p.${columnName} = ? 
            ORDER BY p.ac_no ASC`,
            parseInt(position),
            party.toUpperCase()
        );

        if (!results || (results as any[]).length === 0) {
            return res.status(404).json({
                success: false,
                message: `No detailed results found for ${party} in ${year}`,
                data: []
            });
        }

        return res.status(200).json({
            success: true,
            message: "Detailed position data fetched successfully",
            data: {
                position: position,
                party: party,
                year: year,
                electionType: electionType,
                constituencies: results
            }
        });

    } catch (error) {
        console.error("Error fetching position details by party:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
