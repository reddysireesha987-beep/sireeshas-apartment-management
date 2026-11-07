-- Sireesha Apartment Management System
-- Import this file in MySQL Workbench/phpMyAdmin before starting the server.

CREATE DATABASE IF NOT EXISTS sireesha_apartment
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sireesha_apartment;

CREATE TABLE IF NOT EXISTS flats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flat_number VARCHAR(20) NOT NULL UNIQUE,
  block_name VARCHAR(40) NOT NULL DEFAULT 'Block A',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visitor_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  flat_id INT NOT NULL,
  purpose VARCHAR(180) NOT NULL,
  vehicle_number VARCHAR(30) NULL,
  notes VARCHAR(500) NULL,
  status ENUM('checked_in','checked_out') NOT NULL DEFAULT 'checked_in',
  check_in DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_out DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_visitor_flat FOREIGN KEY (flat_id) REFERENCES flats(id)
);

-- Example flats. Change/add these rows as required; the website dropdown reads from this table.
INSERT IGNORE INTO flats (flat_number, block_name) VALUES
('A-101','Block A'),('A-102','Block A'),('A-103','Block A'),('A-104','Block A'),
('A-201','Block A'),('A-202','Block A'),('A-203','Block A'),('A-204','Block A'),
('B-101','Block B'),('B-102','Block B'),('B-103','Block B'),('B-104','Block B'),
('B-201','Block B'),('B-202','Block B'),('B-203','Block B'),('B-204','Block B'),
('C-101','Block C'),('C-102','Block C'),('C-201','Block C'),('C-202','Block C');

CREATE INDEX idx_visitors_status ON visitors(status);
CREATE INDEX idx_visitors_checkin ON visitors(check_in);
CREATE INDEX idx_visitors_name_phone ON visitors(visitor_name, phone);
