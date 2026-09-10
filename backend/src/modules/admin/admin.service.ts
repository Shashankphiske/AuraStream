import { UserModel } from '../users/user.model.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { getDatabase } from '../../database/connection.js';

export class AdminService {
  static async getOverview() {
    return AnalyticsService.getPlatformAnalytics();
  }

  static async getUsers(limit: number = 50, offset: number = 0) {
    return UserModel.findAll(limit, offset);
  }

  static async deleteUser(userId: string): Promise<boolean> {
    const db = getDatabase();
    const res = await db.execute('DELETE FROM users WHERE id = ?', [userId]);
    return res.changes > 0;
  }
}
