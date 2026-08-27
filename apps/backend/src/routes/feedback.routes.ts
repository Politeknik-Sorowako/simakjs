import { Elysia } from 'elysia';
import { FeedbackController } from '../controllers/feedback.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  addCommentBody,
  createFeedbackBody,
  getAllFeedbackQuery,
  updateFeedbackBody,
  updateFeedbackStatusBody,
} from '../schemas/feedback.schema';

export const feedbackRoutes = new Elysia({ prefix: '/feedback' })
  .use(authMiddleware)
  .post('/', FeedbackController.create, { body: createFeedbackBody })
  .get('/', FeedbackController.getAll, { query: getAllFeedbackQuery })
  .get('/:id', FeedbackController.getById)
  .put('/:id', FeedbackController.update, { body: updateFeedbackBody })
  .delete('/:id', FeedbackController.remove)
  .get('/:id/comments', FeedbackController.getComments)
  .post('/:id/comments', FeedbackController.addComment, { body: addCommentBody })
  .post('/:id/like', FeedbackController.toggleLike)
  .put('/:id/status', FeedbackController.updateStatus, { body: updateFeedbackStatusBody });
