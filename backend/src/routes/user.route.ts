import { Router } from "express";
import { User } from "../models/user.model.js";

const router = Router();

router.post("/seed", async (_, res) => {
  try {
    const existingUser = await User.findOne();

    if (existingUser) {
      return res.json(existingUser);
    }

    const user = await User.create({
      name: "John Doe",
      schoolName: "Delhi Public School",
      avatar:
        "https://i.pravatar.cc/150?img=3",
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to seed user",
    });
  }
});

export default router;