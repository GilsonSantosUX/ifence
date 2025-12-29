import prisma from '../prisma';
import { Prisma } from '@prisma/client';

export class GeofenceRepository {
  
  private parseGeofence(fence: any) {
    return fence;
  }

  async findAll() {
    const fences = await prisma.geofence.findMany({
      include: {
        perimeters: true,
        rules: true,
        pins: true,
        company: true,
        department: true
      }
    });
    return fences;
  }

  async findById(id: number) {
    const fence = await prisma.geofence.findUnique({
      where: { id },
      include: {
        perimeters: true,
        rules: true,
        pins: true,
        company: true,
        department: true
      }
    });
    return fence;
  }

  async create(data: any) {
    const { perimeters, rules, pins, ...fenceData } = data;
    
    // Prepare nested writes
    const createData: Prisma.GeofenceCreateInput = {
      ...fenceData,
      perimeters: {
        create: perimeters
      },
      rules: {
        create: rules
      },
      pins: {
        create: pins
      }
    };

    const fence = await prisma.geofence.create({
      data: createData,
      include: { perimeters: true, rules: true, pins: true }
    });
    return fence;
  }

  async update(id: number, data: any) {
    const { perimeters, rules, pins, ...fenceData } = data;
    
    // For simplicity in this demo, we update scalar fields. 
    // Managing nested updates (delete/create/update) is complex in REST/Prisma without explicit IDs.
    // We will assume perimeters/rules are managed via specific sub-endpoints or full replacement if provided.
    
    // If perimeters are provided, we might want to replace them? 
    // Or just update the geofence properties.
    // Let's stick to updating geofence props and specific perimeter endpoints for now, 
    // unless the frontend sends the whole tree.
    
    const fence = await prisma.geofence.update({
      where: { id },
      data: fenceData,
      include: { perimeters: true, rules: true, pins: true }
    });
    return this.parseGeofence(fence);
  }

  async delete(id: number) {
    return prisma.geofence.delete({ where: { id } });
  }

  // Perimeter specific methods
  async addPerimeter(fenceId: number, data: any) {
    const perimeter = await prisma.perimeter.create({
      data: {
        ...data,
        fenceId,
        coordinates: JSON.stringify(data.coordinates),
        center: data.center ? JSON.stringify(data.center) : undefined
      }
    });
    return {
        ...perimeter,
        coordinates: perimeter.coordinates ? JSON.parse(perimeter.coordinates) : undefined,
        center: perimeter.center ? JSON.parse(perimeter.center) : undefined
    };
  }

  async updatePerimeter(id: number, data: any) {
    const { id: _, fenceId: __, ...updateData } = data;
    if (updateData.coordinates) updateData.coordinates = JSON.stringify(updateData.coordinates);
    if (updateData.center) updateData.center = JSON.stringify(updateData.center);

    const perimeter = await prisma.perimeter.update({
      where: { id },
      data: updateData
    });
     return {
        ...perimeter,
        coordinates: perimeter.coordinates ? JSON.parse(perimeter.coordinates) : undefined,
        center: perimeter.center ? JSON.parse(perimeter.center) : undefined
    };
  }
}
