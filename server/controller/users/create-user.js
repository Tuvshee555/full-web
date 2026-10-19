import bcrypt from "bcryptjs";
import { prisma } from "../../prismaClient.js"; // import your Prisma Client
import { normalizeEmail, validPassword } from "../../utils/authValidation.js";

export const createUser = async (req, res) => {
  try {
    const { email, password, phonenumber, address } = req.body ?? {};

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !validPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email and a password of at least 8 characters (maximum 72 bytes).",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists!",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        phonenumber,
        address,
        role: "USER",
      },
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully!",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "User with this email already exists" });
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating user",
    });
  }
};
