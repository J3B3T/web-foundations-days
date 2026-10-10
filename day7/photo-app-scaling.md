# SnapShare Photo App Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view photos shared by people they follow.

The following assumptions are used in this scaling plan:

- The application has 10 million registered users.
- 10% of registered users are active each day.
- Each daily active user uploads 1 photo per day.
- Each daily active user views 50 feed pages per day.
- The average original photo size is 2 MB.
- Each photo also has a 50 KB thumbnail.
- One day has 86,400 seconds, and one year has 365 days.
- Traffic is distributed across the day, but peak traffic is estimated to be 5 times the average traffic.
- Storage calculations exclude database records, logs, backups, replication overhead, and temporary files.
- All uploaded photos and their thumbnails are retained for one year.

## 2. Traffic and Storage Calculations

### 2.1 Daily Active Users

Daily active users (DAU) are 10% of the total registered users.

DAU = 10,000,000 × 10%

DAU = **1,000,000 users per day**

Therefore, SnapShare has approximately one million daily active users.

### 2.2 Photo Uploads per Second

Each daily active user uploads one photo per day.

Daily uploads = 1,000,000 × 1

Daily uploads = **1,000,000 photos per day**

Average uploads per second:

Uploads per second = 1,000,000 ÷ 86,400

Uploads per second ≈ **11.57 photos per second**

Using the 5× peak traffic assumption:

Peak uploads per second = 11.57 × 5

Peak uploads per second ≈ **57.87 photos per second**

SnapShare should therefore be designed to handle approximately 12 uploads per second on average and 58 uploads per second during peak periods.

### 2.3 Feed Views per Second

Each daily active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50

Daily feed views = **50,000,000 feed pages per day**

Average feed views per second:

Feed views per second = 50,000,000 ÷ 86,400

Feed views per second ≈ **578.70 feed views per second**

Using the 5× peak traffic assumption:

Peak feed views per second = 578.70 × 5

Peak feed views per second ≈ **2,893.52 feed views per second**

SnapShare should therefore handle approximately 579 feed views per second on average and 2,894 feed views per second during peak periods.

These figures count feed-page requests, not individual photos loaded within each feed page.

### 2.4 Photo Storage per Year

Each original photo occupies 2 MB, and each thumbnail occupies 50 KB.

For planning purposes, assume 1 MB = 1,000 KB.

Combined storage per uploaded photo:

2 MB + 0.05 MB = **2.05 MB**

Daily original photo storage:

1,000,000 × 2 MB = 2,000,000 MB

Daily thumbnail storage:

1,000,000 × 0.05 MB = 50,000 MB

Total daily photo storage:

2,000,000 MB + 50,000 MB = 2,050,000 MB

This is approximately **2.05 TB per day**.

Annual original photo storage:

2,000,000 MB × 365 = 730,000,000 MB = 730 TB

Annual thumbnail storage:

50,000 MB × 365 = 18,250,000 MB = 18.25 TB

Total annual storage:

730 TB + 18.25 TB = **748.25 TB per year**

Therefore, SnapShare requires approximately 748.25 TB of additional storage per year for original photos and thumbnails, before accounting for backups, replication, and other overhead.

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view feed pages much more frequently than they upload photos.

The application receives approximately 50 million feed views and 1 million photo uploads each day. This means it processes 50 feed views for every photo upload.

The architecture should therefore prioritize fast feed delivery, efficient caching, database read replicas, and content delivery networks (CDNs). These components reduce the load on the main application servers and database while allowing users to access photos quickly.

## 4. Why Photos Should Not Be Stored Inside the Database

Photos should not be stored directly inside the database because image files are large and would consume substantial database storage. Storing them as database blobs can increase backup sizes, complicate database maintenance, and reduce the efficiency of database operations.

Instead, SnapShare should store original photos and thumbnails in **object storage**, which is designed to handle large files efficiently and scale as the number of photos increases.

The database should store metadata such as the photo ID, user ID, caption, upload time, object-storage key, and thumbnail key. This allows the application to retrieve photo information from the database and load the actual image files from object storage through a CDN.

## 5. SnapShare Architecture Diagram

The following diagram shows the main components and how requests and photo uploads move through the system.

```text
                         USERS
                           |
                           v
                    +-------------+
                    |     CDN     |
                    +-------------+
                      |         ^
                      |         | Cached photos
                      v         |
                +-------------------+
                |  Load Balancer    |
                +-------------------+
                          |
             +------------+------------+
             |                         |
             v                         v
      +---------------+        +---------------+
      | App Server 1  |        | App Server 2  |
      +---------------+        +---------------+
             |                         |
             +------------+------------+
                          |
              +-----------+-----------+
              |                       |
              v                       v
        +-------------+         +-------------+
        |    Cache    |         |    Queue    |
        +-------------+         +-------------+
              |                       |
              v                       v
       +---------------+        +---------------+
       |   Database    |        |    Thumbnail  |
       |   (Primary)   |        |    Worker     |
       +---------------+        +---------------+
              |                       |
              v                       v
       +---------------+        +---------------+
       | Read Replica  |        | Object Storage|
       +---------------+        | Originals and |
                                | Thumbnails    |
                                +---------------+
                                         |
                                         v
                                      +-----+
                                      | CDN |
                                      +-----+
```

