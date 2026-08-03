import { Elysia } from 'elysia';
import { FeedbackController } from '../controllers/feedback.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createFeedbackBody, updateFeedbackStatusBody } from '../schemas/feedback.schema';

export const feedbackRoutes = new Elysia({ prefix: '/feedback' })
  .use(authMiddleware)
  .post('/', FeedbackController.create, { body: createFeedbackBody })
  .get('/', FeedbackController.getAll)
  .put('/:id/status', FeedbackController.updateStatus, { body: updateFeedbackStatusBody });
