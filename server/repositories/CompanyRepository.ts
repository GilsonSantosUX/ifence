import prisma from '../prisma';

export class CompanyRepository {
  async findAll() {
    return prisma.company.findMany({
      include: { branches: true }
    });
  }

  async findById(id: number) {
    return prisma.company.findUnique({
      where: { id },
      include: { branches: true }
    });
  }

  async create(data: any) {
    return prisma.company.create({ data });
  }

  async update(id: number, data: any) {
    return prisma.company.update({
      where: { id },
      data
    });
  }

  async delete(id: number) {
    return prisma.company.delete({ where: { id } });
  }
}
