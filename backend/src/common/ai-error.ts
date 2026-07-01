export const PUBLIC_AI_UPSTREAM_ERROR = 'AI服务返回错误，请管理员检查配置';
export const PUBLIC_AI_MODEL_FETCH_ERROR = 'AI模型列表获取失败，请检查配置';

export function getUpstreamErrorText(error: any): string {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  if (typeof data?.error?.message === 'string') return data.error.message;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item: any) => item?.message || item?.reason || item)
      .filter(Boolean)
      .join('; ');
  }
  return error?.message || '';
}

export function isResponseFormatUnsupported(error: any): boolean {
  const message = getUpstreamErrorText(error).toLowerCase();
  return (
    (message.includes('response_format') || message.includes('json_object')) &&
    (message.includes('not support') ||
      message.includes('unsupported') ||
      message.includes('invalid') ||
      message.includes('unknown') ||
      message.includes('unrecognized'))
  );
}
