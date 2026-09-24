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

const wordTypes = [
  { key: 'noun', table: 'dict_noun', zh: '名词', en: 'Noun', abbr: 'n.', group: '实词' },
  { key: 'verb', table: 'dict_verb', zh: '动词', en: 'Verb', abbr: 'v.', group: '实词' },
  { key: 'adjective', table: 'dict_adjective', zh: '形容词', en: 'Adjective', abbr: 'adj.', group: '实词' },
  { key: 'numeral', table: 'dict_numeral', zh: '数词', en: 'Numeral', abbr: 'num.', group: '实词' },
  { key: 'classifier', table: 'dict_classifier', zh: '量词', en: 'Classifier', abbr: 'mw.', group: '实词' },
  { key: 'pronoun', table: 'dict_pronoun', zh: '代词', en: 'Pronoun', abbr: 'pron.', group: '实词' },
  { key: 'adverb', table: 'dict_adverb', zh: '副词', en: 'Adverb', abbr: 'adv.', group: '虚词' },
  { key: 'preposition', table: 'dict_preposition', zh: '介词', en: 'Preposition', abbr: 'prep.', group: '虚词' },
  { key: 'conjunction', table: 'dict_conjunction', zh: '连词', en: 'Conjunction', abbr: 'conj.', group: '虚词' },
  { key: 'particle', table: 'dict_particle', zh: '助词', en: 'Particle', abbr: 'part.', group: '虚词' },
  { key: 'interjection', table: 'dict_interjection', zh: '叹词', en: 'Interjection', abbr: 'interj.', group: '虚词' },
  { key: 'onomatopoeia', table: 'dict_onomatopoeia', zh: '拟声词', en: 'Onomatopoeia', abbr: 'ono.', group: '虚词' },
];

const emptyForm = {
  name: '',
  description: '',
  sort_order: 0,
};

