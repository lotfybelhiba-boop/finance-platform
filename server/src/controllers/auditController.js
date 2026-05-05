import prisma from '../services/prisma.js';

export const getAll = async (req, res) => {
  try {
    const history = await prisma.auditHistory.findMany();
    // Convert array back to object for frontend compatibility
    const historyObj = history.reduce((acc, curr) => {
      acc[curr.key] = { status: curr.status, reason: curr.reason, date: curr.date };
      return acc;
    }, {});
    res.json(historyObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
