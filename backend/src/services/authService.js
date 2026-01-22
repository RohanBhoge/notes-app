import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getConfig } from '../config/envConfig.js';
import {
    createUser,
    getUserByEmail,
    createStudent,
    getAdminByUserName,
    getStudentByEmail,
    deleteUserByEmail,
    getAllUsers,
    toggleUserActivationStatus,
} from '../utils/helperFunctions.js';

const config = getConfig();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

const s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
    },
});

async function uploadLogoToS3(file) {
    if (!file) return null;

    const fileKey = `logos/${Date.now()}_${file.originalname}`;
    const params = {
        Bucket: config.aws.s3BucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        return fileKey;
    } catch (error) {
        return null;
    }
}

function generateTokens(userId, role, adminId = null) {
    const payload = { sub: userId, role };
    if (adminId) {
        payload.adminId = adminId;
    }

    const accessToken = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
    });

    return { accessToken, refreshToken };
}

function generateLogoUrl(logoKey) {
    const defaultLogo = "https://papernest-logo.s3.ap-south-1.amazonaws.com/logos/1768298506778_WhatsApp+Image+2024-06-30+at+14.41.38_7e2ce26b.jpg";

    if (!logoKey) return defaultLogo;

    return `https://${config.aws.s3BucketName}.s3.${config.aws.region}.amazonaws.com/${logoKey}`;
}

function calculateRemainingDays(endDate) {
    if (!endDate) return null;

    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export async function registerAdmin(email, password, fullName, watermark, file) {
    if (!email || !password) {
        throw new Error('Email and password required');
    }

    const existing = await getUserByEmail(email);
    if (existing) {
        throw new Error('Email already registered');
    }

    const logoKey = await uploadLogoToS3(file);

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = await createUser(email, hash, fullName || null, watermark, logoKey);
    const { accessToken, refreshToken } = generateTokens(userId, 'admin');

    return {
        userId,
        email,
        fullName,
        logoKey,
        watermark,
        accessToken,
        refreshToken,
    };
}

export async function registerStudent(email, password, organizationName, fullName, std, classVal) {
    if (!email || !password || !organizationName) {
        throw new Error('Email, password, and organization name are required');
    }
    const admin = await getAdminByUserName(organizationName);
    if (!admin) {
        throw new Error('Organization name (Admin username) not found');
    }
    const adminUserId = admin.id;

    const existingAdmin = await getUserByEmail(email);
    if (existingAdmin) {
        throw new Error('Email already registered as an administrator');
    }

    const existingStudent = await getStudentByEmail(email);
    if (existingStudent) {
        throw new Error('Email already registered as a student');
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const studentId = await createStudent(
        adminUserId,
        email.split('@')[0],
        email,
        hash,
        fullName || null,
        std || null,
        classVal || null
    );

    const { accessToken, refreshToken } = generateTokens(studentId, 'student', adminUserId);

    return {
        studentId,
        email,
        fullName,
        adminUserId,
        accessToken,
        refreshToken,
    };
}

export async function loginStudent(email, password) {
    if (!email || !password) {
        throw new Error('Email and password required');
    }
    const user = await getStudentByEmail(email);
    if (!user) {
        throw new Error('User not found as student');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        throw new Error('Invalid password');
    }
    const { accessToken, refreshToken } = generateTokens(user.id, 'student', user.user_id);

    return {
        user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: 'student',
            adminId: user.user_id,
        },
        accessToken,
        refreshToken,
    };
}

export async function loginAdmin(email, password) {
    if (!email || !password) {
        throw new Error('Email and password required');
    }

    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error('User not found as admin');
    }

    if (user.is_active === 0 || user.is_active === false) {
        throw new Error('Your account is currently deactivated');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        throw new Error('Invalid password');
    }

    const logoUrl = generateLogoUrl(user.logo);
    const remainingDays = calculateRemainingDays(user.subscription_end_date);

    const { accessToken, refreshToken } = generateTokens(user.id, 'admin');

    return {
        user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: 'admin',
            logoUrl,
            watermark: user.watermark,
            subscriptionEndDate: user.subscription_end_date,
            remainingDays,
        },
        accessToken,
        refreshToken,
    };
}

export async function removeUser(email) {
    if (!email) {
        throw new Error('Email is required to delete user');
    }

    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error('User not found');
    }

    const deleted = await deleteUserByEmail(email);
    if (deleted === 0) {
        throw new Error('Failed to delete user');
    }

    return { email };
}

export async function listAllUsers() {
    const users = await getAllUsers();
    return users;
}
export async function toggleUserStatus(userId) {
    if (!userId) {
        throw new Error('Missing user ID');
    }

    const result = await toggleUserActivationStatus(userId);

    if (result.affectedRows > 0) {
        return {
            userId,
            newStatus: result.newStatus,
            message: `User status successfully changed to ${result.newStatus}`,
        };
    } else {
        throw new Error('User not found');
    }
}

export async function refreshAccessToken(refreshToken) {
    if (!refreshToken) {
        throw new Error('No refresh token provided');
    }

    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret);

    const newAccessToken = jwt.sign(
        { sub: payload.sub, role: payload.role, adminId: payload.adminId },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    return { accessToken: newAccessToken };
}