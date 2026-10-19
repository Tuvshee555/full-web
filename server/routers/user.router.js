import express from "express";
import { getUsers } from "../controller/users/get-users.js";
import { deleteUser } from "../controller/users/delete-user.js";
import { updateUser } from "../controller/users/update-user.js";
import { createUser } from "../controller/users/create-user.js";
import { loginUser } from "../controller/users/login-user.js";
import { forgotPassword } from "../controller/users/forgot-password.js";
import { resetPassword } from "../controller/users/reset-password.js";
import { googleAuth } from "../controller/users/google-auth.js";
import rateLimit from "express-rate-limit";
import { getUserById } from "../controller/users/get-user-by-id.js";
import { createGuestUser } from "../controller/users/create-guest.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";



export const userRouter = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: "Too many sign-in attempts. Please try again later." } });
const recoveryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { message: "Too many recovery attempts. Please try again later." } });
const accountLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: "Too many requests. Please try again later." } });

// Standard CRUD
userRouter.get("/", requireAdmin, getUsers);
userRouter.post("/", accountLimiter, createUser);
userRouter.post("/login", authLimiter, loginUser);
userRouter.put("/:id", requireAuth, updateUser);
userRouter.delete("/:id", requireAuth, deleteUser);
userRouter.get("/:id", requireAuth, getUserById);
userRouter.post("/guest", accountLimiter, createGuestUser);


// Password recovery
userRouter.post("/forgot-password", recoveryLimiter, forgotPassword);
userRouter.post("/reset-password", authLimiter, resetPassword);

// Google OAuth
userRouter.post("/auth/google", authLimiter, googleAuth);


