import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Bot, Send, ShoppingCart, Sparkles, Plus, Minus, Trash2, Package, X } from 'lucide-react';
import './styles.css';
import './improvements.css';
import './store.css';
import { apiUrl, requestChat, validProduct } from './api';

import { searchCatalog } from './catalog';
import ProductDetails from './widget/ProductDetails';
import { addServerCart, readServerCart } from './widget/cart';

const cartKey = `ekt-cart:${apiUrl || 'demo'}`;
function readCart() {
  try {
    const items = JSON.parse(localStorage.getItem(cartKey) || '[]');
    return Array.isArray(items) ? items.filter(item => validProduct(item) && Number.isInteger(item.quantity) && item.quantity > 0) : [];
  } catch { return []; }
}
function getSession() {
  try {
    const id = sessionStorage.getItem('ekt-session') || crypto.randomUUID();
    sessionStorage.setItem('ekt-session', id);
    return id;
  } catch { return crypto.randomUUID(); }
}

const demoProducts = [
  { id: '123', name: 'Автоматический выключатель Schneider Easy9 16A', sku: 'EZ9F34216', price: 2500, available: true, image: '⚡' },
  { id: '124', name: 'Автоматический выключатель IEK BA47-29 16A', sku: 'MVA20-1-016-C', price: 890, available: true, image: '🔌' },
  { id: '125', name: 'Дифференциальный автомат ABB 16A', sku: 'DS201 C16', price: 12400, available: false, image: '🛡️' },
];

const money = (value) => value === null ? 'Цена уточняется' : `${value.toLocaleString('ru-RU')} ₸`;

function ProductImage({ product }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.image]);
  if (typeof product.image === 'string' && /^https?:\/\//.test(product.image) && !failed) {
    return <img src={product.image} alt={product.name} loading="lazy" onError={() => setFailed(true)} />;
  }
  return <Package size={38} aria-label="Фото товара отсутствует" />;
}

