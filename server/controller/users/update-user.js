import { prisma } from "../../prismaClient.js";

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    firstName,
    lastName,
    phonenumber,
    city,
    district,
    khoroo,
    address,
    notes,
  } = req.body ?? {};
  const profile = { firstName, lastName, phonenumber, city, district, khoroo, address, notes };
  const limits = { firstName: 120, lastName: 120, phonenumber: 40, city: 120, district: 120, khoroo: 120, address: 1000, notes: 2000 };
  for (const [key, value] of Object.entries(profile)) {
    if (value !== undefined && (typeof value !== "string" || value.length > limits[key])) return res.status(400).json({ message: `Invalid ${key}` });
  }

  try {
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // allow self or admin
    if (requesterRole !== "ADMIN" && requesterId !== id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phonenumber,
        city,
        district,
        khoroo,
        address,
        notes,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phonenumber: true,
        city: true,
        district: true,
        khoroo: true,
        address: true,
        notes: true,
        updatedAt: true,
      },
    });

    return res
      .status(202)
      .json({ success: true, message: "User updated successfully", user: updatedUser });
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }

    console.error("❌ Error updating user:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to update profile" });
  }
};
