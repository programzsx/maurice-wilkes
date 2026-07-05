import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react';
import './style.css';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8010' : '');
const PAGE_SIZE = 12;

const emptyForm = {
  name: '',
  description: '',
  sort_order: 0,
};

function App() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0] || null,
    [items, selectedId],
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function load(nextPage = page, nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        page_size: String(PAGE_SIZE),
      });
      if (nextQuery.trim()) {
        params.set('q', nextQuery.trim());
      }
      const response = await fetch(`${API_BASE}/api/dict-nouns?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`加载失败：HTTP ${response.status}`);
      }
      const data = await response.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
      if (!selectedId && data.items?.length) {
        setSelectedId(data.items[0].id);
      }
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, '');
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || '',
      sort_order: item.sort_order || 0,
    });
  }

  async function submitForm(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('名词不能为空');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        editingId ? `${API_BASE}/api/dict-nouns/${editingId}` : `${API_BASE}/api/dict-nouns`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description,
            sort_order: Number(form.sort_order) || 0,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || `保存失败：HTTP ${response.status}`);
      }
      resetForm();
      setSelectedId(data.id);
      await load(page, query);
    } catch (err) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item) {
    const ok = window.confirm(`删除「${item.name}」吗？`);
    if (!ok) return;

    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/dict-nouns/${item.id}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) {
        throw new Error(`删除失败：HTTP ${response.status}`);
      }
      if (selectedId === item.id) {
        setSelectedId(null);
      }
      await load(page, query);
    } catch (err) {
      setError(err.message || '删除失败');
    }
  }

  async function randomOne() {
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/dict-nouns/random?limit=1`);
      if (!response.ok) {
        throw new Error(`随机失败：HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data[0]) {
        setSelectedId(data[0].id);
        setItems((current) => {
          if (current.some((item) => item.id === data[0].id)) return current;
          return [data[0], ...current];
        });
      }
    } catch (err) {
      setError(err.message || '随机失败');
    }
  }

  function search(event) {
    event.preventDefault();
    setQuery(draftQuery);
    setPage(1);
    load(1, draftQuery);
  }

  function changePage(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(safePage);
    load(safePage, query);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <BookOpen size={30} aria-hidden="true" />
          <div>
            <h1>Maurice Wilkes</h1>
            <p>dict_noun</p>
          </div>
        </div>

        <form className="noun-form" onSubmit={submitForm}>
          <div className="form-head">
            <h2>{editingId ? '编辑名词' : '新建名词'}</h2>
            {editingId && (
              <button type="button" className="icon-button" onClick={resetForm} title="取消编辑">
                <X size={18} />
              </button>
            )}
          </div>

          <label>
            <span>名称</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="比如：语言、石头、Ada Lovelace"
              maxLength={255}
            />
          </label>

          <label>
            <span>描述</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="它是谁。它是什么。你怎样认识它。"
              rows={6}
            />
          </label>

          <label>
            <span>排序值</span>
            <input
              type="number"
              value={form.sort_order}
              onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
            />
          </label>

          <button className="primary-button" disabled={saving} type="submit">
            <Plus size={18} />
            {saving ? '保存中' : editingId ? '保存修改' : '收入词典'}
          </button>
        </form>
      </aside>

      <section className="content">
        <header className="toolbar">
          <form className="search-box" onSubmit={search}>
            <Search size={18} aria-hidden="true" />
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="搜索名词或描述"
            />
            <button type="submit">搜索</button>
          </form>

          <div className="tool-actions">
            <button className="icon-text-button" onClick={() => load(page, query)} disabled={loading}>
              <RefreshCw size={18} />
              刷新
            </button>
            <button className="icon-text-button" onClick={randomOne}>
              <Shuffle size={18} />
              随机
            </button>
          </div>
        </header>

        {error && <div className="error-line">{error}</div>}

        <div className="workspace">
          <section className="noun-list" aria-label="名词列表">
            <div className="list-meta">
              <strong>{total}</strong>
              <span>个名词</span>
            </div>

            {loading ? (
              <div className="empty-state">加载中</div>
            ) : items.length === 0 ? (
              <div className="empty-state">还没有名词</div>
            ) : (
              items.map((item) => (
                <article
                  className={`noun-row ${selected?.id === item.id ? 'active' : ''}`}
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.description || '没有描述'}</p>
                  </div>
                  <span>{item.sort_order}</span>
                </article>
              ))
            )}

            <footer className="pager">
              <button onClick={() => changePage(page - 1)} disabled={page <= 1}>
                上一页
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button onClick={() => changePage(page + 1)} disabled={page >= totalPages}>
                下一页
              </button>
            </footer>
          </section>

          <section className="detail-panel" aria-label="名词详情">
            {selected ? (
              <>
                <div className="detail-top">
                  <div>
                    <p>#{selected.random_int}</p>
                    <h2>{selected.name}</h2>
                  </div>
                  <div className="detail-actions">
                    <button className="icon-button" onClick={() => startEdit(selected)} title="编辑">
                      <Edit3 size={18} />
                    </button>
                    <button className="icon-button danger" onClick={() => removeItem(selected)} title="删除">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="description">{selected.description || '没有描述'}</div>
                <dl className="field-grid">
                  <div>
                    <dt>ID</dt>
                    <dd>{selected.id}</dd>
                  </div>
                  <div>
                    <dt>排序</dt>
                    <dd>{selected.sort_order}</dd>
                  </div>
                  <div>
                    <dt>创建</dt>
                    <dd>{formatTime(selected.create_time)}</dd>
                  </div>
                  <div>
                    <dt>更新</dt>
                    <dd>{formatTime(selected.update_time)}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="empty-state">选择一个名词</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function formatTime(value) {
  const seconds = Number(value);
  if (!seconds) return value || '';
  return new Date(seconds * 1000).toLocaleString('zh-CN', { hour12: false });
}

createRoot(document.getElementById('root')).render(<App />);
