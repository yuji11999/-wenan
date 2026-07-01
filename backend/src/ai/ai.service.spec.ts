import axios from 'axios';
import { promises as dns } from 'dns';
import * as crypto from 'crypto';
import { AiService } from './ai.service';

jest.mock('axios');
jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

describe('AiService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockedLookup = dns.lookup as jest.Mock;

  const encryptApiKey = (apiKey: string) => {
    const key = crypto.createHash('sha256').update('test-encryption-key', 'utf8').digest();
    const iv = Buffer.alloc(16, 1);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  };

  const makeService = (
    activeConfig?: any,
    envOverrides: Record<string, string> = {},
    activeConfigId?: string,
  ) => {
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          OPENAI_API_KEY: '',
          OPENAI_BASE_URL: 'https://api.openai.com/v1',
          OPENAI_MODEL: '',
          AI_TIMEOUT_MS: '120000',
          ...envOverrides,
        };
        return values[key];
      }),
    };

    const prisma = {
      aIConfig: {
        findFirst: jest.fn().mockResolvedValue(activeConfig || null),
      },
      setting: {
        findUnique: jest.fn().mockResolvedValue(activeConfigId ? { value: activeConfigId } : null),
      },
    };

    return { service: new AiService(configService as any, prisma as any), prisma };
  };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
    mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });

  it('uses the global active AI config managed by admin', async () => {
    const { service } = makeService({
      provider: 'openai',
      apiKey: encryptApiKey('sk-admin'),
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      isActive: true,
    });
    mockedAxios.post.mockResolvedValue({
      data: { choices: [{ message: { content: '{"ok":true}' } }] },
    });

    await (service as any).callAI('hello');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ model: 'gpt-4o-mini' }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer sk-admin' }),
        maxRedirects: 0,
      }),
    );
  });

  it('uses the database active config pointer instead of arbitrary isActive rows', async () => {
    const { service, prisma } = makeService(null, {}, 'cfg-2');
    prisma.aIConfig.findFirst.mockResolvedValue({
      id: 'cfg-2',
      provider: 'openai',
      apiKey: encryptApiKey('sk-admin'),
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      isActive: false,
    });
    mockedAxios.post.mockResolvedValue({
      data: { choices: [{ message: { content: '{"ok":true}' } }] },
    });

    await (service as any).callAI('hello');

    expect(prisma.aIConfig.findFirst).toHaveBeenCalledWith({ where: { id: 'cfg-2' } });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ model: 'gpt-4o-mini' }),
      expect.anything(),
    );
  });

  it('does not fall back to environment API key when no admin config is active', async () => {
    const { service } = makeService(null, {
      OPENAI_API_KEY: 'sk-env',
      OPENAI_MODEL: 'gpt-env',
    });

    await expect((service as any).callAI('hello')).rejects.toThrow('未找到有效的AI配置');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('rejects unsafe active config base URLs before sending AI requests', async () => {
    const { service } = makeService({
      provider: 'openai',
      apiKey: encryptApiKey('sk-admin'),
      baseUrl: 'http://127.0.0.1:8080/v1',
      model: 'gpt-4o-mini',
      isActive: true,
    });

    await expect((service as any).callAI('hello')).rejects.toThrow('不允许使用内网或本机AI API地址');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('retries without response_format when the provider does not support JSON mode', async () => {
    const { service } = makeService({
      provider: 'openai',
      apiKey: encryptApiKey('sk-admin'),
      baseUrl: 'https://api.openai.com/v1',
      model: 'gateway-model',
      isActive: true,
    });
    mockedAxios.post
      .mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: { message: 'response_format is not supported' } },
        },
      })
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: '{"ok":true}' } }] },
      });

    const result = await (service as any).callAI('hello');

    expect(result).toBe('{"ok":true}');
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post.mock.calls[0][1]).toHaveProperty('response_format');
    expect(mockedAxios.post.mock.calls[1][1]).not.toHaveProperty('response_format');
  });

  it('retries without response_format when unsupported message is returned in data.message', async () => {
    const { service } = makeService({
      provider: 'openai',
      apiKey: encryptApiKey('sk-admin'),
      baseUrl: 'https://api.openai.com/v1',
      model: 'gateway-model',
      isActive: true,
    });
    mockedAxios.post
      .mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'json_object response_format is unsupported' },
        },
      })
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: '{"ok":true}' } }] },
      });

    const result = await (service as any).callAI('hello');

    expect(result).toBe('{"ok":true}');
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post.mock.calls[1][1]).not.toHaveProperty('response_format');
  });

  it('does not expose admin api keys from upstream error messages', async () => {
    const { service } = makeService({
      provider: 'openai',
      apiKey: encryptApiKey('sk-admin'),
      baseUrl: 'https://api.openai.com/v1',
      model: 'gateway-model',
      isActive: true,
    });
    mockedAxios.post.mockRejectedValue({
      response: {
        status: 400,
        data: { error: { message: 'upstream echoed Authorization: Bearer sk-admin' } },
      },
    });

    await expect((service as any).callAI('hello')).rejects.toThrow(
      'AI API调用失败 (400): AI服务返回错误，请管理员检查配置',
    );
    await expect((service as any).callAI('hello')).rejects.not.toThrow('sk-admin');
  });

  it('ignores caller supplied API credentials and uses only the admin active config', async () => {
    const { service } = makeService({
      provider: 'openai',
      apiKey: encryptApiKey('sk-admin'),
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      isActive: true,
    });
    mockedAxios.post.mockResolvedValue({
      data: { choices: [{ message: { content: '{"topic":"ok"}' } }] },
    });

    await (service.deconstructCopywriting as any)('hello', {
      apiKey: 'sk-user',
      baseUrl: 'https://user-gateway.example.com/v1',
      model: 'user-model',
      provider: 'openai',
    } as any);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ model: 'gpt-4o-mini' }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer sk-admin' }),
      }),
    );
  });

  it('rejects legacy plaintext API keys instead of using them', async () => {
    const { service } = makeService({
      provider: 'openai',
      apiKey: 'sk-plaintext',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      isActive: true,
    });
    mockedAxios.post.mockResolvedValue({
      data: { choices: [{ message: { content: '{"topic":"ok"}' } }] },
    });

    await expect(service.deconstructCopywriting('hello')).rejects.toThrow('AI API Key 解密失败');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
