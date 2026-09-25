const express = require("express");
const { createUploadUrl } = require("../services/s3");

const router = express.Router();
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

router.post("/presign", async (req, res) => {
  try {
    const { contentType } = req.body;
    if (!ALLOWED.includes(contentType)) {
      return res.status(400).json({ error: "Only JPEG, PNG or WebP images are allowed" });
    }
    res.json(await createUploadUrl(contentType));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create upload URL" });
  }
});

module.exports = router;