function App() {
  const [activeTypeKey, setActiveTypeKey] = useState('noun');
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

  const activeType = wordTypes.find((item) => item.key === activeTypeKey) || wordTypes[0];
  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0] || null,
    [items, selectedId],
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const groupedTypes = useMemo(
    () => ({
      实词: wordTypes.filter((item) => item.group === '实词'),
      虚词: wordTypes.filter((item) => item.group === '虚词'),
    }),
    [],
  );

  async function load(nextPage = page, nextQuery = query, nextTypeKey = activeTypeKey) {
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
      const response = await fetch(`${API_BASE}/api/dict/${nextTypeKey}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`加载失败：HTTP ${response.status}`);
      }
      const data = await response.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
      setSelectedId(data.items?.[0]?.id || null);
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, '', activeTypeKey);
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function switchType(nextTypeKey) {
    setActiveTypeKey(nextTypeKey);
    setQuery('');
    setDraftQuery('');
    setPage(1);
    setSelectedId(null);
    resetForm();
    load(1, '', nextTypeKey);
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
      setError(`${activeType.zh}不能为空`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        editingId
          ? `${API_BASE}/api/dict/${activeTypeKey}/${editingId}`
          : `${API_BASE}/api/dict/${activeTypeKey}`,
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
      await load(page, query, activeTypeKey);
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
      const response = await fetch(`${API_BASE}/api/dict/${activeTypeKey}/${item.id}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) {
        throw new Error(`删除失败：HTTP ${response.status}`);
      }
      if (selectedId === item.id) {
        setSelectedId(null);
      }
      await load(page, query, activeTypeKey);
    } catch (err) {
      setError(err.message || '删除失败');
    }
  }

  async function randomOne() {
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/dict/${activeTypeKey}/random?limit=1`);
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

  function handleRowKeyDown(event, itemId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedId(itemId);
    }
  }

  function search(event) {
    event.preventDefault();
    setQuery(draftQuery);
    setPage(1);
    load(1, draftQuery, activeTypeKey);
  }

  function changePage(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(safePage);
    load(safePage, query, activeTypeKey);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <BookOpen size={30} aria-hidden="true" />
          <div>
            <h1>Maurice Wilkes</h1>
            <p>十二词性词典</p>
          </div>
        </div>

        <nav className="type-nav" aria-label="词性">
          {Object.entries(groupedTypes).map(([groupName, types]) => (
            <section key={groupName}>
              <h2>{groupName}</h2>
              <div className="type-grid">
                {types.map((type) => (
                  <button
                    className={`type-button ${type.key === activeTypeKey ? 'active' : ''}`}
                    key={type.key}
                    onClick={() => switchType(type.key)}
                    type="button"
                  >
                    <strong>{type.zh}</strong>
                    <span>{type.abbr}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <form className="noun-form" onSubmit={submitForm}>
          <div className="form-head">
            <h2>{editingId ? `编辑${activeType.zh}` : `新建${activeType.zh}`}</h2>
            {editingId && (
              <button
                type="button"
                className="icon-button"
                onClick={resetForm}
                title="取消编辑"
                aria-label="取消编辑"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>

          <label>
            <span>名称</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder={placeholderFor(activeType.key)}
              maxLength={255}
            />
          </label>

          <label>
            <span>描述</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="它的意义。它的边界。它怎样进入你的语言。"
              rows={5}
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
          <div className="active-heading">
            <span>{activeType.group}</span>
            <h2>
              {activeType.zh}
              <small>{activeType.en} {activeType.abbr}</small>
            </h2>
          </div>

          <form className="search-box" onSubmit={search}>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              aria-label={`搜索${activeType.zh}或描述`}
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder={`搜索${activeType.zh}或描述`}
            />
            <button type="submit">搜索</button>
          </form>

          <div className="tool-actions">
            <button className="icon-text-button" onClick={() => load(page, query, activeTypeKey)} disabled={loading}>
              <RefreshCw size={18} />
              刷新
            </button>
            <button className="icon-text-button" onClick={randomOne}>
              <Shuffle size={18} />
              随机
            </button>
          </div>
        </header>

        {error && (
          <div className="error-line" role="alert">
            {error}
          </div>
        )}

        <div className="workspace">
          <section className="noun-list" aria-label="词条列表">
            <div className="list-meta">
              <strong>{total}</strong>
              <span>个{activeType.zh}</span>
            </div>

            {loading ? (
              <div className="empty-state is-loading">加载中</div>
            ) : items.length === 0 ? (
              <div className="empty-state">还没有{activeType.zh}</div>
            ) : (
              items.map((item) => (
                <article
                  className={`noun-row ${selected?.id === item.id ? 'active' : ''}`}
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected?.id === item.id}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(event) => handleRowKeyDown(event, item.id)}
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

          <section className="detail-panel" aria-label="词条详情">
            {selected ? (
              <>
                <div className="detail-top">
                  <div>
                    <p>
                      #{selected.random_int} · {activeType.table}
                    </p>
                    <h2>{selected.name}</h2>
                  </div>
                  <div className="detail-actions">
                    <button
                      className="icon-button"
                      onClick={() => startEdit(selected)}
                      title="编辑"
                      aria-label={`编辑${selected.name}`}
                    >
                      <Edit3 size={18} aria-hidden="true" />
                    </button>
                    <button
                      className="icon-button danger"
                      onClick={() => removeItem(selected)}
                      title="删除"
                      aria-label={`删除${selected.name}`}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="description">{selected.description || '没有描述'}</div>
                <dl className="field-grid">
                  <div>
                    <dt>词性</dt>
                    <dd>{activeType.zh} / {activeType.en}</dd>
                  </div>
                  <div>
                    <dt>排序</dt>
                    <dd>{selected.sort_order}</dd>
                  </div>
                  <div>
                    <dt>ID</dt>
                    <dd>{selected.id}</dd>
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
              <div className="empty-state">选择一个词条</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function placeholderFor(typeKey) {
  const examples = {
    noun: '比如：语言、石头、Ada Lovelace',
    verb: '比如：看见、命名、掌握',
    adjective: '比如：清澈、危险、轻',
    numeral: '比如：一、十二、万',
    classifier: '比如：个、条、束',
    pronoun: '比如：我、你、他们',
    adverb: '比如：忽然、也许、已经',
    preposition: '比如：在、从、向',
    conjunction: '比如：和、但是、因为',
    particle: '比如：的、了、着',
    interjection: '比如：啊、唉、嘿',
    onomatopoeia: '比如：哗啦、咚、扑通',
  };
  return examples[typeKey] || '写下一个词';
}

function formatTime(value) {
  const seconds = Number(value);
  if (!seconds) return value || '';
  return new Date(seconds * 1000).toLocaleString('zh-CN', { hour12: false });
}

createRoot(document.getElementById('root')).render(<App />);
