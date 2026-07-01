import axios from 'axios';
import { promises as dns } from 'dns';
import { AiConfigService } from './ai-config.service';

jest.mock('axios');
jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

describe('AiConfigService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockedLookup = dns.lookup as jest.Mock;

  const makePrisma = () => {
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      aIConfig: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      setting: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    return prisma;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
    mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });

  it('redacts api keys when returning a single config', async () => {
    const prisma = makePrisma();
    const service = new AiConfigService(prisma as any);
    prisma.aIConfig.create.mockImplementation(async (args) => ({
      id: 'cfg-1',
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await service.create('admin-id', {
      provider: 'openai',
      providerName: 'OpenAI',
      model: 'gpt-4o-mini',
      modelName: 'GPT-4o mini',
      apiKey: 'sk-secret',
      baseUrl: 'https://api.openai.com/v1',
      isActive: true,
    });

    const encryptedApiKey = prisma.aIConfig.create.mock.calls[0][0].data.apiKey;
    prisma.aIConfig.findFirst.mockResolvedValue({
      id: 'cfg-1',
      userId: 'admin-id',
      provider: 'openai',
      providerName: 'OpenAI',
      model: 'gpt-4o-mini',
      modelName: 'GPT-4o mini',
      apiKey: encryptedApiKey,
      baseUrl: 'https://api.openai.com/v1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.findOne('cfg-1');

    expect(result).not.toHaveProperty('apiKey');
    expect(result).toMatchObject({ id: 'cfg-1', hasApiKey: true });
  });

  it('marks legacy plaintext keys as needing replacement instead of valid api keys', async () => {
    const prisma = makePrisma();
    const service = new AiConfigService(prisma as any);
    prisma.aIConfig.findFirst.mockResolvedValue({
      id: 'cfg-1',
      apiKey: 'sk-plaintext',
      baseUrl: 'https://api.openai.com/v1',
    });

    const result = await service.findOne('cfg-1');

    expect(result).not.toHaveProperty('apiKey');
    expect(result).toMatchObject({ hasApiKey: false, needsRekey: true });
  });

  it('redacts api keys from all public config return paths', async () => {
    const prisma = makePrisma();
    const service = new AiConfigService(prisma as any);
    const encrypted = (service as any).encryptApiKey('sk-secret');
    const config = {
      id: 'cfg-1',
      provider: 'openai',
      providerName: 'OpenAI',
      model: 'gpt-4o-mini',
      modelName: 'GPT-4o mini',
      apiKey: encrypted,
      baseUrl: 'https://api.openai.com/v1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.aIConfig.findMany.mockResolvedValue([config]);
    prisma.aIConfig.findFirst.mockResolvedValue(config);
    prisma.aIConfig.update.mockResolvedValue(config);

    const results = [
      await service.findAll(),
      await service.findActive(),
      await service.update('cfg-1', { modelName: 'New name' }),
      await service.setActive('cfg-1'),
    ];

    for (const result of results.flat()) {
      expect(result).not.toHaveProperty('apiKey');
      expect(result).toMatchObject({ hasApiKey: true });
    }
  });

  it('keeps the existing api key when update omits apiKey', async () => {
    const prisma = makePrisma();
    prisma.aIConfig.findFirst.mockResolvedValue({ id: 'cfg-1', apiKey: 'encrypted-key' });
    prisma.aIConfig.update.mockResolvedValue({ id: 'cfg-1', apiKey: 'encrypted-key' });
    const service = new AiConfigService(prisma as any);

    await service.update('cfg-1', { modelName: 'New name' });

    expect(prisma.aIConfig.update.mock.calls[0][0].data).toEqual({ modelName: 'New name' });
  });

  it('updates active config inside a transaction', async () => {
    const prisma = makePrisma();
    prisma.aIConfig.findFirst.mockResolvedValue({ id: 'cfg-1', apiKey: 'encrypted-key' });
    prisma.aIConfig.update.mockResolvedValue({ id: 'cfg-1', apiKey: 'encrypted-key', isActive: true });
    const service = new AiConfigService(prisma as any);

    await service.setActive('cfg-1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.aIConfig.updateMany).toHaveBeenCalledWith({
      where: {},
      data: { isActive: false },
    });
    expect(prisma.aIConfig.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'cfg-1' },
      data: { isActive: true },
    }));
    expect(prisma.setting.upsert).toHaveBeenCalledWith({
      where: { key: 'ai.activeConfigId' },
      update: { value: 'cfg-1' },
      create: { key: 'ai.activeConfigId', value: 'cfg-1' },
    });
  });

  it('uses the active config pointer when reading active config', async () => {
    const prisma = makePrisma();
    const service = new AiConfigService(prisma as any);
    prisma.setting.findUnique.mockResolvedValue({ value: 'cfg-2' });
    prisma.aIConfig.findFirst.mockResolvedValue({
      id: 'cfg-2',
      provider: 'openai',
      apiKey: (service as any).encryptApiKey('sk-secret'),
      baseUrl: 'https://api.openai.com/v1',
      isActive: false,
    });

    const result = await service.findActive();

    expect(prisma.aIConfig.findFirst).toHaveBeenCalledWith({ where: { id: 'cfg-2' } });
    expect(result).toMatchObject({ id: 'cfg-2', isActive: true, hasApiKey: true });
  });

  it('rejects unsafe base URLs when creating configs', async () => {
    const prisma = makePrisma();
    const service = new AiConfigService(prisma as any);

    await expect(
      service.create('admin-id', {
        provider: 'openai',
        providerName: 'OpenAI',
        model: 'gpt-4o-mini',
        modelName: 'GPT-4o mini',
        apiKey: 'sk-secret',
        baseUrl: 'http://127.0.0.1:8080/v1',
        isActive: true,
      }),
    ).rejects.toThrow('不允许使用内网或本机AI API地址');
    expect(prisma.aIConfig.create).not.toHaveBeenCalled();
    expect(prisma.aIConfig.updateMany).not.toHaveBeenCalled();
  });

  it('rejects unsafe base URLs when updating configs', async () => {
    const prisma = makePrisma();
    prisma.aIConfig.findFirst.mockResolvedValue({ id: 'cfg-1', apiKey: 'encrypted-key' });
    const service = new AiConfigService(prisma as any);

    await expect(service.update('cfg-1', { baseUrl: 'http://[::ffff:127.0.0.1]:8080/v1' })).rejects.toThrow(
      '不允许使用内网或本机AI API地址',
    );
    expect(prisma.aIConfig.update).not.toHaveBeenCalled();
  });

  it('fetches model list through backend with a stored config key', async () => {
    const prisma = makePrisma();
    const service = new AiConfigService(prisma as any);
    prisma.aIConfig.create.mockImplementation(async (args) => ({
      id: 'cfg-1',
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await service.create('admin-id', {
      provider: 'openai',
      providerName: 'OpenAI',
      model: 'gpt-4o-mini',
      modelName: 'GPT-4o mini',
      apiKey: 'sk-secret',
      baseUrl: 'https://api.openai.com/v1',
      isActive: true,
    });

    prisma.aIConfig.findFirst.mockResolvedValue({
      provider: 'openai',
      apiKey: prisma.aIConfig.create.mock.calls[0][0].data.apiKey,
      baseUrl: 'https://api.openai.com/v1',
    });
    mockedAxios.get.mockResolvedValue({
      data: { data: [{ id: 'gpt-4o-mini' }] },
    });

    const result = await service.fetchModels({ configId: 'cfg-1' });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer sk-secret' },
      }),
    );
    expect(result).toEqual([
      { label: 'gpt-4o-mini', value: 'gpt-4o-mini', description: '' },
    ]);
  });

  it('does not expose api keys from model fetch upstream errors', async () => {
    const prisma = makePrisma();
    const service = new AiConfigService(prisma as any);
    mockedAxios.get.mockRejectedValue({
      response: {
        data: { error: { message: 'upstream echoed Authorization: Bearer sk-secret' } },
      },
    });

    await expect(
      service.fetchModels({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-secret',
      }),
    ).rejects.toThrow('AI模型列表获取失败，请检查配置');
    await expect(
      service.fetchModels({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-secret',
      }),
    ).rejects.not.toThrow('sk-secret');
  });

  it('tests draft connection through backend without returning the key', async () => {
    const prisma = makePrisma();
    const service = new AiConfigService(prisma as any);
    mockedAxios.get.mockResolvedValue({
      data: { models: [{ name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' }] },
    });

    const result = await service.testConnection({
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1',
      apiKey: 'gemini-secret',
    });

    expect(result).toEqual({
      connected: true,
      models: [
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', description: 'Gemini 1.5 Pro' },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('gemini-secret');
  });

  it('rejects private network model endpoints before sending a request', async () => {
    const prisma = makePrisma();
    const service = new AiConfigService(prisma as any);

    await expect(
      service.fetchModels({
        provider: 'openai',
        baseUrl: 'http://127.0.0.1:8080/v1',
        apiKey: 'sk-secret',
      }),
    ).rejects.toThrow('不允许使用内网或本机AI API地址');
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('rejects model endpoints whose hostname resolves to a private address', async () => {
    const prisma = makePrisma();
    const service = new AiConfigService(prisma as any);
    mockedLookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);

    await expect(
      service.fetchModels({
        provider: 'openai',
        baseUrl: 'https://evil.example.com/v1',
        apiKey: 'sk-secret',
      }),
    ).rejects.toThrow('不允许使用内网或本机AI API地址');
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('rethrows invalid test input instead of returning connected false', async () => {
    const prisma = makePrisma();
    const service = new AiConfigService(prisma as any);

    await expect(
      service.testConnection({
        provider: 'openai',
        baseUrl: '',
        apiKey: '',
      }),
    ).rejects.toThrow('测试连接需要提供服务商、API地址和API Key');
  });
});
