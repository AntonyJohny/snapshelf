# Snapshelf

A photo gallery where uploads are processed automatically: each image gets
a thumbnail generated in the background, and photos are searchable by title
and tags.

## What it does

1. You upload a photo with a title and tags.
2. The browser uploads the file directly to S3 using a temporary signed URL.
3. The API saves a record in DynamoDB (status: `PROCESSING`) and queues a job in SQS.
4. A background worker picks up the job, downloads the original, generates a
   300x300 thumbnail, uploads it back to S3, and marks the record `READY`.
5. If processing fails after 3 attempts, the record is marked `FAILED` and an
   email alert goes out via SNS.
6. The gallery polls for updates and shows thumbnails as they become ready,
   with search by title or tag.

## Architecture

```
React (Vite)
   │  1. request presigned URL
   ▼
Express API ──────► S3 (originals + thumbnails)
   │  2. save record        ▲
   ▼                        │ 4. read/write
DynamoDB                    │
   │                        │
   │ 3. queue job            │
   ▼                        │
   SQS ───────────► Node worker (sharp) ──► SNS (failure alerts)
                             │
                             ▼
                      CloudWatch Logs (+ alarm on errors)
```

## AWS services used

| Service | Why |
|---|---|
| **S3** | Stores original photos and generated thumbnails |
| **SQS** | Decouples upload from thumbnail processing; retries failed jobs automatically |
| **DynamoDB** | Stores image metadata (title, tags, status) — no database server to manage |
| **SNS** | Emails an alert when a job fails after 3 retries |
| **CloudWatch** | Worker logs, plus an alarm that fires on repeated errors |
| **IAM** | A scoped user for the app instead of root credentials |


## Tech stack

- **Frontend:** React (Vite)
- **Backend:** Node.js, Express
- **Worker:** Node.js, `sharp` for image processing
- **Infrastructure:** AWS (S3, SQS, SNS, DynamoDB, CloudWatch, IAM), region `ap-south-1`

## Running it locally

Requires Node.js and an AWS account with the resources below created.

1. Clone the repo and install dependencies in each folder:
   ```
   cd client && npm install
   cd ../server && npm install
   cd ../worker && npm install
   ```
2. Create the AWS resources (S3 bucket, SQS queue, SNS topic, DynamoDB table)
   in `ap-south-1` and note their names/ARNs.
3. Add `.env` files to `server/` and `worker/` (see `.env.example` in each folder).
4. Run all three in separate terminals:
   ```
   cd server && npm run dev
   cd worker && npm start
   cd client && npm run dev
   ```
5. Open `http://localhost:5173`.

## What I'd add next

- Move from a full table scan to a proper DynamoDB query/index as data grows
- Per-user accounts and private galleries
- OpenSearch for full-text search at larger scale
- CI/CD pipeline to deploy the API and worker to ECS/Fargate

## About me

Built by Antony Johny
# Snapshelf

## Local authentication

The Express API stores registered accounts in `server/data/users.json`. Passwords are hashed
with bcrypt; the raw password is never written to that file. The data directory is excluded
from Git.

Set a stable, random `AUTH_TOKEN_SECRET` in `server/.env` before starting the API. For example,
from the `server` directory, generate one with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

In development, the API generates a temporary secret if this setting is omitted, which
invalidates login tokens whenever the server restarts. Production requires the setting.

The client uses `http://localhost:4000/api` by default in development. Set `VITE_API_URL` in
`client/.env` to override it. Sign-up and sign-in are available on the same screen. Image upload
and gallery endpoints require a valid sign-in. Remote API URLs must use HTTPS so passwords and
sign-in tokens are not sent over plaintext HTTP.

Signed-in users can download the original file from a gallery card or delete their own uploads.
Deletion removes the S3 original and thumbnail and then removes the DynamoDB record; in-flight
thumbnail jobs detect deleted records and clean up rather than recreating them.

