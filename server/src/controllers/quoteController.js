import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getAll = async (req, res) => {
  try {
    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { lines, ...data } = req.body;
    const quote = await prisma.quote.create({
      data: {
        ...data,
        lines: {
          create: (lines || []).map(({ id, ...l }) => l)
        }
      },
      include: {
        lines: true
      }
    });
    res.status(201).json(quote);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  const { id } = req.params;
  try {
    const { lines, createdAt, updatedAt, ...data } = req.body;
    
    const quote = await prisma.$transaction(async (tx) => {
      // 1. Delete old lines
      await tx.quoteLine.deleteMany({ where: { quoteId: id } });
      
      // 2. Update main fields and recreate lines
      return tx.quote.update({
        where: { id },
        data: {
          ...data,
          lines: {
            create: (lines || []).map(({ id, ...l }) => l)
          }
        },
        include: {
          lines: true
        }
      });
    });
    
    res.json(quote);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await prisma.quote.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
