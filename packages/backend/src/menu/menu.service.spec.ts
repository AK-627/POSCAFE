import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MenuService } from './menu.service';
import { MenuItemEntity } from './menu.entity';
import { MenuCategoryEntity } from './menu-category.entity';

describe('MenuService', () => {
  let service: MenuService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let categoryRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    categoryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = (await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: getRepositoryToken(MenuItemEntity),
          useValue: repository,
        },
        {
          provide: getRepositoryToken(MenuCategoryEntity),
          useValue: categoryRepository,
        },
      ],
    }).compile()) as any;

    service = moduleRef.get(MenuService) as MenuService;
  });

  it('creates a menu item scoped to the tenant and defaults it to available', async () => {
    const input = {
      name: 'Cafe Latte',
      description: 'Espresso and milk',
      price: 4.5,
      categoryId: 'cat-1',
    };

    const entity = {
      id: 'item-1',
      tenantId: 'tenant-1',
      ...input,
      isAvailable: true,
      displayOrder: 0,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.create.mockReturnValue(entity);
    repository.save.mockResolvedValue(entity);

    const result = await service.createMenuItem('tenant-1', input);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        isAvailable: true,
      }),
    );
    expect(result.isAvailable).toBe(true);
  });

  it('updates availability for an existing tenant-scoped item', async () => {
    const entity = {
      id: 'item-2',
      tenantId: 'tenant-1',
      name: 'Croissant',
      price: 2.8,
      isAvailable: true,
      displayOrder: 1,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.findOne.mockResolvedValue(entity);
    repository.save.mockResolvedValue({ ...entity, isAvailable: false });

    const result = await service.updateAvailability('tenant-1', 'item-2', false);

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'item-2', tenantId: 'tenant-1' } });
    expect(result.isAvailable).toBe(false);
  });

  it('creates a menu category for a tenant', async () => {
    const categoryDto = {
      name: 'Drinks',
      description: 'Beverages and cold drinks',
      displayOrder: 1,
      isActive: true,
    };

    const category = {
      id: 'cat-1',
      tenantId: 'tenant-1',
      ...categoryDto,
      createdAt: new Date(),
    };

    categoryRepository.create.mockReturnValue(category);
    categoryRepository.save.mockResolvedValue(category);

    const result = await service.createCategory('tenant-1', categoryDto);

    expect(categoryRepository.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1', name: 'Drinks' }));
    expect(result).toEqual(category);
  });
});
