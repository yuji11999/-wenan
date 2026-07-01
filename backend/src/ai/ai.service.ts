import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { assertSafeHttpUrl, createSafeAxiosAgents } from '../common/safe-url';
import { getUpstreamErrorText, isResponseFormatUnsupported, PUBLIC_AI_UPSTREAM_ERROR } from '../common/ai-error';

@Injectable()
export class AiService {
  private timeoutMs: number;
  private readonly activeConfigSettingKey = 'ai.activeConfigId';

  constructor(private configService: ConfigService, private prisma: PrismaService) {
    this.timeoutMs = Number(this.configService.get('AI_TIMEOUT_MS')) || 120000; // 默认120秒
  }

  // 生成 32 字节密钥：对任意长度的字符串做 SHA-256，保证长度正确
  private deriveKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret || secret.trim().length < 16) {
      throw new Error('ENCRYPTION_KEY 未配置或长度不足，无法解密AI API Key');
    }
    return crypto.createHash('sha256').update(secret, 'utf8').digest(); // 32 bytes
  }

  // 解密API Key
  private decryptApiKey(encryptedApiKey: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const key = this.deriveKey();
      const parts = encryptedApiKey.split(':');
      if (parts.length !== 2) {
        throw new Error('invalid encrypted api key format');
      }
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('AI API Key 解密失败，请联系管理员重新保存配置');
    }
  }

  // 解析当前可用的AI配置。常规业务调用只允许使用管理员激活的全局配置。
  private async resolveOptions() {
    const activeConfigId = await this.prisma.setting.findUnique({
      where: { key: this.activeConfigSettingKey },
    });
    let activeConfig = activeConfigId?.value
      ? await this.prisma.aIConfig.findFirst({ where: { id: activeConfigId.value } })
      : null;

    if (!activeConfig) {
      activeConfig = await this.prisma.aIConfig.findFirst({
        where: { isActive: true }
      });
    }

    if (!activeConfig) {
      throw new Error('未找到有效的AI配置。请管理员在系统设置中配置并激活AI服务。');
    }

    const decryptedApiKey = activeConfig.apiKey ? this.decryptApiKey(activeConfig.apiKey) : '';
    const baseUrl = (activeConfig.baseUrl || '').trim();
    await assertSafeHttpUrl(baseUrl);

    return {
      apiKey: decryptedApiKey.trim(),
      baseUrl,
      model: (activeConfig.model || '').trim(),
      provider: (activeConfig.provider || '').trim(),
    };
  }

  private async getSetting(key: string): Promise<string> {
    const record = await this.prisma.setting.findUnique({ where: { key } });
    return record?.value || '';
  }

  // 文案拆解
  async deconstructCopywriting(content: string) {
    const { apiKey } = await this.resolveOptions();
    // 检查API密钥是否配置
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('未找到有效的AI配置。请在系统设置中选择并激活一个AI服务配置。');
    }

    const template = await this.getSetting('prompt.deconstruct');
    if (!template || !template.trim()) {
      // 如果没有配置，使用默认的拆解提示词
      const defaultPrompt = `请帮我分析这段文案的核心话题、吸引人的开头钩子、文案中的金句亮点、广告植入方式等关键要素。

文案内容：
${content}

【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：
{
  "topic": "核心话题",
  "hook": "开头钩子",
  "goldenSentence": "金句亮点",
  "adPlacement": "广告植入方式",
  "content": "核心内容总结",
  "tags": ["标签1", "标签2"]
}`;
      
      const systemMessage = (await this.getSetting('prompt.system')).trim() || '你是短视频文案分析与创作专家。请务必只返回JSON格式的数据，不要包含任何额外的文字、解释或Markdown格式。';
      
      try {
        const response = await this.callAI(defaultPrompt, systemMessage);
        return this.parseJsonResponse(response);
      } catch (error) {
        throw new Error(`AI文案拆解失败: ${error.message}`);
      }
    }
    
    const prompt = template.replaceAll('{{content}}', content);
    const systemMessage = (await this.getSetting('prompt.system')).trim() || undefined;

    try {
      const response = await this.callAI(prompt, systemMessage);
      return this.parseJsonResponse(response);
    } catch (error) {
      throw new Error(`AI文案拆解失败: ${error.message}`);
    }
  }

  // 分析文案（爆款分析）
  async analyzeCopywriting(content: string) {
    const { apiKey } = await this.resolveOptions();
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('未找到有效的AI配置。请在系统设置中选择并激活一个AI服务配置。');
    }

    const template = await this.getSetting('prompt.analyze');
    if (!template || !template.trim()) {
      // 如果没有配置，使用默认的分析提示词
      const defaultPrompt = `请分析这个文案为什么可能成为爆款，包括它的优点、吸引人的地方，以及可以改进的建议。

文案内容：
${content}

【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：
{
  "topic": "核心话题",
  "hook": "开头钩子",
  "goldenSentence": "金句",
  "adPlacement": "广告植入",
  "fireReasons": ["火的原因1", "火的原因2", "火的原因3"],
  "suggestions": ["改进建议1", "改进建议2", "改进建议3"]
}`;
      
      const systemMessage = (await this.getSetting('prompt.system')).trim() || '你是短视频文案分析与创作专家。请务必只返回JSON格式的数据，不要包含任何额外的文字、解释或Markdown格式。';
      
      try {
        const response = await this.callAI(defaultPrompt, systemMessage);
        return this.parseJsonResponse(response);
      } catch (error) {
        throw new Error(`AI爆款分析失败: ${error.message}`);
      }
    }
    
    const prompt = template.replaceAll('{{content}}', content);
    const systemMessage = (await this.getSetting('prompt.system')).trim() || undefined;

    try {
      const response = await this.callAI(prompt, systemMessage);
      return this.parseJsonResponse(response);
    } catch (error) {
      throw new Error(`AI爆款分析失败: ${error.message}`);
    }
  }

  // 优化文案
  async optimizeCopywriting(content: string) {
    const { apiKey } = await this.resolveOptions();
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('未找到有效的AI配置。请在系统设置中选择并激活一个AI服务配置。');
    }

    const template = await this.getSetting('prompt.optimize');
    if (!template || !template.trim()) {
      // 如果没有配置，使用默认的优化提示词
      const defaultPrompt = `请对以下文案进行优化，提升其吸引力、可读性和传播潜力。优化时请关注：
1. 开头钩子是否足够吸引人
2. 语言表达是否简洁有力
3. 情感共鸣是否强烈
4. 行动号召是否明确

原文案：
${content}

【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：
{
  "optimizedContent": "优化后的完整文案",
  "improvements": ["改进点1", "改进点2", "改进点3"],
  "highlights": ["亮点1", "亮点2"]
}`;
      
      const systemMessage = (await this.getSetting('prompt.system')).trim() || '你是短视频文案分析与创作专家。请务必只返回JSON格式的数据，不要包含任何额外的文字、解释或Markdown格式。';
      
      try {
        const response = await this.callAI(defaultPrompt, systemMessage);
        return this.parseJsonResponse(response);
      } catch (error) {
        throw new Error(`AI文案优化失败: ${error.message}`);
      }
    }
    
    const prompt = template.replaceAll('{{content}}', content);
    const systemMessage = (await this.getSetting('prompt.system')).trim() || undefined;

    try {
      const response = await this.callAI(prompt, systemMessage);
      return this.parseJsonResponse(response);
    } catch (error) {
      throw new Error(`AI文案优化失败: ${error.message}`);
    }
  }

  // 仿写文案
  async rewriteCopywriting(
    params: { reference: string; newContent: string; type: string },
  ) {
    const { apiKey } = await this.resolveOptions();
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('未找到有效的AI配置。请在系统设置中选择并激活一个AI服务配置。');
    }

    const { reference, newContent, type } = params;
    
    // 根据仿写类型选择对应的提示词
    const typeKeyMap: Record<string, string> = {
      '结构仿写': 'prompt.rewriteStructure',
      '风格仿写': 'prompt.rewriteStyle',
      '钩子仿写': 'prompt.rewriteHook',
      '混合仿写': 'prompt.rewriteMixed',
    };
    
    // 获取对应类型的提示词键，如果没有则降级使用通用的 prompt.rewrite
    const promptKey = typeKeyMap[type] || 'prompt.rewrite';
    let template = await this.getSetting(promptKey);
    
    // 如果对应类型的提示词不存在，尝试使用通用提示词
    if ((!template || !template.trim()) && promptKey !== 'prompt.rewrite') {
      template = await this.getSetting('prompt.rewrite');
    }
    
    if (!template || !template.trim()) {
      // 如果仍然没有配置，使用默认的仿写提示词
      const typeDescMap: Record<string, string> = {
        '结构仿写': '请严格保持原文案的段落结构、句式长度和节奏，只替换具体内容，不改变整体框架。',
        '风格仿写': '请学习原文案的语气、用词风格、表达方式和情绪基调，创作一个风格相似但内容不同的文案。',
        '钩子仿写': '请重点学习原文案开头钩子的设计方式、吸引用户的技巧，用新内容创作同样吸引人的开头。',
        '混合仿写': '请综合考虑原文案的结构、风格和钩子设计，灵活组合创作一个全新但保持核心优势的文案。',
      };
      
      const typeDesc = typeDescMap[type] || '请参考下面的文案风格和结构，用新的内容创作一个类似的文案。';
      
      const defaultPrompt = `${typeDesc}

参考文案：
${reference}

新的核心内容：
${newContent}

【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：
{
  "title": "文案标题",
  "content": "完整的仿写内容",
  "highlights": ["亮点1", "亮点2", "亮点3"]
}`;
      
      const systemMessage = (await this.getSetting('prompt.system')).trim() || '你是短视频文案分析与创作专家。请务必只返回JSON格式的数据，不要包含任何额外的文字、解释或Markdown格式。';
      
      try {
        const response = await this.callAI(defaultPrompt, systemMessage);
        return this.parseJsonResponse(response);
      } catch (error) {
        throw new Error(`AI文案仿写失败: ${error.message}`);
      }
    }
    
    
    const prompt = template
      .replaceAll('{{reference}}', reference)
      .replaceAll('{{newContent}}', newContent)
      .replaceAll('{{type}}', type);
    const systemMessage = (await this.getSetting('prompt.system')).trim() || undefined;

    try {
      const response = await this.callAI(prompt, systemMessage);
      return this.parseJsonResponse(response);
    } catch (error) {
      throw new Error(`AI文案仿写失败: ${error.message}`);
    }
  }

  // 调用AI接口
  private async callAI(
    prompt: string,
    systemMessage?: string,
  ): Promise<string> {
    const { apiKey, baseUrl, model, provider } = await this.resolveOptions();
    
    // 构建请求体，尝试使用 response_format，如果失败则移除
    const requestBody: any = {
      model: model,
      messages: [
        ...(systemMessage && systemMessage.trim()
          ? [{ role: 'system', content: systemMessage.trim() }]
          : []),
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    };
    
    const endpoint = this.resolveChatCompletionsEndpoint(baseUrl);

    // 先尝试使用 response_format（仅支持部分模型）
    let tryJsonFormat = true;
    if (tryJsonFormat) {
      requestBody.response_format = { type: 'json_object' };
    }

    const makeHeaders = (useGoogleHeader = false) => {
      const headers: any = { 'Content-Type': 'application/json' };
      if (useGoogleHeader || provider === 'gemini' || /generativelanguage\.googleapis\.com/i.test(baseUrl)) {
        headers['x-goog-api-key'] = apiKey;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      return headers;
    };

    const doRequest = async (body = requestBody, useGoogleHeader = false) => axios.post(
      endpoint,
      body,
      {
        headers: makeHeaders(useGoogleHeader),
        timeout: this.timeoutMs,
        timeoutErrorMessage: `AI请求超时（>${this.timeoutMs}ms）`,
        maxRedirects: 0,
        maxBodyLength: 1024 * 1024 * 5,
        maxContentLength: 1024 * 1024 * 5,
        ...createSafeAxiosAgents(),
      },
    );

    try {
      // 第一次请求（根据provider自动选择鉴权方式）
      let response = await doRequest();

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('AI返回数据格式错误');
      }

      const content = response.data.choices[0].message.content;
      
      return content;
    } catch (error) {
      if (error.response) {
        // API返回了错误响应
        const status = error.response.status;
        const message = getUpstreamErrorText(error);
        
        // 检查是否是 response_format 不支持的错误
        if (isResponseFormatUnsupported(error)) {
          const retryBody = { ...requestBody };
          delete retryBody.response_format;
          try {
            const retryResp = await doRequest(retryBody);
            if (retryResp?.data?.choices?.[0]?.message?.content) {
              return retryResp.data.choices[0].message.content;
            }
          } catch (retryError) {
            error = retryError;
          }
        }

        // 如果是Gemini且鉴权失败，自动切换到 x-goog-api-key 再试一次
        if ((status === 401 || status === 403 || status === 400) && (provider === 'gemini' || /generativelanguage\.googleapis\.com/i.test(baseUrl))) {
          try {
            const retryResp = await axios.post(
              this.resolveChatCompletionsEndpoint(baseUrl),
              requestBody,
              {
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                timeout: this.timeoutMs,
                timeoutErrorMessage: `AI请求超时（>${this.timeoutMs}ms）`,
                maxRedirects: 0,
                maxBodyLength: 1024 * 1024 * 5,
                maxContentLength: 1024 * 1024 * 5,
                ...createSafeAxiosAgents(),
              },
            );
            if (retryResp?.data?.choices?.[0]?.message?.content) {
              return retryResp.data.choices[0].message.content;
            }
          } catch (e) {
            // 继续走下面的错误分支
          }
        }

        if (status === 401) {
          throw new Error('AI API密钥无效或已过期，请检查配置');
        } else if (status === 429) {
          throw new Error('AI API调用频率超限，请稍后重试');
        } else if (status === 500) {
          throw new Error('AI服务暂时不可用，请稍后重试');
        } else {
          throw new Error(`AI API调用失败 (${status}): ${PUBLIC_AI_UPSTREAM_ERROR}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error(`AI请求超时（>${this.timeoutMs}ms），请检查网关响应或增大超时时间`);
      } else if (error.request) {
        // 请求已发送但没有收到响应
        throw new Error('无法连接到AI服务，请检查网络连接和API地址配置');
      } else {
        // 其他错误
        throw new Error(`AI调用错误: ${error.message}`);
      }
    }
  }

  // 兼容不同网关：
  // - baseUrl 可能是 https://host/v1 或 https://host/v1/
  // - 也可能已经带上 /chat/completions
  private resolveChatCompletionsEndpoint(baseUrl: string): string {
    const trimmed = baseUrl.replace(/\/$/, '');
    if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
    if (/\/v1$/i.test(trimmed) || /\/v1beta$/i.test(trimmed)) return `${trimmed}/chat/completions`;
    // 兜底：直接拼接 /v1/chat/completions
    return `${trimmed}/v1/chat/completions`;
  }

  // 解析JSON响应
  private parseJsonResponse(response: string): any {
    try {
      // 第一阶段：直接解析
      try {
        const result = JSON.parse(response);
        return result;
      } catch (e) {
        // 继续尝试其他方法
      }
      
      // 第二阶段：提取JSON部分（贪婪匹配最长的JSON）
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          return result;
        } catch (e) {
          // 继续尝试其他方法
        }
      }
      
      // 第三阶段：宽松解析，处理常见问题
      let text = response.trim();
      
      // 去掉代码块围栏（包括 ```json 等）
      text = text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '');
      
      // 提取花括号包裹部分
      const m = text.match(/\{[\s\S]*\}/);
      if (m) text = m[0];
      
      // 去掉注释
      text = text.replace(/\/\/.*$/gm, '');
      text = text.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // 去掉结尾多余逗号
      text = text.replace(/,\s*([}\]])/g, '$1');
      
      // 单引号转双引号（保留转义字符）
      text = text.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (s, g1) => '"' + g1.replace(/"/g, '\\"') + '"');
      
      // 未加引号的键名补引号
      text = text.replace(/([,{]\s*)([A-Za-z_][\w-]*)(\s*:)/g, '$1"$2"$3');
      
      const result = JSON.parse(text);
      return result;
    } catch (error) {
      // 返回更详细的错误信息
      throw new Error(
        `AI响应解析失败。可能原因：\n` +
        `1. AI模型不支持JSON格式输出（需要支持response_format的模型）\n` +
        `2. 提示词配置不正确\n` +
        `3. API配置错误\n\n` +
        `响应前100字符: ${response.substring(0, 100)}...`
      );
    }
  }
}
