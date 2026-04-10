/**
 * @packageDocumentation
 *
 * **Donor management module.**
 *
 * Provides a private helper to retrieve donor names from PocketBase and an Express router
 * that exposes the `GET /getDonors` endpoint consumed by the Gliderport frontend.
 *
 * @module donors
 */

import { Request, Response, Router } from "express";
import { pb } from "pb.js";
import { registerEndpoint } from "endpointRegistry";

/**
 * Fetches donor names from the PocketBase `donors` collection.
 *
 * Queries up to 200 records sorted by creation date descending and maps each
 * record to its `name` field.
 *
 * @remarks
 * Errors from PocketBase are caught internally: the function logs them to `console.error`
 * and returns an empty array rather than propagating the exception. The `GET /getDonors`
 * route handles the empty-array case transparently.
 *
 * @returns A promise that resolves to an array of donor name strings (may be empty on error).
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
 * Creates and returns an Express `Router` exposing the donor data endpoints.
 *
 * | Method | Path        | Description                              |
 * |--------|-------------|------------------------------------------|
 * | GET    | /getDonors  | Returns a JSON array of donor name strings. |
 *
 * @returns A configured Express `Router` instance.
 *
 * @example
 * ```ts
 * import express from "express";
 * import { donorsRoutes } from "./donors";
 *
 * const app = express();
 * app.use("/api", donorsRoutes());
 * // → GET /api/getDonors
 * ```
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
  registerEndpoint({
    method: "GET",
    path: "/gpapi/getDonors",
    group: "Site Info",
    signature: "getDonors: () => string[]",
    description: "Returns an array of donor names from PocketBase, sorted by most recently created.",
    pathTemplate: "GET /gpapi/getDonors",
  });
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
