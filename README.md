# SnapShelf – Cloud-Based Photo Storage & Management System

SnapShelf is a full-stack photo storage and management application that allows users to upload, organize, view, and manage their images. It uses a React frontend, Node.js and Express backend, and AWS services for scalable object storage and asynchronous image processing.

The application is currently configured to run locally for development and testing. AWS services are used as backend infrastructure where configured; the application is not publicly hosted.

## Features

- **User Authentication:** Secure user authentication and access to personal photo collections.
- **Photo Upload:** Upload images through a direct-to-S3 upload workflow using pre-signed URLs.
- **Cloud Storage:** Store original images in Amazon S3.
- **Thumbnail Generation:** Generate image thumbnails asynchronously using a background worker.
- **Image Management:** View, organize, and manage uploaded photos.
- **Metadata Storage:** Store image information and processing status in Amazon DynamoDB.
- **Asynchronous Processing:** Use Amazon SQS to queue thumbnail-generation jobs.
- **Notifications:** Use Amazon SNS for image-processing failure notifications, when configured.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, JavaScript |
| Backend | Node.js, Express.js |
| Storage | Amazon S3 |
| Database | Amazon DynamoDB |
| Message Queue | Amazon SQS |
| Background Processing | Node.js Worker |
| Notifications | Amazon SNS |
| Image Processing | Sharp |
| Cloud SDK | AWS SDK for JavaScript v3 |

## Architecture

SnapShelf follows a decoupled architecture in which the frontend, API server, cloud storage, and background worker handle different responsibilities.

```text
              ┌──────────────────────┐
              │     React Frontend   │
              │   (Local Development)│
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │    Express API       │
              │  Authentication &   │
              │  Upload Management  │
              └──────────┬───────────┘
                         │
              Request Pre-signed URL
                         │
                         ▼
              ┌──────────────────────┐
              │     Amazon S3        │
              │   Original Images    │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Express API        │
              │  Save Image Metadata │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │     Amazon SQS       │
              │  Thumbnail Job Queue │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Background Worker  │
              │  Generate Thumbnail  │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │     Amazon S3        │
              │   Thumbnail Images   │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   DynamoDB           │
              │  Update Image Status │
              └──────────────────────┘
```

## Project Structure

```text
SnapShelf/
│
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       │   └── UploadForm.jsx
│       ├── api.js
│       └── ...
│
├── server/
│   └── src/
│       ├── config/
│       │   └── aws.js
│       ├── routes/
│       │   ├── uploads.js
│       │   └── images.js
│       ├── services/
│       │   ├── s3.js
│       │   └── dynamo.js
│       └── server.js
│
├── worker/
│   └── src/
│       ├── worker.js
│       ├── thumbnail.js
│       └── logger.js
│
└── README.md
```

*The structure above highlights the main application components; additional files and configuration may exist in the repository.*

## How It Works

### 1. Image Upload

When a user selects an image, the React frontend requests a pre-signed upload URL from the Express backend.

### 2. Direct S3 Upload

The frontend uploads the image directly to Amazon S3 using the pre-signed URL. This avoids sending large image files through the application server.

### 3. Metadata Registration

After the upload succeeds, the frontend calls the backend to register image metadata in DynamoDB.

### 4. Background Job Processing

The backend sends a thumbnail-generation job to Amazon SQS. The worker consumes the message and retrieves the original image from S3.

### 5. Thumbnail Generation

The worker processes the image using Sharp and uploads the generated thumbnail to S3.

### 6. Status Update

After successful processing, the worker updates the image record in DynamoDB with the thumbnail key and `READY` status.

## Local Setup

### Prerequisites

- Node.js and npm
- Git
- AWS account
- AWS credentials with the required permissions
- Configured S3 bucket, DynamoDB table, and SQS queue

### 1. Clone the Repository

```bash
git clone https://github.com/AntonyJohny/snapshelf.git
cd snapshelf
```

### 2. Install Dependencies

Install frontend dependencies:

```bash
cd client
npm install
```

Install backend dependencies:

```bash
cd ../server
npm install
```

Install worker dependencies:

```bash
cd ../worker
npm install
```

### 3. Configure Environment Variables

Create the appropriate `.env` files based on the configuration expected by each application component.

Typical AWS configuration values include:

```env
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

S3_BUCKET=your-s3-bucket-name
DYNAMO_TABLE=your-dynamodb-table-name
SQS_QUEUE_URL=your-sqs-queue-url
SNS_TOPIC_ARN=your-sns-topic-arn
```

Also configure the backend's authentication secret, API port, and any other environment variables required by the source code.

**Security:** Never commit `.env` files, AWS credentials, access keys, or other secrets to GitHub.

### 4. Start the Backend

```bash
cd server
npm start
```

Use the development script configured in `package.json` if the project uses a different startup command.

### 5. Start the Background Worker

Open a separate terminal:

```bash
cd worker
node src/worker.js
```

### 6. Start the Frontend

Open another terminal:

```bash
cd client
npm run dev
```

Open the local URL printed by Vite in your terminal, typically:

```text
http://localhost:5173
```

## Error Handling and Reliability

The application uses asynchronous processing to keep image uploads separate from thumbnail generation.

- S3 handles original image storage.
- SQS decouples thumbnail processing from the upload request.
- The background worker handles thumbnail generation.
- DynamoDB tracks image-processing status.
- Failed processing jobs can be retried through the queue.
- Conditional updates help prevent thumbnail processing from overwriting an image that is being deleted.

## Future Improvements

- Add image search and advanced filtering.
- Support bulk image uploads.
- Add image sharing and permission management.
- Improve upload progress and error reporting.
- Add automated tests and monitoring.
- Introduce infrastructure-as-code for repeatable AWS setup.
- Add production deployment and CI/CD automation.

## Learning Outcomes

Building SnapShelf provided practical experience with:

- Full-stack application development using React and Node.js.
- REST API design and integration.
- Direct-to-S3 uploads using pre-signed URLs.
- AWS cloud storage and database integration.
- Event-driven architecture using SQS.
- Asynchronous background processing.
- Image processing and thumbnail generation.
- Debugging distributed workflows and handling failures.

## Author

**Antony Johny**

- GitHub: [AntonyJohny](https://github.com/AntonyJohny)
- Project Repository: [SnapShelf](https://github.com/AntonyJohny/snapshelf)

---

*SnapShelf is a personal full-stack project developed to explore cloud-based photo storage, backend engineering, and asynchronous image-processing workflows.*