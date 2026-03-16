import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Tool from '@/models/Tool';
import Report from '@/models/Report';
import { auth } from '@/auth';

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  
  try {
    const totalTools = await Tool.countDocuments();
    const totalReports = await Report.countDocuments();
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const reportsToday = await Report.countDocuments({ createdAt: { $gte: startOfDay } });
    
    const reportsGood = await Report.countDocuments({ condition: 'Good' });
    const reportsBad = await Report.countDocuments({ condition: 'Bad' });
    
    // Monthly reports (last 6 months)
    const monthlyReports = await Report.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]);
    
    // Reports by Technician
    const technicianReports = await Report.aggregate([
      {
        $group: {
          _id: "$technicianName",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Reports by Category (This requires joining with Tool, or Tool having category)
    // Since Report has toolId, we can lookup Tool
    const categoryReports = await Report.aggregate([
      {
        $lookup: {
          from: "tools",
          localField: "toolId",
          foreignField: "_id",
          as: "tool"
        }
      },
      { $unwind: "$tool" },
      {
        $group: {
          _id: "$tool.category",
          count: { $sum: 1 }
        }
      }
    ]);

    return NextResponse.json({
      totalTools,
      totalReports,
      reportsToday,
      reportsGood,
      reportsBad,
      monthlyReports,
      technicianReports,
      categoryReports
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
