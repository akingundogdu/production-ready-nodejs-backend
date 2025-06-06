import { QueryRunner } from 'typeorm';
import { CreateUsersTable1710000000000 } from './1710000000000-CreateUsersTable';

describe('CreateUsersTable1710000000000 Migration', () => {
  let migration: CreateUsersTable1710000000000;
  let mockQueryRunner: jest.Mocked<QueryRunner>;

  beforeEach(() => {
    migration = new CreateUsersTable1710000000000();
    
    mockQueryRunner = {
      query: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Migration Properties', () => {
    it('should have correct migration name', () => {
      expect(migration.name).toBe('CreateUsersTable1710000000000');
    });

    it('should implement MigrationInterface', () => {
      expect(migration).toHaveProperty('up');
      expect(migration).toHaveProperty('down');
      expect(migration).toHaveProperty('name');
      expect(typeof migration.up).toBe('function');
      expect(typeof migration.down).toBe('function');
    });
  });

  describe('up() method', () => {
    it('should create users table with correct schema', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.up(mockQueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalledTimes(2);
      
      // Check first query - CREATE TABLE
      const createTableQuery = mockQueryRunner.query.mock.calls[0][0];
      expect(createTableQuery).toContain('CREATE TABLE "users"');
      expect(createTableQuery).toContain('"id" uuid NOT NULL DEFAULT uuid_generate_v4()');
      expect(createTableQuery).toContain('"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()');
      expect(createTableQuery).toContain('"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()');
      expect(createTableQuery).toContain('"deleted_at" TIMESTAMP WITH TIME ZONE');
      expect(createTableQuery).toContain('"first_name" character varying NOT NULL');
      expect(createTableQuery).toContain('"last_name" character varying NOT NULL');
      expect(createTableQuery).toContain('"email" character varying NOT NULL');
      expect(createTableQuery).toContain('"password" character varying NOT NULL');
      expect(createTableQuery).toContain('"is_email_verified" boolean NOT NULL DEFAULT false');
      expect(createTableQuery).toContain('"refresh_token" character varying');
      expect(createTableQuery).toContain('"last_login_at" TIMESTAMP WITH TIME ZONE');
    });

    it('should create unique constraint on email', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.up(mockQueryRunner);

      const createTableQuery = mockQueryRunner.query.mock.calls[0][0];
      expect(createTableQuery).toContain('CONSTRAINT "UQ_users_email" UNIQUE ("email")');
    });

    it('should create primary key constraint', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.up(mockQueryRunner);

      const createTableQuery = mockQueryRunner.query.mock.calls[0][0];
      expect(createTableQuery).toContain('CONSTRAINT "PK_users" PRIMARY KEY ("id")');
    });

    it('should create index on email column', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.up(mockQueryRunner);

      // Check second query - CREATE INDEX
      const createIndexQuery = mockQueryRunner.query.mock.calls[1][0];
      expect(createIndexQuery).toContain('CREATE INDEX "IDX_users_email" ON "users" ("email")');
    });

    it('should handle query runner errors', async () => {
      const queryError = new Error('Database connection failed');
      mockQueryRunner.query.mockRejectedValue(queryError);

      await expect(migration.up(mockQueryRunner)).rejects.toThrow(queryError);
      expect(mockQueryRunner.query).toHaveBeenCalledTimes(1);
    });

    it('should execute queries in correct order', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.up(mockQueryRunner);

      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('CREATE TABLE "users"')
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('CREATE INDEX "IDX_users_email"')
      );
    });
  });

  describe('down() method', () => {
    it('should drop users table and index', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.down(mockQueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalledTimes(2);
      
      // Check first query - DROP INDEX
      const dropIndexQuery = mockQueryRunner.query.mock.calls[0][0];
      expect(dropIndexQuery).toContain('DROP INDEX "IDX_users_email"');
      
      // Check second query - DROP TABLE
      const dropTableQuery = mockQueryRunner.query.mock.calls[1][0];
      expect(dropTableQuery).toContain('DROP TABLE "users"');
    });

    it('should execute drop operations in reverse order', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.down(mockQueryRunner);

      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('DROP INDEX "IDX_users_email"')
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('DROP TABLE "users"')
      );
    });

    it('should handle query runner errors during rollback', async () => {
      const queryError = new Error('Failed to drop index');
      mockQueryRunner.query.mockRejectedValue(queryError);

      await expect(migration.down(mockQueryRunner)).rejects.toThrow(queryError);
      expect(mockQueryRunner.query).toHaveBeenCalledTimes(1);
    });

    it('should drop index before dropping table', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.down(mockQueryRunner);

      const calls = mockQueryRunner.query.mock.calls;
      expect(calls[0][0]).toContain('DROP INDEX');
      expect(calls[1][0]).toContain('DROP TABLE');
    });
  });

  describe('SQL Query Validation', () => {
    it('should use correct table name in all queries', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.up(mockQueryRunner);
      await migration.down(mockQueryRunner);

      const allQueries = mockQueryRunner.query.mock.calls.map(call => call[0]);
      
      // All queries should reference "users" table
      allQueries.forEach(query => {
        expect(query).toContain('users');
      });
    });

    it('should use proper PostgreSQL syntax', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.up(mockQueryRunner);

      const createTableQuery = mockQueryRunner.query.mock.calls[0][0];
      
      // Check PostgreSQL specific syntax
      expect(createTableQuery).toContain('uuid_generate_v4()');
      expect(createTableQuery).toContain('TIMESTAMP WITH TIME ZONE');
      expect(createTableQuery).toContain('character varying');
      expect(createTableQuery).toContain('boolean');
    });

    it('should include all required user fields', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.up(mockQueryRunner);

      const createTableQuery = mockQueryRunner.query.mock.calls[0][0];
      
      const requiredFields = [
        'id',
        'created_at',
        'updated_at',
        'deleted_at',
        'first_name',
        'last_name',
        'email',
        'password',
        'is_email_verified',
        'refresh_token',
        'last_login_at'
      ];

      requiredFields.forEach(field => {
        expect(createTableQuery).toContain(`"${field}"`);
      });
    });

    it('should set correct default values', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);

      await migration.up(mockQueryRunner);

      const createTableQuery = mockQueryRunner.query.mock.calls[0][0];
      
      expect(createTableQuery).toContain('DEFAULT uuid_generate_v4()');
      expect(createTableQuery).toContain('DEFAULT now()');
      expect(createTableQuery).toContain('DEFAULT false');
    });
  });

  describe('Migration Class Instantiation', () => {
    it('should create instance with correct properties', () => {
      const newMigration = new CreateUsersTable1710000000000();
      
      expect(newMigration).toBeInstanceOf(CreateUsersTable1710000000000);
      expect(newMigration.name).toBe('CreateUsersTable1710000000000');
      expect(typeof newMigration.up).toBe('function');
      expect(typeof newMigration.down).toBe('function');
    });

    it('should be callable as a function', () => {
      expect(() => new CreateUsersTable1710000000000()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from up() method', async () => {
      const customError = new Error('Custom migration error');
      mockQueryRunner.query.mockRejectedValueOnce(customError);

      await expect(migration.up(mockQueryRunner)).rejects.toThrow('Custom migration error');
    });

    it('should propagate errors from down() method', async () => {
      const customError = new Error('Custom rollback error');
      mockQueryRunner.query.mockRejectedValueOnce(customError);

      await expect(migration.down(mockQueryRunner)).rejects.toThrow('Custom rollback error');
    });

    it('should handle partial execution failures in up()', async () => {
      mockQueryRunner.query
        .mockResolvedValueOnce(undefined) // First query succeeds
        .mockRejectedValueOnce(new Error('Index creation failed')); // Second query fails

      await expect(migration.up(mockQueryRunner)).rejects.toThrow('Index creation failed');
      expect(mockQueryRunner.query).toHaveBeenCalledTimes(2);
    });

    it('should handle partial execution failures in down()', async () => {
      mockQueryRunner.query
        .mockResolvedValueOnce(undefined) // First query succeeds
        .mockRejectedValueOnce(new Error('Table drop failed')); // Second query fails

      await expect(migration.down(mockQueryRunner)).rejects.toThrow('Table drop failed');
      expect(mockQueryRunner.query).toHaveBeenCalledTimes(2);
    });
  });
}); 