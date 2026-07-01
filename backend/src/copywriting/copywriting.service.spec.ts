import { CopywritingService } from './copywriting.service';

describe('CopywritingService', () => {
  const makeService = () => {
    const prisma = {};
    const aiService = {
      deconstructCopywriting: jest.fn().mockResolvedValue({ topic: 'ok' }),
    };

    return {
      service: new CopywritingService(prisma as any, aiService as any),
      aiService,
    };
  };

  it('ignores request header AI overrides for business AI calls', async () => {
    const { service, aiService } = makeService();

    await service.deconstruct(
      'user-1',
      { content: 'hello', videoUrl: '', industry: 'other' },
      {
        'x-ai-key': 'sk-user',
        'x-ai-base-url': 'https://user-gateway.example.com/v1',
        'x-ai-model': 'user-model',
      },
    );

    expect(aiService.deconstructCopywriting).toHaveBeenCalledWith('hello');
  });
});
