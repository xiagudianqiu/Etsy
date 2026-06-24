import Papa from 'papaparse';

/**
 * 解析 Etsy Monthly Statement CSV 文件
 *
 * 费用分类规则：
 * - 费用行 Fees & Taxes 为负数，credit/返还行为正数
 * - 用带符号累加（feeAmount = -feesAndTaxes），credit 自动抵扣对应费用类别
 * - netAmount 直接累加 Net 列，与 Etsy 账单底部净额精确对齐
 */
export function parseEtsyCSV(csvContent, filename) {
  const results = Papa.parse(csvContent, {
    skipEmptyLines: true
  });

  const rows = results.data;
  if (!rows || rows.length < 2) {
    throw new Error('CSV 文件为空或格式不正确');
  }

  // 第一行是标题，提取字段名
  const headers = (rows[0] || []).map(h => h?.trim() || '');

  // 创建字段索引映射
  const fieldIndex = {};
  headers.forEach((h, i) => {
    fieldIndex[h] = i;
  });

  // 智能提取月份（容忍任意文件名格式）
  let finalMonthKey = extractMonthFromFilename(filename);

  // 如果文件名提取不到，后面从 CSV 内容的日期里推断

  // 按订单号分组
  const ordersMap = new Map();

  // 汇总费用（带符号：费用为正，credit/返还为负）
  const summary = {
    totalSales: 0,
    totalFees: 0,
    totalTransactionFee: 0,
    totalProcessingFee: 0,
    totalTax: 0,
    totalShipping: 0,
    totalEtsyAds: 0,
    totalOffsiteAds: 0,
    totalListingFee: 0,
    totalRefund: 0,
    otherFees: 0,
    paymentIncome: 0,
    netAmount: 0,
    totalAds: 0,
    orderCount: 0
  };

  const dataRows = rows.slice(1);

  // 预处理：解析所有行 + 提取订单号
  const parsedRows = [];
  dataRows.forEach(row => {
    if (!row || row.length < 4) return;
    const getValue = (fieldName) => {
      const idx = fieldIndex[fieldName];
      return idx !== undefined && idx < row.length ? row[idx] : '';
    };
    const date = parseDate(getValue('Date'));
    const type = getValue('Type')?.trim() || '';
    const title = getValue('Title')?.trim() || '';
    const info = getValue('Info')?.trim() || '';
    const amount = parseFloat(getValue('Amount')?.replace(/[$,]/g, '').trim() || '0') || 0;
    const feesAndTaxes = parseFloat(getValue('Fees & Taxes')?.replace(/[$,]/g, '').trim() || '0') || 0;
    const net = parseFloat(getValue('Net')?.replace(/[$,]/g, '').trim() || '0') || 0;
    // 订单号：优先 Info，回退到 Title（Sale 行 Info 为空，订单号在 Title）
    const orderMatch = info.match(/Order #(\d+)/) || title.match(/Order #(\d+)/);
    const orderId = orderMatch ? orderMatch[1] : null;
    parsedRows.push({ date, type, title, info, amount, feesAndTaxes, net, orderId, titleLower: title.toLowerCase(), feeAmount: -feesAndTaxes });
  });

  // 第一遍：创建所有订单（Sale 行），保证后续费用行能关联到订单
  // 同时从 Transaction fee 行（含完整产品名）捕获产品标题
  parsedRows.forEach(r => {
    const { type, orderId, date, title, amount } = r;
    if (type === 'Sale' && orderId) {
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          orderId,
          date,
          sale: amount,
          transactionFee: 0,
          processingFee: 0,
          tax: 0,
          shipping: 0,
          etsyAds: 0,
          offsiteAds: 0,
          listingFee: 0,
          refund: 0,
          otherFees: 0,
          totalFees: 0,
          net: amount,
          productTitle: '',        // 完整产品标题（来自 Transaction fee 行）
          product: '',             // 识别后的产品类型（前端计算）
          product: guessProductType(title, amount)  // 兜底：Sale 行标题（通常为空）
        });
      }
      const order = ordersMap.get(orderId);
      order.sale = amount;
      order.net = amount;
      summary.totalSales += amount;
      summary.orderCount++;
    }
    // Transaction fee 行含完整产品名，回填到对应订单
    if (type === 'Fee' && orderId && title.toLowerCase().includes('transaction fee')) {
      // 提取 "Transaction fee: " 后面的产品名
      const productTitle = title.replace(/^transaction\s*fee:\s*/i, '').trim();
      if (productTitle) {
        if (!ordersMap.has(orderId)) {
          ordersMap.set(orderId, {
            orderId, date, sale: 0, transactionFee: 0, processingFee: 0, tax: 0,
            shipping: 0, etsyAds: 0, offsiteAds: 0, listingFee: 0, refund: 0,
            otherFees: 0, totalFees: 0, net: 0,
            productTitle: '', product: ''
          });
        }
        const order = ordersMap.get(orderId);
        if (!order.productTitle) order.productTitle = productTitle;
      }
    }
  });

  // 订单产品类型识别：优先用完整产品标题，回退到 Sale 行标题/金额
  ordersMap.forEach(order => {
    order.product = identifyProduct(order.productTitle || '');
  });

  // 第二遍：累计净额 + 关联费用到订单 + 汇总
  parsedRows.forEach(r => {
    const { type, orderId, titleLower, feeAmount, net, amount } = r;

    // 累计真实净额（Net 列），与 Etsy 账单底部对齐
    summary.netAmount += net;

    // Sale 行已在第一遍处理
    if (type === 'Sale') return;
    // Payment 收入，计入收入不计费用
    if (type === 'Payment') { summary.paymentIncome += amount; return; }
    // Deposit 打款记录，不影响账单净额
    if (type === 'Deposit') return;

    const order = orderId ? ordersMap.get(orderId) : null;

    // 费用分类（credit 通过负号自动抵扣对应类别）
    if (titleLower.includes('offsite ads')) {
      summary.totalOffsiteAds += feeAmount;
      if (order) order.offsiteAds += feeAmount;
    } else if (titleLower.includes('etsy ads')) {
      summary.totalEtsyAds += feeAmount;
      if (order) order.etsyAds += feeAmount;
    } else if (titleLower.includes('etsy plus subscription')) {
      summary.otherFees += feeAmount;
      if (order) order.otherFees += feeAmount;
    } else if (titleLower.includes('transaction fee')) {
      summary.totalTransactionFee += feeAmount;
      if (order) order.transactionFee += feeAmount;
    } else if (titleLower.includes('processing fee')) {
      summary.totalProcessingFee += feeAmount;
      if (order) order.processingFee += feeAmount;
    } else if (titleLower.includes('listing fee')) {
      summary.totalListingFee += feeAmount;
      if (order) order.listingFee += feeAmount;
    } else if (titleLower.includes('sales tax')) {
      summary.totalTax += feeAmount;
      if (order) order.tax += feeAmount;
    } else if (type === 'Shipping') {
      summary.totalShipping += feeAmount;
      if (order) order.shipping += feeAmount;
    } else if (type === 'Refund') {
      summary.totalRefund += feeAmount;
      if (order) order.refund += feeAmount;
    } else if (type === 'Buyer Fee') {
      summary.otherFees += feeAmount;
      if (order) order.otherFees += feeAmount;
    } else if (feeAmount > 0) {
      summary.otherFees += feeAmount;
      if (order) order.otherFees += feeAmount;
    }
    // 其余 credit（feeAmount < 0 且无对应类别）忽略
  });

  // 费用总额 = 各分类净值（正值）之和
  // 注：用 Math.max(0, ...) 而非 Math.abs，避免某分类为负（credit > 费用）时反向累加
  summary.totalFees =
    Math.max(0, summary.totalTransactionFee) +
    Math.max(0, summary.totalProcessingFee) +
    Math.max(0, summary.totalTax) +
    Math.max(0, summary.totalShipping) +
    Math.max(0, summary.totalEtsyAds) +
    Math.max(0, summary.totalOffsiteAds) +
    Math.max(0, summary.totalListingFee) +
    Math.max(0, summary.totalRefund) +
    Math.max(0, summary.otherFees);

  summary.totalAds = Math.max(0, summary.totalEtsyAds) + Math.max(0, summary.totalOffsiteAds);

  // 计算每个订单的费用小计与净额
  ordersMap.forEach(order => {
    order.totalFees =
      Math.max(0, order.transactionFee) + Math.max(0, order.processingFee) +
      Math.max(0, order.tax) + Math.max(0, order.shipping) +
      Math.max(0, order.etsyAds) + Math.max(0, order.offsiteAds) +
      Math.max(0, order.listingFee) + Math.max(0, order.refund) +
      Math.max(0, order.otherFees);
    order.net = order.sale - order.totalFees;
    // 此处 profit 仅扣除 Etsy 费用，未含产品成本
    // 真实利润（含产品成本）在展示层通过 calculateOrderProfit 计算
    order.profit = order.net;
  });

  // 如果文件名提取不到月份，从订单日期推断
  if (!finalMonthKey) {
    const orders = Array.from(ordersMap.values());
    for (const o of orders) {
      if (o.date) {
        const m = o.date.match(/(\d{4})-(\d{2})/);
        if (m) { finalMonthKey = `${m[1]}-${m[2]}`; break; }
      }
    }
  }

  return {
    monthKey: finalMonthKey,
    filename,
    importedAt: new Date().toISOString(),
    orders: Array.from(ordersMap.values()),
    summary
  };
}

