/**
 * EvoLink GPT-Image-2 API 调用封装
 * 文档：https://docs.evolink.ai/en/api-manual/image-series/gpt-image-2/gpt-image-2-image-generation
 */

const API_ENDPOINT = 'https://api.evolink.ai/v1/images/generations';

/**
 * 生成图片
 * @param {string} apiKey - 用户的 EvoLink API Key
 * @param {string} prompt - 最终提示词（英文，参数已填充）
 * @param {object} opts - { size, quality, n }
 * @returns {Promise<{ ok: boolean, imageUrl?: string, error?: string }>}
 */
export async function generateImage(apiKey, prompt, opts = {}) {
  if (!apiKey) {
    return { ok: false, error: '未配置 API Key，请先在设置中填写' };
  }

  const { size = '1024x1024', quality = 'auto', n = 1 } = opts;

  try {
    const resp = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt,
        size,
        quality,
        n
      })
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      let msg = data.error?.message || data.message || `HTTP ${resp.status}`;
      if (resp.status === 401) msg = 'API Key 无效或已过期';
      if (resp.status === 429) msg = '请求过于频繁或额度不足';
      return { ok: false, error: msg };
    }

    const data = await resp.json();

    // 兼容多种返回格式
    const image = data.data?.[0];
    if (!image) return { ok: false, error: 'API 返回数据格式异常' };

    // 优先 url，其次 b64_json
    const imageUrl = image.url || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : null);
    if (!imageUrl) return { ok: false, error: '未返回图片' };

    return { ok: true, imageUrl, raw: data };
  } catch (err) {
    return { ok: false, error: err.message || '网络错误' };
  }
}

/**
 * 把带参数占位符的提示词，用用户填的值替换
 * {argument name="x" default="y"} → 用户填的值 或 default
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
