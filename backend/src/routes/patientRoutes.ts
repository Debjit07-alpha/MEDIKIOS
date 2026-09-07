import { Router } from "express";
const router = Router();

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Patient routes are working!" });
});

export default router;