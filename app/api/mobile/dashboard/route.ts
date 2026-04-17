import dbConnect from '@/lib/mongodb';
import Report from '@/models/Report';
import Tool from '@/models/Tool';
import Loan from '@/models/Loan';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });

    await dbConnect();

    const [totalTools, borrowedTools, totalReports, goodReports, badReports, activeLoans] = await Promise.all([
      Tool.countDocuments({}),
      Tool.countDocuments({ isBorrowed: true }),
      Report.countDocuments({}),
      Report.countDocuments({ condition: 'Good' }),
      Report.countDocuments({ condition: 'Bad' }),
      Loan.countDocuments({ status: { $ne: 'Returned' } }),
    ]);

    return mobileJson(req, {
      summary: {
        tools: {
          total: totalTools,
          borrowed: borrowedTools,
          available: totalTools - borrowedTools,
        },
        reports: {
          total: totalReports,
          good: goodReports,
          bad: badReports,
        },
        loans: {
          active: activeLoans,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return mobileJson(req, { error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
