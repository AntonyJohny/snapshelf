const express = require("express");
const { saveImage, listImages } = require("../services/dynamo");
const { sendImageJob } = require("../services/sqs");
const { createViewUrl } = require("../services/s3");

const router = express.Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// called after the browser has finished uploading to S3
router.post("/", async (req, res) => {
  try {
    const { id, title, tags } = req.body;
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