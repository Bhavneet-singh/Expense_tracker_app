import { Router } from "express";
import {
  deleteAccount,
  exportData,
  getProfile,
  updateProfile,
} from "../controllers/profileControllers";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.get("/", requireAuth, getProfile);
router.put("/", requireAuth, updateProfile);
router.get("/export", requireAuth, exportData);
router.delete("/account", requireAuth, deleteAccount);

export default router;
