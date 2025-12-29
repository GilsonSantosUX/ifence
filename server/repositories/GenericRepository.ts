import prisma from '../prisma';

export class GenericRepository<T> {
  private idType: 'int' | 'string';

  constructor(private model: any, idType: 'int' | 'string' = 'int') {
    this.idType = idType;
  }

  async findAll() {
    return this.model.findMany();
  }

  async findById(id: number | string) {
    const where = this.getWhere(id);
    return this.model.findUnique({ where });
  }

  async create(data: any) {
    return this.model.create({ data });
  }

  async update(id: number | string, data: any) {
    const where = this.getWhere(id);
    // Remove id from data to avoid primary key update errors
    const { id: _, ...updateData } = data;
    return this.model.update({
      where,
      data: updateData
    });
  }

  async delete(id: number | string) {
    const where = this.getWhere(id);
    return this.model.delete({ where });
  }

  async findByField(field: string, value: any) {
    return this.model.findMany({
      where: { [field]: value }
    });
  }

  private getWhere(id: number | string) {
    if (this.idType === 'int') {
      return { id: Number(id) };
    }
    return { id: String(id) };
  }
}
