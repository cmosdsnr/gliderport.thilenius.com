import { Request, Response, Router } from "express";
import { pb } from "pb.js";

/**
 * Fetches donor names from the PocketBase “donors” collection.
 *
 * Queries PocketBase for up to 200 donor records, sorted by creation date
 * in descending order, and returns an array of donor names.
 *
 * @throws {Error} If the PocketBase query fails.
 * @returns {Promise<string[]>} A promise that resolves to an array of donor names.
 */
const fetchDonors = async (): Promise<string[]> => {
  try {
    const res = await pb.collection("donors").getFullList(200, {
      sort: "-created",
    });
    const donors: string[] = [];
    res.forEach((donor: any) => {
      donors.push(donor.name);
    });
    return donors;
  } catch (error) {
    console.error("Error fetching donors:", error);
    return [];
  }
};

/**
 * Returns a new Express `Router` that exposes:
 *   GET /getDonors → retrieve all donor names from PocketBase.
 *
 * Mount this on your app or a sub-route to provide donor endpoints.
 *
 * @returns A `Router` with the route `/getDonors`.
 */
export const donorsRoutes = (): Router => {
  const router = Router();

  /**
   * GET /getDonors
   *
   * Retrieves all donor names from PocketBase by calling {@link fetchDonors}.
   *
   * @name GetDonors
   * @route GET /getDonors
   * @returns {Promise<void>}
   *   - 200: JSON array of donor names.
   *   - 500: JSON error if retrieval fails.
   */
  router.get("/getDonors", async (req: Request, res: Response) => {
    try {
      const donors = await fetchDonors();
      res.status(200).json(donors);
    } catch (err) {
      console.error("Failed to fetch donors:", err);
      res.status(500).json({ error: "Unable to retrieve donors" });
    }
  });

  return router;
};
