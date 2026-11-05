import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { School } from '../models/School';
import { User } from '../models/User';
import { generateAuthToken } from '../utils/jwt';
import { AuditLog } from '../models/AuditLog';

export async function registerSchool(req: Request, res: Response): Promise<void> {
  try {
    const { schoolName, schoolCode, adminName, email, password } = req.body;

    if (!schoolName || !schoolCode || !adminName || !email || !password) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    const existingSchool = await School.findOne({ code: schoolCode.toUpperCase() });
    if (existingSchool) {
      res.status(409).json({ error: 'A school with this code already exists.' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists.' });
      return;
    }

    const school = await School.create({
      name: schoolName,
      code: schoolCode.toUpperCase(),
    });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      schoolId: school._id,
      name: adminName,
      email: email.toLowerCase(),
      passwordHash,
      role: 'admin',
    });

    await AuditLog.create({
      schoolId: school._id,
      userId: user._id,
      action: 'SCHOOL_REGISTERED',
      resourceType: 'School',
      resourceId: String(school._id),
      details: { schoolName, adminEmail: email.toLowerCase() },
    });

    const token = generateAuthToken({
      userId: String(user._id),
      schoolId: String(school._id),
      role: user.role,
      email: user.email,
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      school: {
        id: school._id,
        name: school.name,
        code: school.code,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Server error during registration.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials or inactive account.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const school = await School.findById(user.schoolId);
    if (!school) {
      res.status(404).json({ error: 'Associated school not found.' });
      return;
    }

    const token = generateAuthToken({
      userId: String(user._id),
      schoolId: String(school._id),
      role: user.role,
      email: user.email,
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      school: {
        id: school._id,
        name: school.name,
        code: school.code,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Server error during login.' });
  }
}
