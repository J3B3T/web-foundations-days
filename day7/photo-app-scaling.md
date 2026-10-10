# SnapShare - Scaling Plan

## Assumptions

- 10,000,000 registered users, with 10% active daily = 1,000,000 daily active users (DAU).
- Each active user uploads 1 photo and views 50 feed pages per day.
- Each original photo is 2 MB, and each thumbnail is 50 KB (0.05 MB).
- One day is approximately 100,000 seconds, and peak traffic is 5 times average traffic.
- All uploaded photos and thumbnails are retained for one year.

## Estimates

### Daily Active Users

10,000,000 × 10% = **1,000,000 daily active users**.

### Uploads per Second

1,000,000 uploads per day ÷ 100,000 seconds ≈ **10 uploads per second**.

Peak uploads = 10 × 5 = **50 uploads per second**.

### Feed Views per Second

1,000,000 × 50 = 50,000,000 feed views per day.

50,000,000 ÷ 100,000 seconds ≈ **500 feed views per second**.

Peak feed views = 500 × 5 = **2,500 feed views per second**.

### Storage per Year

Storage per photo = 2 MB + 0.05 MB = 2.05 MB.

Daily storage = 1,000,000 × 2.05 MB = 2,050,000 MB ≈ **2 TB per day**.

Annual storage ≈ 2 TB × 365 = 730 TB, or approximately **750 TB per year**.

This estimate includes original photos and thumbnails but excludes backups and replication overhead.

## Read-Heavy or Write-Heavy?

SnapShare is a very read-heavy system, with approximately 50 feed views for every photo upload. The design should make reads cheap and fast by using a CDN for images, a cache for feeds, and database read replicas. Uploads should remain reliable, even if thumbnail generation takes longer.

## Where Do the Photos Go?

Photos should not be stored directly inside the database. Approximately 750 TB of large binary files per year would make the database huge, slow, and expensive to back up.

Instead, original photos and thumbnails should be stored in object storage, such as Amazon S3, which is designed for scalable and durable storage of large files. The database stores only each photo's metadata, including its ID, owner, caption, upload time, and file URL or storage key.

The CDN delivers frequently accessed images quickly to users without requiring every image request to reach the object-storage origin.

## Architecture

```text
                  Mobile App / Browser
                     /             \
          Photo requests           API calls (HTTPS/JSON)
                |                         |
                v                         v
              CDN                    Load Balancer
                |                         |
                v                 +-------+-------+
          Object Storage          |       |       |
          (Photo Files)           v       v       v
                              App Server App Server App Server
                                   1         2         3
                                   \         |         /
                                    +--------+--------+
                                             |
                                  +----------+----------+
                                  |                     |
                                  v                     v
                              Cache (Redis)           Queue
                              (Prepared Feeds)          |
                                                        v
                                                  Thumbnail Worker
                                                        |
                                                        v
                                                  Object Storage
                                                  (Thumbnails)

                                    App Servers
                                         |
                                         v
                                    Primary DB
                                    (Metadata)
                                         |
                                    Replication
                                         |
                                         v
                                    Read Replicas
                                    (Feed Queries)
```

## Components

- **CDN:** Serves photos from locations near users so images load quickly and fewer requests reach the origin servers.
- **Object storage:** Provides a scalable and durable home for hundreds of terabytes of original photos and thumbnails.
- **Load balancer:** Distributes API traffic across available app servers and helps prevent any one server from becoming overloaded.
- **App servers:** Handle API requests, authenticate users, validate uploads, and coordinate database and storage operations; additional servers can be added as traffic grows.
- **Cache (Redis):** Keeps frequently accessed or prepared feed data in memory for faster scrolling and fewer database queries.
- **Primary database:** Acts as the source of truth for users, follow relationships, photo metadata, and file references.
- **Read replicas:** Handle suitable read queries, especially feed queries, reducing the reading workload on the primary database.
- **Queue:** Holds thumbnail-generation jobs so slow image processing does not delay the upload response.
- **Thumbnail worker:** Processes queued jobs, creates smaller thumbnail images, saves them to object storage, and updates the corresponding photo record.

## Upload Flow

1. The user selects a photo and sends it to an app server through the load balancer.
2. The app server checks the user's authentication token and validates the file type and size.
3. The app server saves the original photo to object storage and records its storage key.
4. It inserts a row containing the photo's metadata into the primary database.
5. It adds a thumbnail-generation job to the queue, identifying the original photo and the thumbnail destination.
6. Once the original photo, metadata, and queued job have been saved successfully, the server responds with `201 Created` to confirm that the upload was accepted.
7. A thumbnail worker takes the job, generates a thumbnail targeting approximately 50 KB, saves it to object storage, and updates the photo record with the thumbnail URL or storage key.
8. The application invalidates or updates the followers' cached feeds so the new photo can appear.
9. When a follower opens the feed, the application retrieves feed data from the cache or a read replica, while the CDN delivers the image files.

## Trade-Offs

### 1. Speed vs. Freshness

Feeds served from the cache load quickly and reduce database load. However, a new photo may take a few seconds to appear for followers. Cache invalidation or updates help reduce this delay, but the system must balance speed with how quickly users see new content.

### 2. Simplicity vs. Speed of Upload

Thumbnails are generated in the background, allowing uploads to finish quickly even during busy periods. However, the thumbnail may not be available immediately, so the application can show a placeholder or the original image until processing is complete.

### 3. Cost vs. Scalability

A CDN and object storage introduce storage, data-transfer, and request costs. However, they provide a scalable way to store and deliver hundreds of terabytes of images without operating all the storage and delivery infrastructure directly. Caching and storage lifecycle policies can help control costs.

## Conclusion

SnapShare has approximately one million daily active users, handles about 10 uploads and 500 feed views per second on average, and requires roughly 750 TB of additional image storage annually.

The system is very read-heavy, so the architecture prioritizes fast feed access through a CDN, caching, and database read replicas. Object storage separates large image files from structured database records, while a queue and thumbnail worker allow image processing to happen in the background.

