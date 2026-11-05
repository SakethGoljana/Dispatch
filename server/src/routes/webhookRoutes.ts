import { Router } from 'express';
import { handleWebhookEvent, verifyWebhookChallenge } from '../controllers/webhookController';

const router = Router();

router.get('/whatsapp', verifyWebhookChallenge);
router.post('/whatsapp', handleWebhookEvent);

export default router;
