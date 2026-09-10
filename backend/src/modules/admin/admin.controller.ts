import { Request, Response } from 'express';
import { AdminService } from './admin.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants/index.js';

export class AdminController {
  static async getOverview(req: Request, res: Response): Promise<void> {
    const overview = await AdminService.getOverview();
    sendSuccess(res, overview, 'Admin overview data retrieved');
  }

  static async getUsers(req: Request, res: Response): Promise<void> {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const users = await AdminService.getUsers(limit, offset);
    sendSuccess(res, users, 'Users retrieved');
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (id === req.user?.userId) {
      sendError(res, 'Cannot delete your own admin account', HTTP_STATUS.BAD_REQUEST);
      return;
    }
    const success = await AdminService.deleteUser(id);
    if (!success) {
      sendError(res, 'User not found', HTTP_STATUS.NOT_FOUND);
      return;
    }
    sendSuccess(res, null, 'User deleted successfully');
  }
}
