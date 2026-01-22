import { Router } from 'express';
import multer from 'multer';

import {
  adminRegister,
  adminLogin,
  studentRegister,
  studentLogin,
  deleteUser,
  getAllUsersController,
  handleToggleUserStatus,
  refresh,
  logout,
} from '../controllers/authController.js';

import { validate } from '../middleware/validate.js';
import {
  adminLoginSchema,
  studentLoginSchema,
  adminRegisterSchema,
  studentRegisterSchema
} from '../validators/authValidator.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const router = Router();

router.post('/register', registerLimiter, upload.single('logo'), validate(adminRegisterSchema), adminRegister);

router.post('/login', loginLimiter, validate(adminLoginSchema), adminLogin);

router.delete('/delete-user', deleteUser);

router.get('/get-users', getAllUsersController);
router.post('/deactivate-user', handleToggleUserStatus);
router.post('/register/student', registerLimiter, validate(studentRegisterSchema), studentRegister);

router.post('/login/student', loginLimiter, validate(studentLoginSchema), studentLogin);

router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;