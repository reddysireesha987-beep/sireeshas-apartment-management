# Sireesha Apartment Management System

A responsive full-stack apartment visitor management website built with **HTML, CSS, JavaScript, Node.js, Express and MySQL**.

## Features

- Dashboard showing total visits, visitors currently inside, today's arrivals and today's check-outs.
- Visitor registration with name, phone, flat dropdown, purpose, vehicle number and notes.
- Flat dropdown options are fetched from the MySQL `flats` table. Add or edit flats in SQL and the dropdown updates automatically.
- Check-in timestamp is saved automatically when a visitor is registered.
- One-click check-out saves departure timestamp and updates visitor status.
- Search visitor records by name, phone number, flat number or purpose.
- Filter records by inside / checked-out status.
- Responsive teal and navy interface with non-human apartment imagery.
- Placeholder spaces reserved for your photo; you can provide your photo later.

## Requirements

Install:
1. Node.js LTS from https://nodejs.org/
2. MySQL Server and MySQL Workbench (or phpMyAdmin).

## Setup in VS Code

### 1. Create the database

Open MySQL Workbench, connect to your local MySQL server, open `database.sql`, and run the whole script.

It creates the `sireesha_apartment` database, the `flats` and `visitors` tables, and sample flat numbers. The flat dropdown reads directly from this database table.

### 2. Configure database credentials

Copy `.env.example` and rename the copy to `.env`. Update the values to match your local MySQL setup:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=sireesha_apartment
```

Replace `your_actual_mysql_password` with your MySQL password. If your MySQL root account has no password, leave `DB_PASSWORD=` blank.

### 3. Install packages

Open the VS Code terminal in this project folder and run:

```bash
npm install
```

### 4. Start the server

```bash
npm start
```

Open **http://localhost:3000** in your browser. Do not open `index.html` directly or use Live Server for the full-stack version; the Express server serves the site and connects the API to MySQL.

For automatic restart during development, use:

```bash
npm run dev
```

## How SQL changes show up in the website

The flat dropdown is loaded using `GET /api/flats`. To add a flat, run a SQL query like:

```sql
USE sireesha_apartment;
INSERT INTO flats (flat_number, block_name)
VALUES ('D-301', 'Block D');
```

Refresh the website or reopen the registration form. The new flat appears in the dropdown because the frontend requests the current database rows.

To change a flat label:

```sql
UPDATE flats SET flat_number = 'D-302', block_name = 'Block D'
WHERE flat_number = 'D-301';
```

To see all visitor entries:

```sql
SELECT v.id, v.visitor_name, v.phone, f.flat_number, v.purpose,
       v.status, v.check_in, v.check_out
FROM visitors v
JOIN flats f ON f.id = v.flat_id
ORDER BY v.check_in DESC;
```

To add flats through SQL is intentional for this starter version. An admin-only flat-management page and authentication are not included.

## API routes

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Checks database connectivity |
| GET | `/api/flats` | Loads flat dropdown options from MySQL |
| GET | `/api/stats` | Dashboard totals |
| GET | `/api/visitors` | Lists/searches visitor records |
| POST | `/api/visitors` | Registers a visitor and checks them in |
| PATCH | `/api/visitors/:id/checkout` | Records check-out |

## Project structure

```text
Sireesha_Apartment_Management_System/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── database.sql
├── server.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Troubleshooting

- **Database connection failed:** confirm MySQL Server is running and `.env` credentials are correct.
- **Unknown database/table:** run `database.sql` in MySQL Workbench.
- **Flat dropdown empty:** check `SELECT * FROM sireesha_apartment.flats;`.
- **Port already in use:** change `PORT=3001` in `.env` and open `http://localhost:3001`.
- **Changes not visible:** refresh the browser; after editing server code, restart Node.js.

## Before using in a real apartment

This is a functional starter/demo project, not a production security system. Add authentication and role permissions, HTTPS, backups, audit logs, rate limiting, stronger validation, and a privacy policy before handling real resident or visitor information. Keep `.env` private and never commit it to Git.
