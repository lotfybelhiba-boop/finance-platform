import prisma from '../services/prisma.js';

export const getAll = async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        servicesRecurrents: true,
        projectCosts: true,
      },
      orderBy: { enseigne: 'asc' }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { servicesRecurrents, projectCosts, ...data } = req.body;
    const client = await prisma.client.create({
      data: {
        ...data,
        servicesRecurrents: {
          create: servicesRecurrents || []
        },
        projectCosts: {
          create: projectCosts || []
        }
      },
      include: {
        servicesRecurrents: true,
        projectCosts: true,
      }
    });
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  const { id } = req.params;
  try {
    const { servicesRecurrents, projectCosts, createdAt, updatedAt, ...data } = req.body;
    
    // Complex update logic to handle relations
    const client = await prisma.$transaction(async (tx) => {
      // 1. Delete old relations
      await tx.serviceRecurrent.deleteMany({ where: { clientId: id } });
      await tx.projectCost.deleteMany({ where: { clientId: id } });
      
      // 2. Update main fields and recreate relations
      return tx.client.update({
        where: { id },
        data: {
          ...data,
          servicesRecurrents: {
            create: (servicesRecurrents || []).map(({ id, ...s }) => s)
          },
          projectCosts: {
            create: (projectCosts || []).map(({ id, ...p }) => p)
          }
        },
        include: {
          servicesRecurrents: true,
          projectCosts: true,
        }
      });
    });
    
    res.json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.client.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
