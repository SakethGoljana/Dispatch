import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createCampaign,
  dispatchCampaignHandler,
  getCampaignById,
  listCampaigns,
  updateRecipientOutcome,
} from '../controllers/campaignController';

const router = Router();

// All campaign routes require authentication
router.use(authenticate);

router.get('/', listCampaigns);
router.post('/', createCampaign);
router.get('/:id', getCampaignById);
router.post('/:id/dispatch', dispatchCampaignHandler);
router.patch('/:id/recipients/:studentId', updateRecipientOutcome);

export default router;