The CDN is shown at both ends to represent its two roles: delivering cached images to users and receiving or retrieving image content from the storage origin. In a production deployment, image delivery and API requests would typically use separate CDN and application routes.

## 6. What Each Component Does

1. **CDN (Content Delivery Network):** Delivers frequently accessed photos and thumbnails from locations closer to users, reducing latency and origin-server traffic.

2. **Load balancer:** Distributes incoming application requests across multiple app servers to prevent one server from becoming overloaded.

3. **App servers:** Handle application logic, authenticate users, validate uploads, process feed requests, and communicate with the database, cache, object storage, and queue.

4. **Cache:** Temporarily stores frequently requested data, such as feed metadata and profile information, reducing repeated database queries and improving response times.

5. **Primary database:** Stores structured information such as user accounts, photo metadata, captions, follow relationships, and references to files in object storage.

6. **Database read replica:** Maintains a copy of primary database data and serves suitable read queries, reducing the reading workload on the primary database.

7. **Object storage:** Stores original photos and generated thumbnails separately from the database and provides scalable storage for large image files.

8. **Queue:** Holds thumbnail-generation jobs so that image processing can happen asynchronously without making the user wait for the entire process to finish.

9. **Thumbnail worker:** Retrieves jobs from the queue, generates smaller thumbnail images from originals, and saves the resulting files in object storage.

## 7. Step-by-Step Photo Upload Flow

1. **User selects a photo:** The user selects a photo and submits it through the SnapShare application.

2. **Request reaches the app server:** The load balancer directs the upload request to an available app server, which authenticates the user and validates the file type and size.

3. **Original photo is stored:** The application uploads the original image to object storage and receives or records its storage key.

4. **Photo metadata is saved:** The app server saves a database record containing the photo ID, user ID, caption, upload time, original image key, and processing status.

5. **Thumbnail job is queued:** The application adds a thumbnail-generation job to the queue, including the original image key and the destination key for the thumbnail.

6. **Upload confirmation is returned:** Once the original photo and required metadata have been safely stored and the job has been queued, the application can confirm that the upload was accepted.

7. **Worker processes the job:** A thumbnail worker takes the job from the queue, reads the original image from object storage, and creates a 50 KB thumbnail or a suitably sized thumbnail targeting that size.

8. **Thumbnail is saved:** The worker uploads the generated thumbnail to object storage and updates the photo record to indicate that thumbnail processing is complete.

9. **Photo is delivered to viewers:** When another user views the photo in a feed, the application retrieves the relevant metadata and provides the image URL; the CDN delivers the thumbnail or original image as appropriate.

10. **Failures are handled:** If thumbnail generation fails, the queue can retry the job, and failed jobs can be recorded for later investigation without requiring the user to upload the original photo again.

## 8. Trade-Offs

### Trade-Off 1: Caching Versus Data Freshness

Caching feed information reduces database load and improves response times. However, cached information may become temporarily outdated when a user uploads a photo, changes a caption, or removes a post. SnapShare must choose suitable cache expiration times and invalidate or update cached entries when necessary.

### Trade-Off 2: Asynchronous Thumbnail Generation Versus Immediate Availability

Using a queue and worker allows the upload request to finish without waiting for thumbnail processing. This improves responsiveness and allows image processing capacity to scale independently. However, the thumbnail may not be immediately available after upload, so the application must display a placeholder or the original image until processing finishes.

### Trade-Off 3: Database Read Replicas Versus Read Consistency

A read replica distributes read traffic and reduces pressure on the primary database. However, replicas may lag behind the primary database, meaning a newly uploaded photo might not appear immediately in queries served by the replica. SnapShare can use the primary database for critical read-after-write requests and replicas for less time-sensitive reads.

### Trade-Off 4: Object Storage and CDN Versus Cost and Complexity

Object storage and a CDN provide scalable image storage and fast delivery. However, they introduce additional service costs, configuration requirements, and access-control considerations. SnapShare must manage storage growth, CDN caching, secure image URLs, and lifecycle policies to control costs.

## 9. Conclusion

SnapShare has approximately one million daily active users, generates one million photo uploads and 50 million feed views per day, and requires about 748.25 TB of additional image storage annually under the stated assumptions.

Because the system is read-heavy, its architecture should prioritize efficient feed retrieval and photo delivery through caching, database read replicas, object storage, and a CDN. A queue and thumbnail worker allow image processing to happen asynchronously, making uploads more responsive and the overall system easier to scale.