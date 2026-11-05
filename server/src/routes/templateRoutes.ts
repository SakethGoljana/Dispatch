import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createTemplate, deleteTemplate, listTemplates } from '../controllers/templateController';

const router = Router();

// All template routes require authentication
router.use(authenticate);

router.get('/', listTemplates);
router.post('/', createTemplate);
router.delete('/:id', deleteTemplate);

export default router;
