import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

// Database Initialization
const initDb = async () => {
  try {
    // 1. Create tables first
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(20),
        first_login BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        section VARCHAR(50) DEFAULT 'A',
        teacher_id INTEGER REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        class_id INTEGER REFERENCES classes(id),
        parent_id INTEGER REFERENCES users(id),
        roll_number VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE
      );

      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES assignments(id),
        student_id INTEGER REFERENCES students(id),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'unsubmitted'
      );

      CREATE TABLE IF NOT EXISTS marks (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        subject VARCHAR(100) NOT NULL,
        exam_month VARCHAR(20) NOT NULL,
        score INTEGER NOT NULL,
        total_marks INTEGER DEFAULT 100
      );

      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        title VARCHAR(255) NOT NULL,
        target_value INTEGER,
        current_value INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        message TEXT NOT NULL,
        type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE
      );
    `);

    // Ensure column section exists in classes table
    try {
      await pool.query("ALTER TABLE classes ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT 'A'");
    } catch (e) { console.log("Migration: section column check failed or already exists"); }

    // 2. Add Unique Constraints if missing (Resilience for existing DBs)
    try {
      await pool.query("ALTER TABLE classes ADD CONSTRAINT unique_class_section UNIQUE (name, section)");
    } catch (e) { /* already exists */ }
    
    try {
      await pool.query("ALTER TABLE students ADD CONSTRAINT unique_student_roll UNIQUE (class_id, roll_number)");
    } catch (e) { /* already exists */ }

    // 3. Seed default admin
    const adminExists = await pool.query("SELECT * FROM users WHERE username = 'admin@edu.np'");
    if (adminExists.rows.length === 0) {
      const hashedPwd = await bcrypt.hash("admin12345", 10);
      await pool.query(
        "INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)",
        ["admin@edu.np", hashedPwd, "admin", "System Administrator"]
      );
    }

    // 4. Seed default classes (ECD to 12)
    const classCountResult = await pool.query("SELECT count(*) FROM classes");
    if (parseInt(classCountResult.rows[0].count) <= 1) {
      const defaultClasses = ['ECD', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      for (const className of defaultClasses) {
        await pool.query("INSERT INTO classes (name, section) VALUES ($1, $2) ON CONFLICT DO NOTHING", [`Class ${className}`, 'A']);
      }
    }
    
    console.log("Database initialized and constraints verified");
  } catch (err) {
    console.error("DB Init Error:", err);
  }
};

initDb();

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API Routes
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name, firstLogin: user.first_login } });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
  const { newPassword } = req.body;
  try {
    const hashedPwd = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1, first_login = FALSE WHERE id = $2", [hashedPwd, req.user.id]);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Seeding Trigger
app.post("/api/admin/seed-demo", authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    console.log("Manual seeding triggered by admin...");
    const demoPwd = await bcrypt.hash("123456", 10);
    
    // 1. Ensure Classes exist first (ECD to 12)
    const defaultClasses = ['ECD', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    for (const className of defaultClasses) {
      await pool.query("INSERT INTO classes (name, section) VALUES ($1, $2) ON CONFLICT DO NOTHING", [`Class ${className}`, 'A']);
    }

    // 2. Teachers
    const teachers = [
      { name: "Diamond Ghimire", username: "diamond" },
      { name: "Sachin Kharel", username: "sachin" },
      { name: "Bishal Paudel", username: "bishal" }
    ];
    const teacherIds = {};
    for (const t of teachers) {
      const res = await pool.query(
        "INSERT INTO users (username, password, role, name, mobile) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [t.username, demoPwd, "teacher", t.name, "9841000000"]
      );
      teacherIds[t.username] = res.rows[0].id;
    }

    // 3. Parents
    const parents = [
      { name: "Hari Prasad Sharma", username: "hari" },
      { name: "Mina Thapa", username: "mina" },
      { name: "Krishna Bahadur Ale", username: "krishna" }
    ];
    const parentIds = {};
    for (const p of parents) {
      const res = await pool.query(
        "INSERT INTO users (username, password, role, name, mobile) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [p.username, demoPwd, "parent", p.name, "9841999999"]
      );
      parentIds[p.username] = res.rows[0].id;
    }

    // 4. Assign teachers
    if (teacherIds['diamond']) await pool.query("UPDATE classes SET teacher_id = $1 WHERE name = 'Class 10'", [teacherIds['diamond']]);
    if (teacherIds['sachin']) await pool.query("UPDATE classes SET teacher_id = $1 WHERE name = 'Class 9'", [teacherIds['sachin']]);
    if (teacherIds['bishal']) await pool.query("UPDATE classes SET teacher_id = $1 WHERE name = 'Class 8'", [teacherIds['bishal']]);

    // 5. Students
    const classRes = await pool.query("SELECT id, name FROM classes");
    const classMap = {};
    classRes.rows.forEach(c => classMap[c.name] = c.id);

    const studentsData = [
      { name: "Aarav Sharma", parent: "hari", class: "Class 10", roll: "101" },
      { name: "Sneha Thapa", parent: "mina", class: "Class 10", roll: "102" },
      { name: "Pratik Karki", parent: "hari", class: "Class 9", roll: "901" },
      { name: "Samikshya Gautam", parent: "mina", class: "Class 9", roll: "902" },
      { name: "Rohan Ale", parent: "krishna", class: "Class 8", roll: "801" },
      { name: "Anisha Adhikari", parent: "krishna", class: "Class 8", roll: "802" },
      { name: "Bibek Pun", parent: "mina", class: "Class 7", roll: "701" },
      { name: "Alisha KC", parent: "hari", class: "Class 7", roll: "702" },
      { name: "Suman Rai", parent: "mina", class: "Class 6", roll: "601" },
      { name: "Kritika Bhandari", parent: "krishna", class: "Class 6", roll: "602" },
      { name: "Roshan Gurung", parent: "hari", class: "Class 5", roll: "501" },
      { name: "Elina Poudel", parent: "mina", class: "Class 5", roll: "502" },
      { name: "Nishan Magar", parent: "krishna", class: "Class 4", roll: "401" },
      { name: "Sarina Basnet", parent: "hari", class: "Class 4", roll: "402" },
      { name: "Dipesh Bohora", parent: "krishna", class: "Class 3", roll: "301" }
    ];

    for (const s of studentsData) {
      await pool.query(
        "INSERT INTO students (name, class_id, parent_id, roll_number) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
        [s.name, classMap[s.class] || (classRes.rows[0] ? classRes.rows[0].id : null), parentIds[s.parent], s.roll]
      );
    }
    
    res.json({ message: "Demo data successfully seeded. Please refresh the page." });
  } catch (err) {
    console.error("Seed Error:", err);
    res.status(500).json({ error: "Database error during seeding: " + err.message });
  }
});

// Admin Routes
app.get("/api/admin/users", authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    const result = await pool.query("SELECT id, username, role, name, mobile, first_login FROM users WHERE role != 'admin'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/users", authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { username, role, name, mobile } = req.body;
  try {
    const hashedPwd = await bcrypt.hash("123456", 10);
    const result = await pool.query(
      "INSERT INTO users (username, password, role, name, mobile) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [username, hashedPwd, role, name, mobile]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/classes", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.name as teacher_name 
      FROM classes c 
      LEFT JOIN users u ON c.teacher_id = u.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/classes", authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { name, section, teacher_id } = req.body;
  try {
    await pool.query("INSERT INTO classes (name, section, teacher_id) VALUES ($1, $2, $3)", [name, section, teacher_id]);
    res.json({ message: "Class created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/students", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, c.name as class_name, c.section as section, p.name as parent_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN users p ON s.parent_id = p.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/students", authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { name, class_id, parent_id, roll_number } = req.body;
  try {
    await pool.query("INSERT INTO students (name, class_id, parent_id, roll_number) VALUES ($1, $2, $3, $4)", [name, class_id, parent_id, roll_number]);
    res.json({ message: "Student created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher Routes
app.get("/api/teacher/classes", authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  try {
    const result = await pool.query("SELECT * FROM classes WHERE teacher_id = $1", [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/teacher/students/:classId", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM students WHERE class_id = $1", [req.params.classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teacher/attendance", authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  const { student_id, status } = req.body;
  const date = new Date().toISOString().split('T')[0];
  try {
    await pool.query("INSERT INTO attendance (student_id, date, status) VALUES ($1, $2, $3)", [student_id, date, status]);
    
    if (status === 'absent') {
      const studentResult = await pool.query("SELECT parent_id, name FROM students WHERE id = $1", [student_id]);
      const student = studentResult.rows[0];
      const alertMsg = `${student.name} was absent today (${date})`;
      await pool.query("INSERT INTO alerts (student_id, message, type) VALUES ($1, $2, $3)", [student_id, alertMsg, 'attendance']);
      io.to(`parent_${student.parent_id}`).emit('new_alert', { message: alertMsg, type: 'attendance' });
    }
    res.json({ message: "Attendance marked" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teacher/marks", authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  const { student_id, subject, exam_month, score, total_marks } = req.body;
  try {
    await pool.query("INSERT INTO marks (student_id, subject, exam_month, score, total_marks) VALUES ($1, $2, $3, $4, $5)", [student_id, subject, exam_month, score, total_marks]);
    
    if (score < (total_marks * 0.4)) {
      const studentResult = await pool.query("SELECT parent_id, name FROM students WHERE id = $1", [student_id]);
      const student = studentResult.rows[0];
      const alertMsg = `${student.name} scored low in ${subject} for ${exam_month}`;
      await pool.query("INSERT INTO alerts (student_id, message, type) VALUES ($1, $2, $3)", [student_id, alertMsg, 'marks']);
      io.to(`parent_${student.parent_id}`).emit('new_alert', { message: alertMsg, type: 'marks' });
    }
    res.json({ message: "Marks entered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Parent Routes
app.get("/api/parent/children", authenticateToken, async (req, res) => {
  if (req.user.role !== 'parent') return res.sendStatus(403);
  try {
    const result = await pool.query(`
      SELECT s.*, c.name as class_name, c.section as section 
      FROM students s 
      JOIN classes c ON s.class_id = c.id 
      WHERE s.parent_id = $1
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/student/stats/:studentId", authenticateToken, async (req, res) => {
  try {
    const attendance = await pool.query("SELECT status, count(*) FROM attendance WHERE student_id = $1 GROUP BY status", [req.params.studentId]);
    const marks = await pool.query("SELECT * FROM marks WHERE student_id = $1 ORDER BY exam_month", [req.params.studentId]);
    const alerts = await pool.query("SELECT * FROM alerts WHERE student_id = $1 ORDER BY created_at DESC", [req.params.studentId]);
    const goals = await pool.query("SELECT * FROM goals WHERE student_id = $1", [req.params.studentId]);
    
    res.json({ attendance: attendance.rows, marks: marks.rows, alerts: alerts.rows, goals: goals.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket setup
io.on('connection', (socket) => {
  socket.on('join_parent', (parentId) => {
    socket.join(`parent_${parentId}`);
  });
});

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
