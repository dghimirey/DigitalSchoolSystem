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
        plain_password VARCHAR(255),
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
        status VARCHAR(20) NOT NULL,
        UNIQUE(student_id, date)
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id),
        subject VARCHAR(100),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE
      );

      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES assignments(id),
        student_id INTEGER REFERENCES students(id),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'unsubmitted',
        UNIQUE(assignment_id, student_id)
      );

      CREATE TABLE IF NOT EXISTS marks (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        subject VARCHAR(100) NOT NULL,
        exam_month VARCHAR(20) NOT NULL,
        score INTEGER NOT NULL,
        total_marks INTEGER DEFAULT 100,
        UNIQUE(student_id, subject, exam_month)
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id),
        name VARCHAR(100) NOT NULL,
        full_marks INTEGER DEFAULT 100,
        pass_marks INTEGER DEFAULT 40,
        UNIQUE(class_id, name)
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

    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255)");
    } catch (e) { console.log("Migration: plain_password column check failed"); }

    try {
      await pool.query("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS subject VARCHAR(100)");
    } catch (e) { console.log("Migration: assignments subject column check failed"); }

    // 2. Add Unique Constraints if missing (Resilience for existing DBs)
    try {
      await pool.query("ALTER TABLE classes ADD CONSTRAINT unique_class_section UNIQUE (name, section)");
    } catch (e) { /* already exists */ }
    
    try {
      await pool.query("ALTER TABLE students ADD CONSTRAINT unique_student_roll UNIQUE (class_id, roll_number)");
    } catch (e) { /* already exists */ }

    try {
      await pool.query("ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date)");
    } catch (e) { /* already exists */ }

    try {
      await pool.query("ALTER TABLE assignment_submissions ADD CONSTRAINT submission_assign_student_key UNIQUE (assignment_id, student_id)");
    } catch (e) { /* already exists */ }

    try {
      await pool.query("ALTER TABLE marks ADD CONSTRAINT marks_student_subject_month_key UNIQUE (student_id, subject, exam_month)");
    } catch (e) { /* already exists */ }

    // 3. Seed default admin
    const adminExists = await pool.query("SELECT * FROM users WHERE username = 'admin@edu.np'");
    if (adminExists.rows.length === 0) {
      const hashedPwd = await bcrypt.hash("admin12345", 10);
      await pool.query(
        "INSERT INTO users (username, password, plain_password, role, name) VALUES ($1, $2, $3, $4, $5)",
        ["admin@edu.np", hashedPwd, "admin12345", "admin", "System Administrator"]
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
    await pool.query("UPDATE users SET password = $1, plain_password = $2, first_login = FALSE WHERE id = $3", [hashedPwd, newPassword, req.user.id]);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/user/profile", authenticateToken, async (req, res) => {
  const { name, mobile } = req.body;
  try {
    await pool.query("UPDATE users SET name = $1, mobile = $2 WHERE id = $3", [name, mobile, req.user.id]);
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Seeding Trigger
app.post("/api/admin/seed-demo", authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    console.log("Manual seeding triggered by admin...");
    const demoPwd = "123456";
    const hashedDemoPwd = await bcrypt.hash(demoPwd, 10);
    
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
        "INSERT INTO users (username, password, plain_password, role, name, mobile) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [t.username, hashedDemoPwd, demoPwd, "teacher", t.name, "9841000000"]
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
        "INSERT INTO users (username, password, plain_password, role, name, mobile) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [p.username, hashedDemoPwd, demoPwd, "parent", p.name, "9841999999"]
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
    const result = await pool.query("SELECT id, username, role, name, mobile, first_login, plain_password FROM users WHERE role != 'admin'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/users", authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  let { role, name, mobile, assigned_class_id, linked_student_ids } = req.body;
  
  // Auto-generate username: first name in small letters
  let generatedUsername = name.split(' ')[0].toLowerCase();
  
  // Basic collision avoidance (simple check, improve if needed)
  const existing = await pool.query("SELECT count(*) FROM users WHERE username = $1", [generatedUsername]);
  if (parseInt(existing.rows[0].count) > 0) {
    generatedUsername = `${generatedUsername}_${mobile.slice(-4)}`;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const defaultPwd = "123456";
    const hashedPwd = await bcrypt.hash(defaultPwd, 10);
    const result = await client.query(
      "INSERT INTO users (username, password, plain_password, role, name, mobile) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [generatedUsername, hashedPwd, defaultPwd, role, name, mobile]
    );
    
    const userId = result.rows[0].id;

    if (role === 'teacher' && assigned_class_id) {
      // Validation: Check if class already has a teacher
      const classCheck = await client.query("SELECT teacher_id FROM classes WHERE id = $1", [assigned_class_id]);
      if (classCheck.rows.length > 0 && classCheck.rows[0].teacher_id) {
        throw new Error("This class is already assigned to another teacher.");
      }
      await client.query("UPDATE classes SET teacher_id = $1 WHERE id = $2", [userId, assigned_class_id]);
    }

    if (role === 'parent' && Array.isArray(linked_student_ids) && linked_student_ids.length > 0) {
      await client.query("UPDATE students SET parent_id = $1 WHERE id = ANY($2::int[])", [userId, linked_student_ids]);
    }

    await client.query('COMMIT');
    res.json({ id: userId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put("/api/admin/users/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { name, mobile, role, assigned_class_id, password, username } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if username is being changed and if it's unique
    if (username) {
      const userCheck = await client.query("SELECT id FROM users WHERE username = $1 AND id != $2", [username, req.params.id]);
      if (userCheck.rows.length > 0) {
        throw new Error("Username already exists.");
      }
    }

    // Update user info
    if (password) {
      const hashedPwd = await bcrypt.hash(password, 10);
      await client.query(
        "UPDATE users SET name = $1, mobile = $2, role = $3, password = $4, plain_password = $5, username = $6 WHERE id = $7",
        [name, mobile, role, hashedPwd, password, username, req.params.id]
      );
    } else {
      await client.query(
        "UPDATE users SET name = $1, mobile = $2, role = $3, username = $4 WHERE id = $5",
        [name, mobile, role, username, req.params.id]
      );
    }

    // If teacher, handle class assignment
    if (role === 'teacher') {
      if (assigned_class_id) {
        // 1. Check if the target class is already assigned to ANOTHER teacher
        const classCheck = await client.query("SELECT teacher_id FROM classes WHERE id = $1", [assigned_class_id]);
        if (classCheck.rows.length > 0 && classCheck.rows[0].teacher_id && classCheck.rows[0].teacher_id != req.params.id) {
           throw new Error("The selected class is already assigned to another teacher.");
        }

        // 2. Check if this teacher is already assigned to a DIFFERENT class
        const teacherCheck = await client.query("SELECT id FROM classes WHERE teacher_id = $1 AND id != $2", [req.params.id, assigned_class_id]);
        if (teacherCheck.rows.length > 0) {
           throw new Error("This teacher is already assigned to another class. Please unassign them first.");
        }

        // 3. Perform assignment (Remove from current and add to new, but here we just update if it's different)
        await client.query("UPDATE classes SET teacher_id = NULL WHERE teacher_id = $1", [req.params.id]);
        await client.query("UPDATE classes SET teacher_id = $1 WHERE id = $2", [req.params.id, assigned_class_id]);
      } else {
        // Unassign if no class provided
        await client.query("UPDATE classes SET teacher_id = NULL WHERE teacher_id = $1", [req.params.id]);
      }
    }

    // If parent, handle student linking
    if (role === 'parent') {
      const { linked_student_ids } = req.body;
      if (Array.isArray(linked_student_ids)) {
         // 1. Unlink students currently linked to this user
         await client.query("UPDATE students SET parent_id = NULL WHERE parent_id = $1", [req.params.id]);
         // 2. Link the selected students
         if (linked_student_ids.length > 0) {
            await client.query("UPDATE students SET parent_id = $1 WHERE id = ANY($2::int[])", [req.params.id, linked_student_ids]);
         }
      }
    }

    await client.query('COMMIT');
    res.json({ message: "User updated and class assignment synchronized" });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/api/admin/users/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    // Check if user is linked to any students or classes
    const studentCheck = await pool.query("SELECT count(*) FROM students WHERE parent_id = $1", [req.params.id]);
    const classCheck = await pool.query("SELECT count(*) FROM classes WHERE teacher_id = $1", [req.params.id]);
    
    if (parseInt(studentCheck.rows[0].count) > 0 || parseInt(classCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: "User is linked to active students or classes and cannot be deleted." });
    }

    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ message: "User deleted" });
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
    if (teacher_id) {
      const teacherCheck = await pool.query("SELECT id, name FROM classes WHERE teacher_id = $1", [teacher_id]);
      if (teacherCheck.rows.length > 0) {
        return res.status(400).json({ error: `This teacher is already assigned to ${teacherCheck.rows[0].name}.` });
      }
    }
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

app.put("/api/admin/students/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { name, class_id, parent_id, roll_number } = req.body;
  try {
    await pool.query(
      "UPDATE students SET name = $1, class_id = $2, parent_id = $3, roll_number = $4 WHERE id = $5",
      [name, class_id, parent_id, roll_number, req.params.id]
    );
    res.json({ message: "Student updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/students/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    // Delete related records first (attendance, marks, goals, alerts)
    await pool.query("DELETE FROM attendance WHERE student_id = $1", [req.params.id]);
    await pool.query("DELETE FROM marks WHERE student_id = $1", [req.params.id]);
    await pool.query("DELETE FROM goals WHERE student_id = $1", [req.params.id]);
    await pool.query("DELETE FROM alerts WHERE student_id = $1", [req.params.id]);
    await pool.query("DELETE FROM assignment_submissions WHERE student_id = $1", [req.params.id]);
    
    await pool.query("DELETE FROM students WHERE id = $1", [req.params.id]);
    res.json({ message: "Student deleted" });
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
    const result = await pool.query("SELECT * FROM students WHERE class_id = $1 ORDER BY roll_number", [req.params.classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/teacher/attendance/:classId/:date", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT student_id, status 
      FROM attendance 
      WHERE student_id IN (SELECT id FROM students WHERE class_id = $1)
      AND date = $2
    `, [req.params.classId, req.params.date]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teacher/attendance", authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  const { student_id, status, date } = req.body;
  const attendanceDate = date || new Date().toISOString().split('T')[0];
  try {
    // Upsert attendance
    await pool.query(`
      INSERT INTO attendance (student_id, date, status) 
      VALUES ($1, $2, $3)
      ON CONFLICT ON CONSTRAINT attendance_student_id_date_key DO UPDATE SET status = EXCLUDED.status
    `, [student_id, attendanceDate, status]);
    
    if (status === 'absent') {
      const studentResult = await pool.query("SELECT parent_id, name FROM students WHERE id = $1", [student_id]);
      const student = studentResult.rows[0];
      const alertMsg = `${student.name} was absent on ${attendanceDate}`;
      await pool.query("INSERT INTO alerts (student_id, message, type) VALUES ($1, $2, $3)", [student_id, alertMsg, 'attendance']);
      io.to(`parent_${student.parent_id}`).emit('new_alert', { message: alertMsg, type: 'attendance' });
    }
    res.json({ message: "Attendance marked" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assignments
app.get("/api/teacher/assignments/:classId", authenticateToken, async (req, res) => {
  const { subject, date } = req.query;
  try {
    let query = "SELECT * FROM assignments WHERE class_id = $1";
    let params = [req.params.classId];
    
    if (subject) {
      query += ` AND subject = $${params.length + 1}`;
      params.push(subject);
    }
    if (date) {
      query += ` AND due_date = $${params.length + 1}`;
      params.push(date);
    }
    
    query += " ORDER BY due_date DESC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teacher/assignments", authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  const { class_id, title, description, due_date, subject } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO assignments (class_id, title, description, due_date, subject) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [class_id, title, description, due_date, subject]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/teacher/submissions/:assignmentId", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT student_id, status FROM assignment_submissions WHERE assignment_id = $1", [req.params.assignmentId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teacher/submissions/toggle", authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  const { assignment_id, student_id, status } = req.body;
  try {
    await pool.query(`
      INSERT INTO assignment_submissions (assignment_id, student_id, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (assignment_id, student_id) DO UPDATE SET status = EXCLUDED.status, submitted_at = CURRENT_TIMESTAMP
    `, [assignment_id, student_id, status]);
    res.json({ message: "Submission status updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marks
app.get("/api/teacher/marks/:classId/:subject/:month", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.* 
      FROM marks m
      JOIN students s ON m.student_id = s.id
      WHERE s.class_id = $1 AND m.subject = $2 AND m.exam_month = $3
    `, [req.params.classId, req.params.subject, req.params.month]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teacher/marks", authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  const { student_id, subject, exam_month, score, total_marks } = req.body;
  
  if (score > total_marks) {
    return res.status(400).json({ error: "Score cannot exceed full marks." });
  }

  try {
    await pool.query(`
      INSERT INTO marks (student_id, subject, exam_month, score, total_marks) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (student_id, subject, exam_month) DO UPDATE 
      SET score = EXCLUDED.score, total_marks = EXCLUDED.total_marks
    `, [student_id, subject, exam_month, score, total_marks]);
    
    // Get pass marks for alert
    const subjectRes = await pool.query("SELECT pass_marks FROM subjects WHERE class_id = (SELECT class_id FROM students WHERE id = $1) AND name = $2", [student_id, subject]);
    const passMarks = subjectRes.rows.length > 0 ? subjectRes.rows[0].pass_marks : (total_marks * 0.4);

    if (score < passMarks) {
      const studentResult = await pool.query("SELECT parent_id, name FROM students WHERE id = $1", [student_id]);
      const student = studentResult.rows[0];
      const alertMsg = `${student.name} failed to reach passing threshold in ${subject} for ${exam_month} (Score: ${score}/${total_marks})`;
      await pool.query("INSERT INTO alerts (student_id, message, type) VALUES ($1, $2, $3)", [student_id, alertMsg, 'marks']);
      io.to(`parent_${student.parent_id}`).emit('new_alert', { message: alertMsg, type: 'marks' });
    }
    res.json({ message: "Marks recorded" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subjects
app.get("/api/teacher/subjects/:classId", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM subjects WHERE class_id = $1 ORDER BY name", [req.params.classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/teacher/subjects", authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  const { class_id, name, full_marks, pass_marks } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO subjects (class_id, name, full_marks, pass_marks) VALUES ($1, $2, $3, $4) ON CONFLICT (class_id, name) DO UPDATE SET full_marks = EXCLUDED.full_marks, pass_marks = EXCLUDED.pass_marks RETURNING id",
      [class_id, name, full_marks, pass_marks]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/teacher/subjects/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  try {
    await pool.query("DELETE FROM subjects WHERE id = $1", [req.params.id]);
    res.json({ message: "Subject deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher Stats
app.get("/api/teacher/class-stats/:classId", authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.sendStatus(403);
  try {
    const avgMarks = await pool.query(`
      SELECT subject, AVG(score) as avg_score, MAX(total_marks) as max_marks
      FROM marks m
      JOIN students s ON m.student_id = s.id
      WHERE s.class_id = $1
      GROUP BY subject
    `, [req.params.classId]);

    const lowAttendance = await pool.query(`
      SELECT s.name, COUNT(*) FILTER (WHERE a.status = 'absent') as absences
      FROM students s
      JOIN attendance a ON s.id = a.student_id
      WHERE s.class_id = $1
      GROUP BY s.name
      HAVING COUNT(*) FILTER (WHERE a.status = 'absent') > 3
    `, [req.params.classId]);

    res.json({
      averages: avgMarks.rows,
      atRisk: lowAttendance.rows
    });
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
    const studentInfo = await pool.query("SELECT class_id FROM students WHERE id = $1", [req.params.studentId]);
    if (studentInfo.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    const classId = studentInfo.rows[0].class_id;

    const attendance = await pool.query("SELECT status, count(*) FROM attendance WHERE student_id = $1 GROUP BY status", [req.params.studentId]);
    const marks = await pool.query(`
      SELECT m.*, sub.pass_marks, sub.full_marks as subject_full_marks
      FROM marks m
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN subjects sub ON sub.class_id = s.class_id AND sub.name = m.subject
      WHERE m.student_id = $1 
      ORDER BY m.exam_month
    `, [req.params.studentId]);
    const alerts = await pool.query("SELECT * FROM alerts WHERE student_id = $1 ORDER BY created_at DESC", [req.params.studentId]);
    const goals = await pool.query("SELECT * FROM goals WHERE student_id = $1", [req.params.studentId]);
    const assignments = await pool.query("SELECT status, count(*) FROM assignment_submissions WHERE student_id = $1 GROUP BY status", [req.params.studentId]);
    const totalAssignments = await pool.query("SELECT count(*) FROM assignments WHERE class_id = $1", [classId]);
    const recentAttendance = await pool.query("SELECT status, date FROM attendance WHERE student_id = $1 ORDER BY date DESC", [req.params.studentId]);
    
    // Calculate Streak
    let streak = 0;
    for (const record of recentAttendance.rows) {
      if (record.status === 'present' || record.status === 'late') {
        streak++;
      } else if (record.status === 'absent') {
        break;
      }
      // If status is something else or missing, it's a holiday/skip, keep going or just ignore
    }

    res.json({ 
      attendance: attendance.rows, 
      marks: marks.rows, 
      alerts: alerts.rows, 
      goals: goals.rows,
      assignments: assignments.rows,
      totalAssignments: parseInt(totalAssignments.rows[0].count),
      recentAttendance: recentAttendance.rows.slice(0, 30),
      streak: streak
    });
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
