import { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function FileUploader({ onFilesSelected, isLoading }) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);  // { file, status, error?, monthKey? }
  const [error, setError] = useState('');

  const handleFiles = useCallback(async (newFiles) => {
    const csvs = Array.from(newFiles).filter(f => f.name.endsWith('.csv'));
    if (csvs.length === 0) {
      setError('请上传 CSV 格式的文件');
      return;
    }
    setError('');
    // 初始化状态 pending
    const items = csvs.map(f => ({ file: f, status: 'pending' }));
    setFiles(items);
    // 交给上层处理（会一个个 import）
    const result = await onFilesSelected(csvs);
    // 处理结果回填状态
    if (result && Array.isArray(result.results)) {
      setFiles(prev => prev.map(item => {
        const ok = result.results.find(r => r.filename === item.file.name);
        const err = result.errors?.find(e => e.file === item.file.name);
        if (ok) return { ...item, status: 'success', monthKey: ok.monthKey };
        if (err) return { ...item, status: 'error', error: err.error };
        return { ...item, status: 'unknown' };
      }));
    }
  }, [onFilesSelected]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleInput = useCallback((e) => {
    handleFiles(e.target.files);
    e.target.value = '';  // 允许重选相同文件
  }, [handleFiles]);

  const clearAll = () => { setFiles([]); setError(''); };

  return (
    <div className="card p-6 fade-in">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${dragging
            ? 'border-[var(--gold)] bg-[var(--gold-soft)] scale-[1.01]'
            : 'border-[var(--border-strong)] hover:border-[var(--gold)] hover:bg-[rgba(212,160,86,0.03)]'
          }`}
        onDragEnter={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--gold-soft)] flex items-center justify-center">
          <Upload className={`w-6 h-6 ${dragging ? 'text-[var(--gold-bright)]' : 'text-[var(--gold)]'}`} />
        </div>
        <p className="text-[var(--text-primary)] text-[15px] mb-1.5">
          拖拽 CSV 到这里，或
          <label className="text-[var(--gold-bright)] hover:text-[var(--gold)] cursor-pointer mx-1 underline underline-offset-4 decoration-dotted">
            点击选择文件
            <input type="file" multiple accept=".csv" className="hidden" onChange={handleInput} />
          </label>
        </p>
        <p className="text-xs text-[var(--text-tertiary)] flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--gold)]" />
          支持一次性批量导入多个 Etsy Monthly Statement CSV
        </p>
      </div>

      {/* 已选文件列表 */}
      {files.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs text-[var(--text-tertiary)]">
              共 {files.length} 个文件
              {files.some(f => f.status === 'success') && (
                <span className="ml-2 text-[var(--up)]">
                  · ✓ {files.filter(f => f.status === 'success').length} 成功
                </span>
              )}
              {files.some(f => f.status === 'error') && (
                <span className="ml-2 text-[var(--down)]">
                  · ✕ {files.filter(f => f.status === 'error').length} 失败
                </span>
              )}
            </span>
            <button onClick={clearAll} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">清除</button>
          </div>
          <div className="space-y-1.5">
            {files.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors
                  ${item.status === 'success' ? 'bg-[rgba(74,222,128,0.06)] border-[rgba(74,222,128,0.2)]'
                    : item.status === 'error' ? 'bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.2)]'
                    : 'bg-[var(--bg-elevated)] border-[var(--border)]'}`}
              >
                <FileText className={`w-4 h-4 flex-shrink-0
                  ${item.status === 'success' ? 'text-[var(--up)]'
                    : item.status === 'error' ? 'text-[var(--down)]'
                    : 'text-[var(--gold)]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-primary)] truncate">{item.file.name}</div>
                  {item.status === 'success' && item.monthKey && (
                    <div className="text-[10px] text-[var(--up)] mt-0.5">✓ 已导入 {item.monthKey}</div>
                  )}
                  {item.status === 'error' && (
                    <div className="text-[10px] text-[var(--down)] mt-0.5 truncate">✕ {item.error}</div>
                  )}
                </div>
                {item.status === 'pending' && isLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
                )}
                {item.status === 'success' && <CheckCircle2 className="w-4 h-4 text-[var(--up)]" />}
                {item.status === 'error' && <AlertCircle className="w-4 h-4 text-[var(--down)]" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[var(--down)] text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
