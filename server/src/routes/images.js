const express = require("express");
const {
  deleteImageRecord,
  findImage,
  listImages,
  markImageDeleting,
  saveImage,
} = require("../services/dynamo");
const { sendImageJob } = require("../services/sqs");
const { createDownloadUrl, createViewUrl, deleteImageObjects } = require("../services/s3");

const router = express.Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// called after the browser has finished uploading to S3
router.post("/", async (req, res) => {
  try {
    const { id, title, tags, fileName } = req.body;
    if (!UUID.test(id || "")) return res.status(400).json({ error: "Invalid id" });

    const cleanTitle = String(title || "").trim().slice(0, 100);
    if (!cleanTitle) return res.status(400).json({ error: "Title is required" });

    const cleanTags = (Array.isArray(tags) ? tags : [])
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);

    const item = {
      id,
      title: cleanTitle,
      tags: cleanTags,
      status: "PROCESSING",
      originalKey: `originals/${id}`,
      fileName: String(fileName || "").split(/[\\/]/).pop().replace(/[^\w.-]/g, "_").slice(0, 120),
      ownerEmail: req.user.email,
      createdAt: new Date().toISOString(),
    };

    await saveImage(item);   // 1. record in DynamoDB
    await sendImageJob(id);  // 2. tell the worker via SQS
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save image" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!UUID.test(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const image = await findImage(id);
    if (!image) return res.status(404).json({ error: "Image not found" });
    if (image.ownerEmail && image.ownerEmail !== req.user.email) {
      return res.status(403).json({ error: "You can only delete images you uploaded." });
    }

    try {
      await markImageDeleting(id);
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        return res.status(404).json({ error: "Image not found" });
      }
      throw error;
    }

    await deleteImageObjects([
      image.originalKey || `originals/${id}`,
      image.thumbKey || `thumbs/${id}.jpg`,
    ]);
    await deleteImageRecord(id);
    res.status(204).end();
  } catch (err) {
    console.error("Could not delete image:", err);
    res.status(500).json({ error: "Could not delete image and its stored files. You can retry." });
  }
});

// gallery + search: GET /api/images?q=beach
router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    let items = await listImages();
    if (q) {
      items = items.filter(
        (i) => i.title.toLowerCase().includes(q) || i.tags.some((t) => t.includes(q))
      );
    }
    const withUrls = await Promise.all(
      items.map(async (i) =>
        i.status === "READY"
          ? {
              ...i,
              thumbUrl: await createViewUrl(i.thumbKey),
              originalUrl: await createViewUrl(i.originalKey),
              downloadUrl: await createDownloadUrl(i.originalKey, i.fileName || `image-${i.id}`),
            }
          : i
      )
    );
    res.json(withUrls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load images" });
  }
});

module.exports = router;