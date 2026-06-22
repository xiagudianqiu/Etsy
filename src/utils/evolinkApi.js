/**
 * AI 图像生成 API 调用封装
 * 支持 EvoLink 异步任务模式（提交 → 轮询 → 拿图）+ OpenAI 同步模式
 */

/**
 * 生成图片
 * @param {string} apiKey
 * @param {string} prompt
 * @param {object} opts - { size, quality, model, endpoint, refImages }
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
    let resp;

    if (refs.length > 0) {
      // 图生图：multipart/form-data
      const editUrl = endpoint.includes('/generations')
        ? endpoint.replace('/generations', '/edits')
        : endpoint;

      const formData = new FormData();
      formData.append('model', model);
      formData.append('prompt', prompt);
      formData.append('size', size);
      refs.forEach((file, i) => {
        formData.append(i === 0 ? 'image' : `image${i + 1}`, file);
      });
      refs.forEach(file => formData.append('image[]', file));

      resp = await fetch(editUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
      });
    } else {
      // 文生图：JSON
      resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, prompt, size, quality, n: 1 })
      });
    }

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      let msg = data.error?.message || data.message || `HTTP ${resp.status}`;
      if (resp.status === 401) msg = 'API Key 无效或已过期';
      if (resp.status === 429) msg = '请求过频或额度不足';
      return { ok: false, error: msg };
    }

    const data = await resp.json().catch(() => ({}));

    // 模式 1：同步返回图片（OpenAI 风格 data[0].url / b64_json）
    const syncImage = data.data?.[0] || data.images?.[0] || data.output?.[0];
    if (syncImage) {
      const imageUrl = typeof syncImage === 'string'
        ? syncImage
        : (syncImage.url || (syncImage.b64_json ? `data:image/png;base64,${syncImage.b64_json}` : null));
      if (imageUrl) return { ok: true, imageUrl, raw: data };
    }

    // 模式 2：异步任务（EvoLink 风格，返回 task id）
    const taskId = data.id || data.task_id;
    if (taskId) {
      // 从 endpoint 推导任务查询 URL
      const base = endpoint.replace(/\/v1\/.*$/, '/v1');
      const taskUrl = `${base}/tasks/${taskId}`;
      return await pollTask(taskUrl, apiKey);
    }

    return { ok: false, error: 'API 返回数据格式异常，未找到图片或任务 ID', raw: data };
  } catch (err) {
    return { ok: false, error: err.message || '网络错误' };
  }
}

/**
 * 轮询任务状态直到完成或超时
 */
async function pollTask(taskUrl, apiKey, opts = {}) {
  const { maxAttempts = 60, intervalMs = 2000 } = opts;  // 最长 2 分钟

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));

    const resp = await fetch(taskUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      return { ok: false, error: `查询任务失败：${data.error?.message || resp.status}` };
    }

    const task = await resp.json().catch(() => ({}));

    // 状态判断
    const status = task.status;
    if (status === 'completed' || status === 'succeeded') {
      // 拿图片：output[].url 或 output[].b64_json 或 data[].url
      const outputs = task.output || task.data || task.images || [];
      const first = outputs[0];
      if (first) {
        const imageUrl = typeof first === 'string'
          ? first
          : (first.url || (first.b64_json ? `data:image/png;base64,${first.b64_json}` : null));
        if (imageUrl) return { ok: true, imageUrl, raw: task };
      }
      return { ok: false, error: '任务完成但未返回图片', raw: task };
    }

    if (status === 'failed' || status === 'task_error' || status === 'error') {
      const errMsg = task.error?.message || task.error?.code || '生成失败';
      return { ok: false, error: errMsg, raw: task };
    }

    // pending / processing / queued 继续轮询
  }

  return { ok: false, error: '生成超时（超过 2 分钟）' };
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
