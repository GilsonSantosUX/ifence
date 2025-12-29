import { Router } from 'express';
import { GeofenceRepository } from '../repositories/GeofenceRepository';

const router = Router();
const repo = new GeofenceRepository();

router.get('/', async (req, res) => {
  try {
    const fences = await repo.findAll();
    res.json(fences);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch geofences' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const fence = await repo.findById(Number(req.params.id));
    if (!fence) return res.status(404).json({ error: 'Geofence not found' });
    res.json(fence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch geofence' });
  }
});

router.post('/', async (req, res) => {
  try {
    const fence = await repo.create(req.body);
    res.status(201).json(fence);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create geofence' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const fence = await repo.update(Number(req.params.id), req.body);
    res.json(fence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update geofence' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await repo.delete(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete geofence' });
  }
});

// Perimeter sub-routes
router.post('/:id/perimeters', async (req, res) => {
  try {
    const perimeter = await repo.addPerimeter(Number(req.params.id), req.body);
    res.status(201).json(perimeter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add perimeter' });
  }
});

router.put('/perimeters/:id', async (req, res) => {
  try {
    const perimeter = await repo.updatePerimeter(Number(req.params.id), req.body);
    res.json(perimeter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update perimeter' });
  }
});

export const geofenceRouter = router;
