import { Request, Response, Router } from "express";
import { pb } from "pb.js";
import { ToId } from "miscellaneous.js";
import { connection } from "./SqlConnect.js";

/**
 * Fetches donor records from PocketBase.
 *
 * Queries the “donors” collection in PocketBase and returns the
 * resulting JSON array of donor objects.
 *
 * @returns A promise that resolves to an array of donor records.
 * @throws {Error} If the PocketBase query fails.
 */
const fetchDonors = async (): Promise<any[]> => {
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
 * Creates and returns an Express router for donor-related endpoints.
 *
 * @returns An Express Router with donor routes mounted.
 */
export const donorsRoutes = (): Router => {
  const router = Router();

  /**
   * GET /getDonors
   *
   * Retrieve all donor records.
   *
   * @name GetDonors
   * @route GET /getDonors
   * @returns 200 - JSON array of donors
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
