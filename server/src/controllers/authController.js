import prisma from '../services/prisma.js';

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Basic check for demo
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tool to seed a default user
export const seedUser = async (req, res) => {
    try {
        const user = await prisma.user.upsert({
            where: { email: 'lotfybelhiba@gmail.com' },
            update: {},
            create: {
                email: 'lotfybelhiba@gmail.com',
                password: 'admin',
                name: 'Lotfi Belhiba',
                role: 'Admin'
            }
        });
        res.json({ message: 'User seeded', user });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