function App() {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Здравствуйте! Я помогу подобрать электротехнические товары. Что вы ищете?' }]);
  const [input, setInput] = useState('');
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);
  const searchBusy = useRef(false);
  const handleSearch = async event => {
    event.preventDefault();
    if (!query.trim() || searchBusy.current || busy.current) return;
    searchBusy.current = true;
    setSearching(true);
    setSearchError('');
    setProducts([]);
    setSearched(true);
    try {
      const found = apiUrl ? await searchCatalog(apiUrl, query) : demoProducts.filter(product => (product.name + ' ' + product.sku).toLowerCase().includes(query.trim().toLowerCase()));
      setProducts(found);
    } catch (failure) { setSearchError(failure.message); }
    finally { searchBusy.current = false; setSearching(false); }
  };
  const [cart, setCart] = useState(() => apiUrl ? [] : readCart());
  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const addingGuard = useRef(false);
  const cartRequest = useRef(0);
  const refreshCart = async () => {
    if (!apiUrl) return;
    const request = ++cartRequest.current;
    setCartLoading(true);
    setCartError('');
    try {
      const items = await readServerCart(apiUrl);
      if (request === cartRequest.current) setCart(items);
    } catch { if (request === cartRequest.current) setCartError('Не удалось обновить корзину. Отображаемые данные могут быть устаревшими.'); }
    finally { if (request === cartRequest.current) setCartLoading(false); }
  };
  useEffect(() => {
    refreshCart();
    const updated = event => { if (event.detail?.base === apiUrl) refreshCart(); };
    window.addEventListener('ekt-cart-updated', updated);
    return () => { window.removeEventListener('ekt-cart-updated', updated); cartRequest.current++; };
  }, []);
  useEffect(() => { if (cartOpen) refreshCart(); }, [cartOpen]);
  const cartDialog = useRef(null);
  const [sort, setSort] = useState('default');
  const [availableOnly, setAvailableOnly] = useState(false);
  const visibleProducts = products.filter(product => !availableOnly || product.available)
    .sort((a, b) => a.price === null ? (b.price === null ? 0 : 1) : b.price === null ? -1 : sort === 'ascending' ? a.price - b.price : sort === 'descending' ? b.price - a.price : 0);
  useEffect(() => {
    if (cartOpen) cartDialog.current?.showModal();
    else cartDialog.current?.close();
    if (!cartOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [cartOpen]);

  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [lastRequest, setLastRequest] = useState('');
  const [sessionId] = useState(getSession);
  const busy = useRef(false);
  const messageList = useRef(null);
  const confirmDialog = useRef(null);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (apiUrl) return;
    try { localStorage.setItem(cartKey, JSON.stringify(cart)); setStorageError(''); }
    catch { setStorageError('Браузер не разрешил сохранить корзину. Она доступна до обновления страницы.'); }
  }, [cart]);
  useEffect(() => {
    messageList.current?.scrollTo({ top: messageList.current.scrollHeight });
  }, [messages, loading]);
  useEffect(() => {
    if (pendingProduct) confirmDialog.current?.showModal();
    else confirmDialog.current?.close();
  }, [pendingProduct]);
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') setCartOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const sendMessage = async (event, retry = false) => {
    event?.preventDefault();
    const message = retry ? lastRequest : input.trim();
    if (!message || busy.current || searchBusy.current) return;
    busy.current = true;
    if (!retry) {
      setInput('');
      setMessages(items => [...items, { role: 'user', text: message }]);
    }
    setLastRequest(message);
    setError('');
    setSearchError('');
    setSearched(false);
    setLoading(true);
    try {
      let data;
      if (apiUrl) data = await requestChat(message, sessionId);
      else {
        await new Promise(resolve => setTimeout(resolve, 650));
        data = { message: 'Демонстрация: показываю тестовые товары. Реальный подбор появится после подключения сервера.', products: demoProducts };
      }
      setMessages(items => [...items, { role: 'assistant', text: data.message }]);
      setProducts(data.products);
    } catch (failure) { setError(failure.message || 'Не удалось получить ответ.'); }
    finally { busy.current = false; setLoading(false); }
  };

  const addToCart = async (product) => {
    if (!product.available || product.price === null) return;
    if (apiUrl) {
      if (addingGuard.current) return;
      addingGuard.current = true;
      setAddingToCart(true);
      try {
        await addServerCart(apiUrl, product.id, 1);
        setPendingProduct(null);
        setNotice('Товар добавлен в серверную корзину.');
      } catch (failure) { setNotice(failure.message); }
      finally { addingGuard.current = false; setAddingToCart(false); }
      return;
    }
    setPendingProduct(null);
    setNotice(`Добавлено: ${product.name}`);
    setCart((items) => {
      const existing = items.find((item) => item.id === product.id);
      return existing ? items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...product, quantity: 1 }];
    });
  };
  const changeQuantity = (id, delta) => setCart((items) => items.map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  const removeFromCart = (id) => setCart((items) => items.filter((item) => item.id !== id));
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const chooseCategory = (name) => {
    setInput('Помоги подобрать: ' + name);
    document.getElementById('assistant').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.querySelector('.composer input')?.focus({ preventScroll: true });
  };
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Sparkles size={18} /></div><div><strong>EKT<span>AI</span></strong><small>Умный помощник по товарам</small></div></div><button className="cart-trigger" onClick={() => setCartOpen(true)}><ShoppingCart size={19} /> Корзина <b>{cartCount}</b></button></header>
    <div className="service-strip">Электротехника для ваших идей. <a href="#assistant">Подберите с AI-консультантом ↗</a></div>
    <section className="store-intro">
      <div className="hero-heading"><h1>Магазин.<br /><span>Всё начинается<br />с правильного выбора.</span></h1><div className="hero-help"><div className="help-icon"><Bot size={26} /></div><strong>Нужна помощь<br />с подбором?</strong><a href="#assistant">Спросить AI-консультанта ↗</a></div></div>
      <div className="categories" aria-label="Категории товаров">{['Автоматы', 'Кабели', 'Розетки', 'Освещение', 'Щиты', 'Инструменты'].map((name, index) => <button onClick={() => chooseCategory(name)} key={name}><div className={'category-art art-' + index}><div /></div><span>{name}</span></button>)}</div>
      <h2 className="section-title">Хороший выбор. <span>Для каждой вашей задачи.</span></h2>
      <div className="feature-grid">
        <button className="feature feature-dark" onClick={() => chooseCategory('автоматические выключатели')}><span className="feature-kicker">НАДЁЖНОСТЬ В ДЕТАЛЯХ</span><h3>Под контролем.<br />Каждая линия.</h3><p>Автоматические выключатели</p><div className="breaker-art" aria-hidden="true"><div className="breaker-top">EKT <small>16A</small></div><div className="breaker-switch" /><div className="breaker-bottom">C16 <span>230V~</span></div></div><span className="feature-arrow">↗</span></button>
        <button className="feature feature-blue" onClick={() => chooseCategory('освещение')}><span className="feature-kicker">БОЛЬШЕ СВЕТА</span><h3>Идеи, которые<br />освещают дом.</h3><p>Освещение для вашего пространства</p><div className="lamp-art" aria-hidden="true"><div /><i /></div><span className="feature-arrow">↗</span></button>
        <button className="feature feature-white" onClick={() => chooseCategory('розетки и выключатели')}><span className="feature-kicker">ПРОСТО. КРАСИВО.</span><h3>Всё на своём<br />месте.</h3><p>Розетки и выключатели</p><div className="socket-art" aria-hidden="true"><div><i /><i /></div></div><span className="feature-arrow">↗</span></button>
      </div>
    </section>
    <div className="assistant-title"><h2 className="section-title">Ваш консультант. <span>Сложный выбор — простой разговор.</span></h2></div>
    <main className="workspace" id="assistant">
      <section className="chat-panel">
        <div className="panel-heading"><div className="bot-avatar"><Bot size={21} /></div><div><h2>AI-консультант</h2><p><i /> {apiUrl ? 'Адрес сервера настроен' : 'Деморежим · тестовые товары'}</p></div></div>
        <div className="messages" ref={messageList} role="log" aria-label="История сообщений" aria-live="polite">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={index}><div className="message-avatar">{message.role === 'assistant' ? <Bot size={16} /> : 'Вы'}</div><div className="bubble">{message.text}</div></div>)}{loading && <div className="message-row assistant"><div className="message-avatar"><Bot size={16} /></div><div className="bubble typing"><span /><span /><span /></div></div>}{products.length > 0 && <div className="result-note">Результаты поиска</div>}</div>
        {error && <div className="feedback" role="alert">{error}<button disabled={loading} onClick={(event) => sendMessage(event, true)}>Повторить</button></div>}
        <form className="composer" onSubmit={sendMessage}><input aria-label="Сообщение консультанту" maxLength={4000} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Например: Найди автомат на 16 А" /><button aria-label="Отправить" disabled={loading || searching || !input.trim()} type="submit"><Send size={18} /></button></form>
        <div className="suggestions"><button onClick={() => setInput('Найди автомат на 16 А')}>Автомат на 16 А</button><button onClick={() => setInput('Подбери аналог дешевле')}>Аналог дешевле</button></div>
      </section>
      <section className="catalog-panel"><div className="catalog-heading"><div><p className="eyebrow">КАТАЛОГ</p><h2>{products.length ? 'Подходящие товары' : 'Рекомендации появятся здесь'}</h2></div><Package size={25} /></div>
      <form className="catalog-search" onSubmit={handleSearch}><label htmlFor="catalog-query">Поиск по названию или артикулу</label><div><input id="catalog-query" value={query} maxLength={300} onChange={event => setQuery(event.target.value)} placeholder="Например: 16А или EZ9F34216" /><button disabled={!query.trim() || searching || loading}>{searching ? 'Ищем…' : 'Найти'}</button></div><small>{apiUrl ? 'Поиск в каталоге через сервер команды' : 'Демопоиск по трём тестовым товарам'}</small></form>
      {searchError && <p className="feedback" role="alert">{searchError} Нажмите «Найти», чтобы повторить.</p>}
      {searching && <p role="status">Ищем товары…</p>}
      {products.length > 0 && <div className="catalog-controls"><label><input type="checkbox" checked={availableOnly} onChange={event => setAvailableOnly(event.target.checked)} /> Только в наличии</label><label><span className="sr-only">Сортировка товаров</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="default">По рекомендации</option><option value="ascending">Сначала дешевле</option><option value="descending">Сначала дороже</option></select></label><small role="status">Показано: {visibleProducts.length} из {products.length}</small></div>}
      {products.length && !visibleProducts.length ? <p className="filter-empty">Нет товаров в наличии. <button onClick={() => setAvailableOnly(false)}>Показать все</button></p> : null}
      {products.length ? <div className="product-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id}><div className="product-image"><ProductImage product={product} /></div><div className="product-info"><span className={product.available ? 'stock' : 'stock unavailable'}>{product.available === null ? 'Наличие уточняется' : product.available ? (product.stock != null ? `В наличии: ${product.stock} шт.` : 'В наличии') : 'Нет в наличии'}</span><h3>{product.name}</h3>{product.sku && <p className="sku">Арт. {product.sku}</p>}<ProductDetails product={product} /><div className="product-footer"><strong>{money(product.price)}</strong><button disabled={!product.available || product.price === null} onClick={() => setPendingProduct(product)}><Plus size={16} /> В корзину</button></div></div></article>)}</div> : <div className="empty-catalog"><div className="empty-icon"><Sparkles size={24} /></div><h3>{searching ? 'Поиск в каталоге' : searchError ? 'Поиск не завершён' : searched ? 'Ничего не найдено' : 'Найдём нужный товар'}</h3><p>{searched ? 'Попробуйте другой артикул или более короткое название.' : 'Введите название или артикул в поиске выше.'}</p></div>}</section>
    </main>
    <dialog ref={cartDialog} className="cart-modal" aria-labelledby="cart-title" onCancel={() => setCartOpen(false)} onClose={() => setCartOpen(false)} onClick={event => { if (event.target === event.currentTarget) setCartOpen(false); }}><aside className="cart-drawer"><div className="drawer-heading"><div><p className="eyebrow">ВАШ ЗАКАЗ</p><h2 id="cart-title">Корзина <span>{cartCount}</span></h2></div><button aria-label="Закрыть корзину" className="icon-button" onClick={() => setCartOpen(false)}><X size={20} /></button></div>{cartLoading && <p role="status">Обновляем корзину…</p>}{cartError && <p role="alert">{cartError} <button onClick={refreshCart}>Повторить</button></p>}{apiUrl && <p className="checkout-note">Общая серверная демо-корзина. Изменение количества и удаление здесь пока недоступны.</p>}{cart.length ? <div><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-item-icon"><ProductImage product={item} /></div><div className="cart-item-main"><h3>{item.name}</h3><strong>{money(item.price)}</strong><div className="quantity"><button disabled={!!apiUrl} aria-label="Уменьшить количество" onClick={() => changeQuantity(item.id, -1)}>{item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}</button><span>{item.quantity}</span><button disabled={!!apiUrl} aria-label="Увеличить количество" onClick={() => changeQuantity(item.id, 1)}><Plus size={14} /></button></div></div><button disabled={!!apiUrl} aria-label="Удалить товар" className="remove" onClick={() => removeFromCart(item.id)}><Trash2 size={16} /></button></div>)}</div><div className="cart-total"><span>Итого</span><strong>{money(total)}</strong></div><p className="checkout-note">{apiUrl ? 'Содержимое получено из backend. Оформление заказа пока недоступно.' : 'Корзина сохранена в этом браузере.'}</p><button className="checkout" onClick={() => setCartOpen(false)}>Продолжить подбор</button></div> : <div className="empty-cart"><ShoppingCart size={32} /><p>Корзина пока пуста</p><span>Добавьте товар из результатов поиска</span></div>}</aside></dialog>
    {storageError && <p className="feedback" role="alert">{storageError}</p>}
    <p className="notice" role="status">{notice}</p>
    <dialog ref={confirmDialog} className="confirm-dialog" onCancel={() => setPendingProduct(null)} onClose={() => setPendingProduct(null)} aria-labelledby="confirm-title">
      <h2 id="confirm-title">Добавить в корзину?</h2>
      <p>{pendingProduct?.name}</p>
      <strong>{pendingProduct ? money(pendingProduct.price) : ''} · 1 шт.</strong>
      <div className="confirm-actions">
        <button autoFocus onClick={() => setPendingProduct(null)}>Отмена</button>
        <button disabled={addingToCart} onClick={() => pendingProduct && addToCart(pendingProduct)}>{addingToCart ? 'Добавляем…' : 'Подтвердить добавление'}</button>
      </div>
    </dialog>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
import { mountWidget } from './widget/entry';
mountWidget({ apiBase: apiUrl });
