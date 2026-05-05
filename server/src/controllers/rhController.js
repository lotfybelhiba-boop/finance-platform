import prisma from '../services/prisma.js';

export const getAll = async (req, res) => {
  try {
    const states = await prisma.rHState.findMany();
    res.json(states);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
