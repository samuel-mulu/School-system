import { Router } from "express";
import { z } from "zod";
import * as userController from "../controllers/user.controller";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { requireOwner } from "../middleware/role";
const router = Router();
// Validation schemas
const createUserSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        role: z.enum(["REGISTRAR", "TEACHER"]), // OWNER cannot be created via API
    }),
});
const updateUserSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
    }),
});
// Routes - Only OWNER can access
router.get("/", authenticate, requireOwner, userController.getUsers);
router.get("/teachers", authenticate, requireOwner, userController.getTeachers);
router.post("/", authenticate, requireOwner, validate(createUserSchema), userController.createUser);
router.get("/:id", authenticate, requireOwner, userController.getUserById);
router.patch("/:id", authenticate, requireOwner, validate(updateUserSchema), userController.updateUser);
router.delete("/:id", authenticate, requireOwner, userController.deleteUser);
export default router;
//# sourceMappingURL=users.js.map