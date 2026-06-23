/**
 * Vercel Serverless Function: AI 生图代理（简化版，不依赖 Supabase 环境变量）
 *
 * 前端不能直接调 image.codesonline.dev（CORS 限制），通过这个代理转发。
 *
 * POST /api/generate-image
 * Body: {
 *   apiKey, model, prompt, size, quality, style, responseFormat,
 *   endpoint,
 *   refImages: [{ filename, content }]  // base64
 * }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      apiKey, model = 'gpt-image-2', prompt, size = '1:1',
      quality = 'high', style, responseFormat = 'url',
      endpoint = 'https://image.codesonline.dev/v1/images/generations',
      refImages = [],
      upscale
    } = req.body || {};

    if (!apiKey) return res.status(400).json({ error: '缺少 API Key' });
    if (!prompt) return res.status(400).json({ error: '缺少 prompt' });

    let apiResp;

    if (refImages && refImages.length > 0) {
      // 图生图：multipart/form-data → /v1/images/edits
      const editUrl = endpoint.replace('/generations', '/edits');
      const formData = new FormData();
      formData.append('model', model);
      formData.append('prompt', prompt);
      formData.append('size', size);
      formData.append('quality', quality);
      formData.append('response_format', responseFormat);
      if (style) formData.append('style', style);
      if (upscale) formData.append('upscale', upscale);

      refImages.forEach((img, i) => {
        const buffer = Buffer.from(img.content, 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });
        if (i === 0) {
          formData.append('image', blob, img.filename || 'image.png');
        } else {
          formData.append('image[]', blob, img.filename || `image${i}.png`);
        }
      });

      apiResp = await fetch(editUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
      });
    } else {
      // 文生图：JSON
      const body = { model, prompt, size, quality, n: 1, response_format: responseFormat };
      if (style) body.style = style;
      if (upscale) body.upscale = upscale;

      apiResp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    }

    if (!apiResp.ok) {
      const errText = await apiResp.text();
      let msg = `HTTP ${apiResp.status}`;
      try {
        const errData = JSON.parse(errText);
        msg = errData.error?.message || errData.message || msg;
      } catch {}
      if (apiResp.status === 401) msg = 'API Key 无效或已过期';
      if (apiResp.status === 429) msg = '请求过频或额度不足';
      if (apiResp.status === 404) msg = '接口地址错误（404），请检查 Endpoint';
      return res.status(apiResp.status).json({ error: msg });
    }

    const data = await apiResp.json().catch(() => ({}));
    const image = data.data?.[0];
    if (!image) return res.status(500).json({ error: 'API 未返回图片数据', raw: data });

    const imageUrl = image.url
      || image.fallback_url
      || image.urls?.direct
      || image.urls?.mx
      || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : null);

    if (!imageUrl) return res.status(500).json({ error: '返回数据中没有图片 URL', raw: data });

    return res.status(200).json({ ok: true, imageUrl, raw: data });
  } catch (err) {
    console.error('Generate image proxy error:', err);
    return res.status(500).json({ error: err.message || '服务器错误' });
  }
}
