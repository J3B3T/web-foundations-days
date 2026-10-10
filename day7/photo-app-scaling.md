 # SnapShare - Scaling Plan

## Assumptions

- 10,000,000 registered users, with 10% active daily = 1,000,000 daily active users (DAU).
- Each active user uploads 1 photo and views 50 feed pages per day.
- Each original photo is 2 MB, and each thumbnail is 50 KB (0.05 MB).
- For estimation, 1 day ≈ 100,000 seconds and 1 year = 365 days.
- Peak traffic is estimated to be 5 times the average traffic.
- All photos and thumbnails are retained, and storage estimates exclude backups and replication overhead.

## Estimates

### Daily Active Users

10,000,000 × 10% = **1,000,000 daily active users**

### Uploads per Second

1,000,000 uploads per day ÷ 100,000 seconds ≈ **10 uploads per second**

Peak uploads = 10 × 5 = **50 uploads per second**

### Feed Views per Second

1,000,000 users × 50 feed pages = 50,000,000 feed views per day.

50,000,000 ÷ 100,000 seconds ≈ **500 feed views per second**

Peak feed views = 500 × 5 = **2,500 feed views per second**

### Storage per Year

Storage per photo = 2 MB + 0.05 MB = 2.05 MB.

Daily storage = 1,000,000 × 2.05 MB = 2,050,000 MB ≈ **2 TB per day**.

Annual storage = 2 TB × 365 ≈ **730 TB per year**, or approximately **750 TB per year** as a rounded planning estimate.

## Read-Heavy or Write-Heavy?

SnapShare is a very read-heavy system, with approximately 50 feed views for every photo upload. The design should make reads cheap and fast by using a CDN for images, a cache for feeds, and database read replicas. Uploads should remain reliable, even if thumbnail generation takes a little longer.

## Where Do the Photos Go?

Photos should not be stored directly inside the database. Hundreds of terabytes of large binary files would make the database unnecessarily large, increase backup costs, and complicate database maintenance.

Instead, original photos and thumbnails should be stored in object storage, such as Amazon S3, which is designed for durable, scalable storage of large files. The database stores only the photo's metadata, including its ID, owner, caption, upload time, and object-storage keys or URLs.

A CDN delivers frequently accessed photos and thumbnails to users quickly without requiring every image request to reach the object-storage origin.

## Architecture

```text
                 Mobile App / Browser
                    /            \
       Photo/image requests       API calls (HTTPS/JSON)
                |                         |
                v                         v
          +-----------+             +----------------+
          |    CDN    |             | Load Balancer  |
          +-----------+             +----------------+
                |                           |
                v                 +---------+---------+
          +----------------+      |         |         |
          | Object Storage |      v         v         v
          | Original Photos|  +---------+ +---------+ +---------+
          | and Thumbnails |  |App Server| |App Server| |App Server|
          +----------------+  |    1    | |    2    | |    3    |
                  ^           +---------+ +---------+ +---------+
                  |                 \         |         /
                  |                  +--------+--------+
                  |                           |
                  |                 +------------------+
                  |                 | Cache (Redis)    |
                  |                 | Prepared Feeds   |
                  |                 +------------------+
                  |                           |
                  |              +------------+-----------+
                  |              |                        |
                  |              v                        v
                  |       +-------------+           +-----------+
                  |       | Primary DB  |           |   Queue   |
                  |       |  Metadata   |           +-----------+
                  |       +-------------+                 |
                  |              |                        v
                  |              |                  +------------------+
                  |              |                  | Thumbnail Worker |
                  |              |                  +------------------+
                  |              |                        |
                  |              |                        |
                  |              +                        |
                  |           Replication                 |
                  |              |                        |
                  |              v                        |
                  |       +--------------+                |
                  |       | Read Replica |                |
                  |       | Feed Queries |                |
                  |       +--------------+                |
                  |                                       |
                  +---------------------------------------+
                         Original and thumbnail files
```

## Components

- **CDN:** Serves frequently requested photos and thumbnails from locations near users, improving image loading speed and reducing requests to the origin.
- **Object storage:** Provides durable, scalable storage for original photos and thumbnails without filling the database with large files.
- **Load balancer:** Distributes incoming API traffic across available app servers and helps prevent one server from becoming overloaded.
- **App servers:** Handle API requests, authenticate users, validate uploads, and coordinate database, cache, storage, and queue operations.
- **Cache (Redis):** Keeps frequently accessed or prepared feed data in memory, reducing repeated database queries and speeding up scrolling.
- **Primary database:** Stores the authoritative records for users, follow relationships, photo metadata, and references to image files.
- **Read replicas:** Serve suitable read queries, especially feed-related queries, reducing the reading workload on the primary database.
- **Queue:** Holds thumbnail-generation jobs so image processing can happen asynchronously without delaying the upload response.
- **Thumbnail worker:** Processes queued jobs, creates smaller thumbnail images, stores them in object storage, and updates their processing status or metadata.

## Upload Flow

1. The user selects a photo and sends it to an app server through the load balancer.
2. The app server verifies the user's authentication token and checks the file type and size.
3. The app server saves the original photo in object storage and records its storage key.
4. The app server inserts a row containing the photo's metadata into the primary database.
5. The app server adds a thumbnail-generation job to the queue, identifying the original photo and the thumbnail destination.
6. Once the original photo, metadata, and queued job have been saved successfully, the app server responds with **201 Created**, confirming that the upload was accepted.
7. A thumbnail worker takes the job, generates a smaller thumbnail targeting approximately 50 KB, saves it in object storage, and updates the database record with the thumbnail key or URL.
8. The application invalidates or updates the relevant cached feeds so the new photo can appear for the user's followers.
9. When a follower opens the feed, the application retrieves feed metadata from the cache or a database read replica, and the CDN delivers the image files.

## Trade-Offs

### 1. Speed vs. Freshness

Serving feeds from a cache makes scrolling faster and reduces database load. However, a newly uploaded photo may take a few seconds to appear for followers. Cache invalidation or updates help reduce this delay, but the system must balance performance with how quickly users see new content.

### 2. Fast Uploads vs. Immediate Thumbnail Availability

Generating thumbnails in the background allows the upload request to finish quickly, even during busy periods. However, a thumbnail may not be available immediately after upload, so the application may need to display a placeholder or the original image until processing finishes.

### 3. Cost vs. Scalability

Object storage and a CDN introduce storage, data-transfer, and request costs. However, they provide a more scalable approach to handling hundreds of terabytes of images than storing and serving all image files directly from application servers. Storage lifecycle policies and caching can help control costs.

## Conclusion

SnapShare has approximately one million daily active users, handles about 10 photo uploads and 500 feed views per second on average, and requires roughly 750 TB of additional image storage annually under the stated assumptions.

The system is read-heavy, so its architecture prioritizes fast feed access through a CDN, caching, and database read replicas. Object storage keeps large image files separate from structured database records, while a queue and thumbnail worker allow image processing to happen in the background.

