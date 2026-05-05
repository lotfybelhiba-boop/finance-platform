import express from 'express';
import * as clientController from '../controllers/clientController.js';
import * as invoiceController from '../controllers/invoiceController.js';
import * as bankController from '../controllers/bankController.js';
import * as rhController from '../controllers/rhController.js';
import * as auditController from '../controllers/auditController.js';
import * as authController from '../controllers/authController.js';
import * as migrationController from '../controllers/migrationController.js';

const router = express.Router();

// Auth
router.post('/auth/login', authController.login);
router.post('/auth/seed', authController.seedUser);

// Clients
router.get('/clients', clientController.getAll);
router.post('/clients', clientController.create);
router.put('/clients/:id', clientController.update);
router.delete('/clients/:id', clientController.remove);

// Invoices
router.get('/invoices', invoiceController.getAll);
router.post('/invoices', invoiceController.create);
router.put('/invoices/:id', invoiceController.update);
router.delete('/invoices/:id', invoiceController.remove);

// Bank Transactions
router.get('/bank/transactions', bankController.getAll);
router.post('/bank/transactions', bankController.create);
router.delete('/bank/transactions/:id', bankController.remove);

// RH States
router.get('/rh-states', rhController.getAll);

// Audit History
router.get('/audit-history', auditController.getAll);

// Migration
router.post('/migration/import', migrationController.importData);

export default router;
