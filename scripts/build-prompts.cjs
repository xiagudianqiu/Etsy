/**
 * 解析 awesome-gpt-image-2 仓库的 cases/*.md 生成 prompts.json
 *
 * 用法：node scripts/build-prompts.js
 * 输入：../awesome-gpt-image-ref/cases/{category}.md（英文版）
 * 输出：src/data/prompts.json
 */
const fs = require('fs');
const path = require('path');

const REF_DIR = path.resolve(__dirname, '../../awesome-gpt-image-ref/cases');
const OUT_FILE = path.resolve(__dirname, '../src/data/prompts.json');

// 分类映射：文件名 → 中文标签
const CATEGORIES = [
  { file: 'ecommerce.md', key: 'ecommerce', label: '电商主图', emoji: '🛒' },
  { file: 'ad-creative.md', key: 'ad', label: '广告创意', emoji: '📣' },
  { file: 'portrait.md', key: 'portrait', label: '人像摄影', emoji: '🍌' },
  { file: 'poster.md', key: 'poster', label: '海报插画', emoji: '🎨' },
  { file: 'ui.md', key: 'ui', label: 'UI/社媒', emoji: '📱' },
  { file: 'character.md', key: 'character', label: '角色设计', emoji: '🧍' },
  { file: 'comparison.md', key: 'comparison', label: '对比/社区', emoji: '🧪' }
];

// 电商相关度评分（用于排序，电商类排前面）
const RELEVANCE = {
  ecommerce: 100, ad: 90, poster: 70, ui: 60,
  portrait: 30, character: 20, comparison: 10
};

/**
 * 从提示词里解析参数化占位符
 * {argument name="brand label" default="N°5 CHANEL"} → { name: 'brand label', default: 'N°5 CHANEL' }
 */
function parseArguments(prompt) {
  const args = [];
  const re = /\{argument\s+name="([^"]+)"\s+default="([^"]*)"\s*\}/g;
  let m;
  while ((m = re.exec(prompt)) !== null) {
    args.push({ name: m[1], default: m[2] });
  }
  return args;
}

/**
 * 把参数化提示词转成最终提示词（用默认值填充）
 */
function fillDefaults(prompt) {
  return prompt.replace(
    /\{argument\s+name="([^"]+)"\s+default="([^"]*)"\s*\}/g,
    (_, name, def) => def
  );
}

function parseFile(filePath, category) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cases = [];

  // 按 ### Case N: 分割
  const blocks = content.split(/^### Case /m).slice(1);

  for (const block of blocks) {
    // 第一行：N: [Title](url) (by [@author](authorUrl))
    const firstLineMatch = block.match(/^(\d+):\s*\[([^\]]*)\]\(([^)]*)\)(?:\s*\(by\s*\[?@?([^\]]*)\]?\(([^)]*)\)\))?/);
    if (!firstLineMatch) continue;

    const id = parseInt(firstLineMatch[1], 10);
    const title = firstLineMatch[2].trim();
    const sourceUrl = firstLineMatch[3].trim();
    const author = firstLineMatch[4]?.trim() || '';
    const authorUrl = firstLineMatch[5]?.trim() || '';

    // 提取图片 URL（GitHub raw）
    const imgMatch = block.match(/<img\s+src="(https:\/\/raw\.githubusercontent\.com[^"]+)"/);
    const imageUrl = imgMatch ? imgMatch[1] : '';

    // 提取提示词（``` 代码块）
    const promptMatch = block.match(/```\s*\n([\s\S]*?)\n```/);
    if (!promptMatch) continue;
    const prompt = promptMatch[1].trim();

    const arguments_ = parseArguments(prompt);
    const filledPrompt = fillDefaults(prompt);

    cases.push({
      id,
      category: category.key,
      categoryLabel: category.label,
      categoryEmoji: category.emoji,
      title,
      sourceUrl,
      author,
      authorUrl,
      imageUrl,
      prompt,              // 原始带占位符
      arguments: arguments_,
      filledPrompt,        // 默认值填充后
      relevance: RELEVANCE[category.key] || 0
    });
  }

  return cases;
}

function main() {
  if (!fs.existsSync(REF_DIR)) {
    console.error(`❌ 找不到参考仓库：${REF_DIR}`);
    console.error('请先 git clone https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts.git awesome-gpt-image-ref');
    process.exit(1);
  }

  const all = [];
  const stats = {};

  for (const cat of CATEGORIES) {
    const filePath = path.join(REF_DIR, cat.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ 跳过不存在的文件：${cat.file}`);
      continue;
    }
    const cases = parseFile(filePath, cat);
    stats[cat.key] = cases.length;
    all.push(...cases);
    console.log(`✓ ${cat.file}: ${cases.length} 条`);
  }

  // 按相关度 + id 排序
  all.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return a.id - b.id;
  });

  // 确保输出目录存在
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({
    version: 1,
    generatedAt: new Date().toISOString(),
    total: all.length,
    categories: CATEGORIES.map(c => ({ ...c, count: stats[c.key] || 0 })),
    prompts: all
  }, null, 2));

  console.log(`\n✅ 共 ${all.length} 条提示词 → ${OUT_FILE}`);
  console.log('分类统计：', stats);
}

main();
