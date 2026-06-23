/**
 * AI 图像生成 API 调用封装
 *
 * 通过 /api/generate-image 代理转发（解决浏览器 CORS 限制）
 * API Key 在请求体里传给代理，代理再调真实 API
 */
import { supabase } from './supabase';

/**
 * 生成图片
 * @param {string} apiKey - 用户的 API Key
 * @param {string} prompt - 提示词
 * @param {object} opts - { size, quality, model, endpoint, refImages, style, responseFormat }
 */
export async function generateImage(apiKey, prompt, opts = {}) {
  if (!apiKey) {
    return { ok: false, error: '未配置 API Key，请先在设置中添加模型' };
  }

  const {
    size = '1:1',
    quality = 'high',
    model = 'gpt-image-2',
    endpoint = 'https://image.codesonline.dev/v1/images/generations',
    refImages = [],
    style,
    responseFormat = 'url',
    upscale
  } = opts;

  // 检查登录
  let accessToken = '';
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    accessToken = session?.access_token || '';
  }
  // 注：代理不再需要验证身份（简化版）

  // 参考图转 base64（代理需要）
  const refImagesB64 = [];
  for (const file of (refImages || []).filter(Boolean).slice(0, 4)) {
    const b64 = await fileToBase64(file);
    refImagesB64.push({
      filename: file.name,
      content: b64.split(',')[1]  // 去掉 data:image/png;base64, 前缀
    });
  }

  try {
    const body = {
      apiKey,
      model,
      prompt,
      size,
      quality,
      style,
      responseFormat,
      endpoint,
      refImages: refImagesB64
    };
    if (upscale) body.upscale = upscale;

    const resp = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return { ok: false, error: data.error || `HTTP ${resp.status}` };
    }

    if (!data.ok || !data.imageUrl) {
      return { ok: false, error: data.error || '未返回图片' };
    }

    return { ok: true, imageUrl: data.imageUrl, raw: data.raw };
  } catch (err) {
    return { ok: false, error: err.message || '网络错误（代理请求失败）' };
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 把带参数占位符的提示词，用用户填的值替换
 */
export function fillPrompt(template, values = {}) {
  return template.replace(
    /\{argument\s+name="([^"]+)"\s+default="([^"]*)"\s*\}/g,
    (full, name, def) => {
      const v = values[name];
      return v !== undefined && v !== '' ? v : def;
    }
  );
}
