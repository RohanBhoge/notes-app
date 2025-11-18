-- init-auth-schema.sql
-- Run this in your MySQL server to create the users and question_papers tables

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    std VARCHAR(100),
    class VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS question_papers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    paper_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    exam_name VARCHAR(255),
    class VARCHAR(100),
    subject VARCHAR(255),
    exam_date DATE,
    marks INT DEFAULT 0,
    paper_questions LONGTEXT,
    paper_answers LONGTEXT,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_user_id (user_id),
    UNIQUE KEY uq_paper_id (paper_id)
);

-- Optional legacy table (if you still want exam_papers)
CREATE TABLE IF NOT EXISTS exam_papers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    paper_id VARCHAR(255) NOT NULL,
    exam_name VARCHAR(255),
    class VARCHAR(100),
    subject VARCHAR(255),
    exam_date DATE,
    marks INT DEFAULT 0,
    paper_questions LONGTEXT,
    paper_answers LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_paper_id_legacy (paper_id)
);