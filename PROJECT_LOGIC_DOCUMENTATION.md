# Project Logic & Architecture Documentation

## 1. Overview
This project is an **AI-Powered Question Paper Generation (QPG) System** designed for educational organizations. It allows localized management of users (Admins/Teachers and Students) and automates the creation of exam papers using a repository of questions.

### Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MySQL (relational data), with questions stored in a flat-file JSON structure (ZIP archive).
- **Frontend:** React (Vite)
- **Infrastructure:** AWS S3 (for image/logo storage), AWS EC2/Elastic Beanstalk (deployment target).

---

## 2. Backend Logic (Deep Dive)

The backend is built using a **Layered Architecture**:
1.  **Routes:** Define API endpoints.
2.  **Controllers:** Handle HTTP request/response validation.
3.  **Services:** Contain business logic.
4.  **Utils/Helpers:** Handle low-level operations (DB queries, Algorithms).

### A. Core Algorithm: Question Paper Generation
The heart of the application is the "Question Paper Generator". Unlike traditional systems that query a database for questions one by one, this system uses a **High-Performance In-Memory approach**.

**1. Data Loading (`zipLoader.js`)**
*   **Source:** Questions are not stored in MySQL. They are stored in a massive compressed archive (`data.zip`) containing thousands of JSON/JSONL files.
*   **Caching Strategy:** On the first request, the system loads the ZIP file into RAM (`_zipCache`). It checks the file's modification time; if the ZIP hasn't changed, it serves from RAM to ensure millisecond-level distinct searches.
*   **Parsing:** It recursively parses the directory structure of the ZIP (e.g., `ExamName/Class11/Physics/Force.json`) to automatically infer metadata (Exam, Standard, Subject, Chapter) for every question.

**2. Filtering & Selection (`generatePaperHelper.js`)**
*   **Normalization:** Input parameters (e.g., "Physics", "11th") are normalized (lowercased, special chars removed) to perform "fuzzy matching" against the questions.
*   **Filtering:** The `matchesFiltersObj` function iterates through the in-memory question array and filters by:
    *   Exam (e.g., JEE, NEET)
    *   Standard (Class 11, 12)
    *   Subject
    *   Chapters (List of specific chapters)
*   **Randomization (Seeded Shuffle):**
    *   The system uses a **Seeded Pseudo-Random Number Generator (Mulberry32)**.
    *   **Why?** This allows "Time-Travel" debugging. If a user encounters an issue with a generated paper, providing the `seed` (stored in metadata) allows the developer to regenerate the *exact* same paper to reproduce the bug.
*   **Selection:** The algorithm shuffles the filtered pool and picks the requested `count` of questions.

**3. Formatting**
*   **LaTeX Parsing:** A custom Regex-based parser (`latexToText`) converts raw LaTeX (e.g., `\frac{1}{2}`) into readable UTF-8 text (e.g., `1/2`) for the frontend.
*   **Image Mapping:** Questions with images have their paths resolved to **AWS S3 Public URLs** based on a standard naming convention logic (`getS3Url`).

---

### B. Database Schema & Persistence
MySQL is used for User Management and storing the *Results* (Generated Papers), not the *Source* (Questions).

**1. Tables (Auto-Initialized in `helperFunctions.js`)**
*   **`users`**: Stores Organizations (Admins).
    *   *Key Logic:* Includes `subscription_end_date` and `is_active` flags. A daily Cron Job (`cron.schedule`) checks this and deactivates expired users automatically.
    *   *Dynamic Migration:* `ensureUserColumnsExist` runs on startup to alter the table structure (adding columns like `logo` or `subscription_start_date`) without needing manual SQL migrations.
*   **`students`**: Stores Student accounts.
    *   *Relationship:* Linked to `users` via `user_id`. Students must register under a specific "Organization" (Admin Name).
*   **`question_papers`**: Stores history of generated papers.
    *   *Storage:* The actual questions and answers are stored as **JSON Strings** in `LONGTEXT` columns to avoid complex join tables for static historical data.
*   **`notifications`**: Simple event system for organization announcements.

---

### C. Authentication Flow (`authService.js`)
*   **Dual-Role System:** Logic splits paths for `Admin` and `Student`.
*   **JWT Strategy:**
    *   **Access Token:** Short-lived (e.g., 15-60m). Used for API access.
    *   **Refresh Token:** Long-lived. Used to generate new Access Tokens without re-login.
*   **Organization Linking:**
    *   When a student registers, they input an `organizationName`.
    *   The backend searches the `users` table for an Admin with that `username/full_name` and links the student to that ID.
*   **Security:** Passwords are hashed with `bcrypt`.

---

## 3. Frontend-Backend Interaction

### A. Paper Generation Flow
1.  **User Action:** User selects Exam, Class, Subject, and Chapters on `TeacherDashboard.jsx`.
2.  **API Call:** Frontend sends POST to `/api/v1/paper/generate-paper`.
3.  **Processing:** Backend loads ZIP -> Filters -> Shuffles -> Selects -> Formats.
4.  **Display:** Backend returns a JSON object with `paper_questions` (text), `paper_answers`, and `question_list` (array of objects). Frontend renders this immediately.
5.  **Saving:** If the user likes the paper, they click "Save". Frontend sends POST to `/api/v1/paper/store-paper` to persist it in MySQL.

### B. Image Handling
*   **Frontend:** Does NOT request images from the backend directly.
*   **Backend:** Returns **Strings** (URLs) pointing to AWS S3.
*   **Browser:** The user's browser fetches the images directly from S3 using the URLs provided by the backend API.

### C. Student Registration
1.  **Frontend:** Student enters details + "Organization Name".
2.  **Backend:** Verifies Organization exists -> Checks for duplicates -> Hashes password -> Creates record -> Generates Tokens.
