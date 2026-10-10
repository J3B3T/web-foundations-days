  
# School Database Design

## 1. Tables and Their Purpose

### Students Table
The `students` table stores information about students. It contains `student_id`, `name`, and `email`. The `student_id` is the primary key used to identify each student uniquely. The email is required and must be unique so that two students cannot register with the same email address.

### Courses Table
The `courses` table stores information about the courses offered by the school. It contains `course_id`, `course_name`, and `course_code`. The `course_id` is the primary key, while `course_code` is unique to prevent duplicate course codes.

### Enrolments Table
The `enrolments` table records which students are registered for which courses. It contains `enrolment_id`, `student_id`, `course_id`, and `grade`. The `enrolment_id` is the primary key. The `student_id` and `course_id` are foreign keys referencing the students and courses tables. The grade records the student's result in a course. The combination of `student_id` and `course_id` is unique, preventing the same student from enrolling in the same course more than once.

## 2. Relationships Between the Tables

There is a one-to-many relationship between students and enrolments because one student can have several enrolment records, while each enrolment belongs to one student. There is also a one-to-many relationship between courses and enrolments because one course can have many enrolment records, while each enrolment refers to one course.

Students and courses have a many-to-many relationship because one student can take several courses, and each course can have several students. The enrolments table acts as a join table that connects students and courses. It is necessary because a direct many-to-many relationship cannot be represented properly using only a single foreign key in either table. The join table also stores additional information, such as each student's grade for a course.

## 3. Index Recommendation

I would add an index on `enrolments(course_id)` to improve the performance of queries that retrieve students enrolled in a particular course and queries that group enrolments by course. This is useful when the school database grows and contains many enrolment records. The unique constraint on `(student_id, course_id)` already creates a uniqueness-enforcing index in SQLite, so a separate index on that exact combination would generally be unnecessary.

Example:

```sql
CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);
```

## 4. SQL or NoSQL?

I would choose a relational SQL database for this school system because students, courses, and enrolments have clear relationships and structured data. SQL supports primary keys, foreign keys, unique constraints, and queries using JOIN and GROUP BY, which help maintain accurate records and retrieve useful information. SQLite is also suitable for a small school database because it is lightweight, simple to set up, and does not require a separate database server. A NoSQL database could be useful for flexible or highly varied data, but it is not necessary for this system's structured student, course, and enrolment records.
