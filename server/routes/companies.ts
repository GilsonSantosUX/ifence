import { Router } from 'express';
import { CompanyRepository } from '../repositories/CompanyRepository';

const router = Router();
const repo = new CompanyRepository();

router.get('/', async (req, res) => {
  const companies = await repo.findAll();
  res.json(companies);
});

router.get('/:id', async (req, res) => {
  const company = await repo.findById(Number(req.params.id));
  if (company) res.json(company);
  else res.status(404).send();
});

router.post('/', async (req, res) => {
  const company = await repo.create(req.body);
  res.status(201).json(company);
});

export const companyRouter = router;
