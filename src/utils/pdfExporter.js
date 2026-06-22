import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * 智能 PDF 导出 — 逐个区块截图，避免内容跨页切割
 *
 * 每个区块独立截图，按 A4 页面布局。
 * 如果区块高度超过页面剩余空间 → 自动翻页。
 * 页脚自动追加每页底部。
 *
 * @param {HTMLElement} rootElement
 * @param {string} filename
 * @param {(p: {current: number, total: number, stage: string, percent: number}) => void} onProgress
 */
export async function exportToPDF(rootElement, filename = 'etsy_profit_report', onProgress) {
  if (!rootElement) throw new Error('找不到要导出的内容');

  const report = (current, total, stage) =>
    onProgress && onProgress({
      current, total, stage,
      percent: Math.round((current / total) * 100)
    });

  // 阶段 1: 准备
  report(0, 100, '准备报表视图…');

  // 1) 收集所有区块（data-pdf-block 属性标记）
  const blocks = Array.from(rootElement.querySelectorAll('[data-pdf-block]'));

  if (blocks.length === 0) {
    report(20, 100, '截取整页内容…');
    const canvas = await html2canvas(rootElement, { scale: 2, useCORS: true, logging: false });
    report(70, 100, '生成 PDF…');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pw = pdf.internal.pageSize.getWidth();
    const m = 28;
    const cw = pw - m * 2;
    const scale = cw / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', m, m, cw, canvas.height * scale);
    report(95, 100, '保存文件…');
    pdf.save(`${filename}.pdf`);
    report(100, 100, '完成');
    return;
  }

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 32;
  const contentWidth = pw - margin * 2;
  let pageY = margin;
  const totalSteps = blocks.length + 2;  // 区块数 + 准备 + 保存

  const stageNames = {
    cover: '封面与核心指标',
    'profit-flow': '利润全流程',
    fees: '费用拆解',
    products: '产品分析',
    health: '运营健康度',
    summary: '店铺累计',
    footer: '页脚'
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockKey = block.getAttribute('data-pdf-block') || '区块';
    const stageName = stageNames[blockKey]
      || (blockKey.startsWith('orders-') ? `订单明细 ${parseInt(blockKey.split('-')[1]) + 1}` : blockKey);

    report(i + 1, totalSteps, `渲染：${stageName}`);

    // 2) 截取单个区块
    const canvas = await html2canvas(block, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#fefdfb',
      logging: false
    });

    // 3) 按内容宽度等比缩放到 A4 宽度
    const scale = contentWidth / canvas.width;
    const blockH = canvas.height * scale;

    // 4) 检查是否需要翻页
    if (pageY > margin + 8 && pageY + blockH > ph - margin) {
      pdf.addPage();
      pageY = margin;
    }

    // 5) 插入区块
    pdf.addImage(
      canvas.toDataURL('image/png', 1),
      'PNG',
      margin,
      pageY,
      contentWidth,
      blockH
    );
    pageY += blockH + 6;
  }

  report(totalSteps - 1, totalSteps, '加入页脚…');
  addFooter(pdf);

  report(totalSteps, totalSteps, '保存 PDF…');
  pdf.save(`${filename}.pdf`);

  // 给用户看到 100% 的瞬间
  await new Promise(r => setTimeout(r, 200));
  report(totalSteps, totalSteps, '完成 ✓');
}

function addFooter(pdf) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const totalPages = pdf.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(168, 150, 122);
    pdf.text(
      `Etsy Profit Dashboard · Page ${i} / ${totalPages}`,
      pw / 2,
      ph - 12,
      { align: 'center' }
    );
  }
}

export default { exportToPDF };