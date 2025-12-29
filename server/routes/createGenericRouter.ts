import { Router } from 'express';
import { GenericRepository } from '../repositories/GenericRepository';

interface GenericRouterOptions {
  fieldOverrides?: Record<string, string>;
  idType?: 'int' | 'string';
}

export function createGenericRouter(model: any, options: GenericRouterOptions = {}) {
  const router = Router();
  const { fieldOverrides = {}, idType = 'int' } = options;
  const repo = new GenericRepository(model, idType);

  router.get('/', async (req, res) => {
    try {
      // Check for query params to filter (e.g. ?companyId=1)
      const filters = Object.keys(req.query).reduce((acc, key) => {
        if (fieldOverrides[key]) {
            // Handle specific field logic if needed, or just pass through
             acc[key] = Number(req.query[key]) || req.query[key];
        } else {
             // Try to convert to number if possible
             const val = req.query[key];
             acc[key] = !isNaN(Number(val)) ? Number(val) : val;
        }
        return acc;
      }, {} as any);

      if (Object.keys(filters).length > 0) {
        // Simple filter support
        const results = await model.findMany({ where: filters });
        res.json(results);
      } else {
        const items = await repo.findAll();
        res.json(items);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const item = await repo.findById(req.params.id);
      if (item) res.json(item);
      else res.status(404).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const item = await repo.create(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const item = await repo.update(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await repo.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  return router;
}
