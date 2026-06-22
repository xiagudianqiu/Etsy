/**
 * AI 图像生成 API 调用封装
 * 支持多服务商：EvoLink / OpenAI / Replicate / 自定义 endpoint
 */

/**
 * 生成图片
 * @param {string} apiKey - 模型专用 API Key
 * @param {string} prompt - 提示词
 * @param {object} opts - { size, quality, model, endpoint, refImage }
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
    refImage = null
  } = opts;

  // 参考图转 base64（图生图）
  let refImageB64 = null;
  if (refImage) {
    refImageB64 = await fileToBase64(refImage);
  }

  try {
    // 根据是否有参考图决定接口模式
    const isImageToImage = !!refImageB64;
    const url = isImageToImage && endpoint.includes('/generations')
      ? endpoint.replace('/generations', '/edits')
      : endpoint;

    let body;
    let headers = {
      'Authorization': `Bearer ${apiKey}`
    };

    if (isImageToImage) {
      // 图生图：multipart/form-data
      const formData = new FormData();
      formData.append('model', model);
      formData.append('prompt', prompt);
      formData.append('image', refImage);
      formData.append('size', size);
      headers['Content-Type'] = undefined;  // 让浏览器自动设置 boundary
      const resp = await fetch(url, { method: 'POST', headers, body: formData });
      return await handleResp(resp);
    }

    // 文生图：JSON
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      model,
      prompt,
      size,
      quality,
      n: 1
    });

    const resp = await fetch(endpoint, { method: 'POST', headers, body });
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
