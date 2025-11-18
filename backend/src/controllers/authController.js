import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {
  createUser,
  getUserByEmail,
  getUserByFullName,
  createStudent,
  getAdminByUserName,
  getStudentByEmail,
} from "../utils/helperFunctions.js";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

const register = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });
    const existing = await getUserByEmail(email);
    if (existing)
      return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = await createUser(email, hash, full_name || null);

    const token = jwt.sign({ sub: userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    res.status(201).json({ token, user: { id: userId, email, full_name } });
  } catch (err) {
    console.error("Register error", err);
    res.status(500).json({ error: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name },
    });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ error: "Server error" });
  }
};

const studentRegister = async (req, res) => {
  try {
    // Required fields: email, password, organizationName
    const {
      email,
      password,
      organizationName,
      full_name,
      std,
      class: classVal,
    } = req.body;

    if (!email || !password || !organizationName) {
      return res.status(400).json({
        error: "Email, password, and organization name are required.",
      });
    }

    // 1. VALIDATE & GET ADMIN ID (ORGANIZATION OWNER)
    const admin = await getAdminByUserName(organizationName);
    if (!admin) {
      return res
        .status(404)
        .json({ error: "Organization name (Admin username) not found." });
    }
    const adminUserId = admin.id;

    // 2. CHECK FOR EXISTING EMAIL DUPLICATION
    const existingAdmin = await getUserByEmail(email);
    if (existingAdmin)
      return res
        .status(409)
        .json({ error: "Email already registered as an administrator." });

    const existingStudent = await getStudentByEmail(email);
    if (existingStudent)
      return res
        .status(409)
        .json({ error: "Email already registered as a student." });

    // 3. HASH PASSWORD AND CREATE STUDENT
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const studentId = await createStudent(
      adminUserId, // user_id (Admin FK)
      email.split("@")[0], // Student's user_name (using email prefix for simplicity)
      email,
      hash,
      full_name || null,
      std || null,
      classVal || null
    );

    // 4. GENERATE JWT TOKEN
    const token = jwt.sign(
      {
        sub: studentId,
        role: "student",
        adminId: adminUserId,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
      }
    );

    res.status(201).json({
      success: true,
      message: "Student registered successfully",
      token,
      user: {
        id: studentId,
        email,
        full_name,
        role: "student",
        adminId: adminUserId,
      },
    });
  } catch (err) {
    console.error("Student Register error", err);
    res.status(500).json({ error: "Server error during student registration" });
  }
};

const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await getStudentByEmail(email);
    if (!user)
      return res.status(404).json({ error: "User not found as student" }); // Use 404 to distinguish

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    // JWT payload for student
    const token = jwt.sign(
      { sub: user.id, role: "student", adminId: user.user_id },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: "student",
        adminId: user.user_id,
      },
    });
  } catch (err) {
    console.error("Student Login error", err);
    res.status(500).json({ error: "Server error" });
  }
};

// We keep the original admin login function, but need a mechanism to call both.

const adminLogin = async (req, res) => {
  // Renaming original 'login' to 'adminLogin' internally for clarity
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = await getUserByEmail(email);
    if (!user)
      return res.status(404).json({ error: "User not found as admin" }); // Use 404 to distinguish

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    // JWT payload for admin
    const token = jwt.sign({ sub: user.id, role: "admin" }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: "admin",
      },
    });
  } catch (err) {
    console.error("Admin Login error", err);
    res.status(500).json({ error: "Server error" });
  }
};

export { register as adminRegister, adminLogin, studentRegister, studentLogin };