/**
 * 从文件名智能提取月份（容忍任意格式）
 * 匹配规则（按优先级）：
 *   1. 2026_4 / 2026_04 / 2026-4 → 2026-04
 *   2. 202604 → 2026-04
 *   3. 2026 4（空格分隔）→ 2026-04
 *   4. 找不到返回 null（后面从 CSV 内容兜底）
 */
function extractMonthFromFilename(filename) {
  if (!filename) return null;
  const f = filename.replace(/\s+/g, ' ');  // 统一空格

  // 优先：2026_4 或 2026-4 或 2026 4
  let m = f.match(/(\d{4})[_\-\s](\d{1,2})(?:\D|$)/);
  if (m) {
    const month = parseInt(m[2]);
    if (month >= 1 && month <= 12) {
      return `${m[1]}-${String(month).padStart(2, '0')}`;
    }
  }

  // 其次：202604（6位连续数字，前4位年，后2位月）
  m = f.match(/(\d{4})(\d{2})(?:\D|$)/);
  if (m) {
    const month = parseInt(m[2]);
    if (month >= 1 && month <= 12) {
      return `${m[1]}-${m[2]}`;
    }
  }

  return null;
}

/**
 * 解析日期字符串
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  // Etsy 格式: "April 30, 2026"
  const match = dateStr.match(/(\w+)\s+(\d+),\s+(\d{4})/);
  if (match) {
    const months = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    const [, month, day, year] = match;
    return `${year}-${months[month]}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * 根据产品标题智能识别产品类型（基于关键词匹配）
 * 标题示例:
 *   "Stanley LoveShackFancy Style 40oz Tumble..."  → 40oz LSF Stanley联名
 *   "Stanley Style 64oz Classic Vacuum Insula..."  → 64oz Stanley
 *   "Limited Edition 32oz Pink Bow Owala Free..."  → 32oz 粉色蝴蝶结
 */
