import { Router } from 'express';
import { login, registerSchool } from '../controllers/authController';

const router = Router();

router.post('/register', registerSchool);
router.post('/login', login);

export default router;
