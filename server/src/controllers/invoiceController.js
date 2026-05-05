import prisma from '../services/prisma.js';

export const getAll = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        lines: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { lines, client, ...data } = req.body;
    const invoice = await prisma.invoice.create({
      data: {
        ...data,
        clientName: data.clientName || client || 'Inconnu',
        lines: {
          create: lines || []
        }
      },
      include: {
        lines: true,
      }
    });
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  const { id } = req.params;
  try {
    const { lines, createdAt, updatedAt, ...data } = req.body;
    
    const invoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
      
      return tx.invoice.update({
        where: { id },
        data: {
          ...data,
          lines: {
            create: (lines || []).map(({ id, ...l }) => l)
          }
        },
        include: {
          lines: true,
        }
      });
    });
    
    res.json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.invoice.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
