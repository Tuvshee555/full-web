import { unlink } from "node:fs/promises";
import path from "node:path";
import { cloudinary } from "../../utils/cloudinary.js";
import { uploadMediaFiles } from "../../utils/mediaUpload.js";
import { uploadDirectory } from "../../middleware/upload.js";

export const uploadMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploads = await uploadMediaFiles(req.files, async (file) => {
        const isVideo = file.mimetype.startsWith("video");

        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: isVideo ? "video" : "image",
          folder: "foods",
        });

        return result.secure_url;
      }, async (file) => {
        const target = path.resolve(file.path);
        if (target.startsWith(path.resolve(uploadDirectory) + path.sep)) await unlink(target);
      });

    return res.json({ urls: uploads });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return res.status(500).json({ message: "Upload failed" });
  }
};
