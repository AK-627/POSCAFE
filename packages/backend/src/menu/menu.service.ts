import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItemEntity } from './menu.entity';
import { MenuCategoryEntity } from './menu-category.entity';
import { CreateMenuItemDto, UpdateMenuItemDto, CreateMenuCategoryDto, UpdateMenuCategoryDto } from './menu.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItemEntity)
    private readonly menuItemRepository: Repository<MenuItemEntity>,
    @InjectRepository(MenuCategoryEntity)
    private readonly categoryRepository: Repository<MenuCategoryEntity>,
  ) {}

  async listItems(tenantId: string, categoryId?: string): Promise<MenuItemEntity[]> {
    const where: any = { tenantId };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    return this.menuItemRepository.find({ where });
  }

  async createMenuItem(tenantId: string, createDto: CreateMenuItemDto): Promise<MenuItemEntity> {
    const entity = this.menuItemRepository.create({
      tenantId,
      name: createDto.name,
      description: createDto.description,
      price: createDto.price,
      categoryId: createDto.categoryId,
      preparationTime: createDto.preparationTime,
      tags: createDto.tags ?? [],
      isAvailable: true,
      displayOrder: 0,
    });

    return this.menuItemRepository.save(entity);
  }

  async updateMenuItem(tenantId: string, itemId: string, updateDto: UpdateMenuItemDto): Promise<MenuItemEntity> {
    const item = await this.menuItemRepository.findOne({ where: { id: itemId, tenantId } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    Object.assign(item, updateDto);
    return this.menuItemRepository.save(item);
  }

  async updateAvailability(tenantId: string, itemId: string, isAvailable: boolean): Promise<MenuItemEntity> {
    const item = await this.menuItemRepository.findOne({ where: { id: itemId, tenantId } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    item.isAvailable = isAvailable;
    return this.menuItemRepository.save(item);
  }

  async createCategory(tenantId: string, dto: CreateMenuCategoryDto): Promise<MenuCategoryEntity> {
    const category = this.categoryRepository.create({
      id: uuidv4(),
      tenantId,
      name: dto.name,
      description: dto.description,
      displayOrder: dto.displayOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.categoryRepository.save(category);
  }

  async listCategories(tenantId: string): Promise<MenuCategoryEntity[]> {
    return this.categoryRepository.find({
      where: { tenantId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async updateCategory(tenantId: string, categoryId: string, dto: UpdateMenuCategoryDto): Promise<MenuCategoryEntity> {
    const category = await this.categoryRepository.findOne({ where: { id: categoryId, tenantId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  async removeCategory(tenantId: string, categoryId: string): Promise<{ deleted: boolean }> {
    const category = await this.categoryRepository.findOne({ where: { id: categoryId, tenantId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.categoryRepository.remove(category);
    return { deleted: true };
  }

  async getItem(tenantId: string, itemId: string): Promise<MenuItemEntity> {
    const item = await this.menuItemRepository.findOne({ where: { id: itemId, tenantId } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    return item;
  }
}
