import prisma from '../services/prisma.js';

export const getAll = async (req, res) => {
  try {
    const transactions = await prisma.bankTransaction.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const transaction = await prisma.bankTransaction.create({
      data: req.body
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.bankTransaction.delete({ 
      where: { id: parseInt(id, 10) } 
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