export function identifyProduct(productTitle) {
  if (!productTitle) return '未识别';
  const t = productTitle.toLowerCase();

  // 容量优先识别
  const has32 = /\b32\s*oz\b/.test(t);
  const has40 = /\b40\s*oz\b/.test(t);
  const has64 = /\b64\s*oz\b/.test(t);

  // 32oz 粉色蝴蝶结 Owala
  if (has32 && (t.includes('pink bow') || t.includes('pink') || t.includes('owala'))) {
    return '32oz 粉色蝴蝶结';
  }
  if (has32) return '32oz';

  // 64oz Stanley
  if (has64 && t.includes('stanley')) return '64oz Stanley';
  if (has64) return '64oz';

  // 40oz 各款
  if (has40) {
    if (t.includes('silver') || t.includes('titani')) return '40oz Stanley 银钛';
    if (t.includes('stanley') && (t.includes('loveshack') || t.includes('love shack'))) return '40oz Stanley LSF';
    if (t.includes('pink floral') || t.includes('pink')) return '40oz LSF 粉花';
    if (t.includes('loveshack') || t.includes('love shack')) return '40oz LSF';
    if (t.includes('stanley')) return '40oz Stanley';
    return '40oz';
  }

  return productTitle.length > 30 ? productTitle.slice(0, 30) + '…' : productTitle;
}

/**
 * 根据标题和金额猜测产品类型（兜底用）
 */
function guessProductType(title, amount) {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('40oz') || titleLower.includes('40 oz')) {
    if (titleLower.includes('love shack fancy') || titleLower.includes('love shack')) {
      return amount > 100 ? '104款' : '80款';
    }
    if (titleLower.includes('silver') || titleLower.includes('titanium')) {
      return '40oz银灰色';
    }
    return '104款';
  }

  if (titleLower.includes('64oz') || titleLower.includes('64 oz')) {
    return '64oz';
  }

  if (titleLower.includes('32oz') || titleLower.includes('32 oz')) {
    if (titleLower.includes('pink') || titleLower.includes('bow')) {
      return '32oz粉色蝴蝶结';
    }
    return '32oz';
  }

  // 根据金额猜测
  if (amount >= 140) return '104款';
  if (amount >= 100) return '80款';
  if (amount >= 70) return '64oz';
  return '80款';
}

export default parseEtsyCSV;
