import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { Prisma } from '@prisma/client';

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  drugLicense?: string;
  creditLimit?: number;
  creditDays?: number;
  openingBalance?: number;
}

export interface CreateCustomerDto {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dateOfBirth?: string;
  gender?: string;
  medicalHistory?: string;
  allergies?: string;
  doctorName?: string;
  creditLimit?: number;
}

export class SupplierService {
  static async findAll(options: { page: number; limit: number; search?: string }) {
    const where: Prisma.SupplierWhereInput = { isActive: true };
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search } },
        { contactPerson: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.supplier.count({ where }),
    ]);
    return { suppliers, total };
  }

  static async findById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchases: true, medicines: true } } },
    });
    if (!supplier) throw new AppError('Supplier not found', 404);
    return supplier;
  }

  static async create(dto: CreateSupplierDto) {
    return prisma.supplier.create({ data: { ...dto } });
  }

  static async update(id: string, dto: Partial<CreateSupplierDto>) {
    await this.findById(id);
    return prisma.supplier.update({ where: { id }, data: { ...dto } });
  }

  static async delete(id: string) {
    await this.findById(id);
    return prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }
}

export class CustomerService {
  static async findAll(options: { page: number; limit: number; search?: string }) {
    const where: Prisma.CustomerWhereInput = { isActive: true };
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.customer.count({ where }),
    ]);
    return { customers, total };
  }

  static async findById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { invoiceDate: 'desc' },
          take: 10,
          select: { id: true, invoiceNumber: true, totalAmount: true, status: true, invoiceDate: true },
        },
      },
    });
    if (!customer) throw new AppError('Customer not found', 404);
    return customer;
  }

  static async create(dto: CreateCustomerDto) {
    return prisma.customer.create({
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  static async update(id: string, dto: Partial<CreateCustomerDto>) {
    await this.findById(id);
    return prisma.customer.update({
      where: { id },
      data: { ...dto, dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined },
    });
  }

  static async delete(id: string) {
    await this.findById(id);
    return prisma.customer.update({ where: { id }, data: { isActive: false } });
  }

  static async getByPhone(phone: string) {
    return prisma.customer.findFirst({ where: { phone, isActive: true } });
  }
}
