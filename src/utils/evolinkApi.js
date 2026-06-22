/**
 * AI 图像生成 API 调用封装
 * 支持多服务商：EvoLink / OpenAI / Replicate / 自定义 endpoint
 */

/**
 * 生成图片
 * @param {string} apiKey - 模型专用 API Key
 * @param {string} prompt - 提示词
 * @param {object} opts - { size, quality, model, endpoint, refImages }
 *   refImages: File[] 参考图数组（最多4张，图生图）
 * @returns {Promise<{ ok: boolean, imageUrl?: string, error?: string }>}
 */
export async function generateImage(apiKey, prompt, opts = {}) {
  if (!apiKey) {
    return { ok: false, error: '未配置 API Key，请先在设置中添加模型' };
  }

  const {
    size = '1024x1024',
    quality = 'auto',
    model = 'gpt-image-2',
    endpoint = 'https://api.evolink.ai/v1/images/generations',
    refImages = []
  } = opts;

  const refs = (refImages || []).filter(Boolean).slice(0, 4);

  try {
    // 图生图（有参考图）：multipart/form-data，多张图片用 image / image2 / image3 / image4
    if (refs.length > 0) {
      const editUrl = endpoint.includes('/generations')
        ? endpoint.replace('/generations', '/edits')
        : endpoint;

      const formData = new FormData();
      formData.append('model', model);
      formData.append('prompt', prompt);
      formData.append('size', size);
      // 多图：EvoLink/OpenAI 兼容用 image + image[]，这里用 image、image2、image3、image4
      refs.forEach((file, i) => {
        formData.append(i === 0 ? 'image' : `image${i + 1}`, file);
      });
      // 同时加一个 image[] 兼容某些 API
      refs.forEach(file => formData.append('image[]', file));

      const resp = await fetch(editUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
      });
      return await handleResp(resp);
    }

    // 文生图：JSON
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, prompt, size, quality, n: 1 })
    });
    return await handleResp(resp);
  } catch (err) {
    return { ok: false, error: err.message || '网络错误' };
  }
}

async function handleResp(resp) {
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    let msg = data.error?.message || data.message || `HTTP ${resp.status}`;
    if (resp.status === 401) msg = 'API Key 无效或已过期';
    if (resp.status === 429) msg = '请求过频或额度不足';
    return { ok: false, error: msg };
  }
  const data = await resp.json().catch(() => ({}));
  const image = data.data?.[0] || data.output?.[0] || data.images?.[0];
  if (!image) return { ok: false, error: 'API 返回数据格式异常' };
  const imageUrl = typeof image === 'string'
    ? image
    : (image.url || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : null));
  if (!imageUrl) return { ok: false, error: '未返回图片' };
  return { ok: true, imageUrl, raw: data };
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
