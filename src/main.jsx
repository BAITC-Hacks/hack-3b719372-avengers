import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Bot, Send, ShoppingCart, Sparkles, Plus, Minus, Trash2, Package, X } from 'lucide-react';
import './styles.css';
import './improvements.css';
import './store.css';
import { apiUrl, requestChat, validProduct } from './api';

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

const money = (value) => `${value.toLocaleString('ru-RU')} ₸`;

function App() {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Здравствуйте! Я помогу подобрать электротехнические товары. Что вы ищете?' }]);
  const [input, setInput] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(readCart);
  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

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
    if (!message || busy.current) return;
    busy.current = true;
    if (!retry) {
      setInput('');
      setMessages(items => [...items, { role: 'user', text: message }]);
    }
    setLastRequest(message);
    setError('');
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

  const addToCart = (product) => {
    if (!product.available) return;
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
        <div className="panel-heading"><div className="bot-avatar"><Bot size={21} /></div><div><h2>AI-консультант</h2><p><i /> {apiUrl ? 'Подключён сервер' : 'Деморежим · тестовые товары'}</p></div></div>
        <div className="messages" ref={messageList} role="log" aria-label="История сообщений" aria-live="polite">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={index}><div className="message-avatar">{message.role === 'assistant' ? <Bot size={16} /> : 'Вы'}</div><div className="bubble">{message.text}</div></div>)}{loading && <div className="message-row assistant"><div className="message-avatar"><Bot size={16} /></div><div className="bubble typing"><span /><span /><span /></div></div>}{products.length > 0 && <div className="result-note">Результаты поиска</div>}</div>
        {error && <div className="feedback" role="alert">{error}<button disabled={loading} onClick={(event) => sendMessage(event, true)}>Повторить</button></div>}
        <form className="composer" onSubmit={sendMessage}><input aria-label="Сообщение консультанту" maxLength={4000} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Например: Найди автомат на 16 А" /><button aria-label="Отправить" disabled={loading || !input.trim()} type="submit"><Send size={18} /></button></form>
        <div className="suggestions"><button onClick={() => setInput('Найди автомат на 16 А')}>Автомат на 16 А</button><button onClick={() => setInput('Подбери аналог дешевле')}>Аналог дешевле</button></div>
      </section>
      <section className="catalog-panel"><div className="catalog-heading"><div><p className="eyebrow">КАТАЛОГ</p><h2>{products.length ? 'Подходящие товары' : 'Рекомендации появятся здесь'}</h2></div><Package size={25} /></div>{products.length ? <div className="product-grid">{products.map((product) => <article className="product-card" key={product.id}><div className="product-image">{product.image && !/^https?:/.test(product.image) ? product.image : <Package size={40} />}</div><div className="product-info"><span className={product.available ? 'stock' : 'stock unavailable'}>{product.available ? 'В наличии' : 'Нет в наличии'}</span><h3>{product.name}</h3><p className="sku">Арт. {product.sku}</p><div className="product-footer"><strong>{money(product.price)}</strong><button disabled={!product.available} onClick={() => setPendingProduct(product)}><Plus size={16} /> В корзину</button></div></div></article>)}</div> : <div className="empty-catalog"><div className="empty-icon"><Sparkles size={24} /></div><h3>Найдём нужный товар</h3><p>Опишите задачу в чате слева — AI подберёт товары из каталога и покажет цены.</p></div>}</section>
    </main>
    {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-heading"><div><p className="eyebrow">ВАШ ЗАКАЗ</p><h2>Корзина <span>{cartCount}</span></h2></div><button aria-label="Закрыть корзину" className="icon-button" onClick={() => setCartOpen(false)}><X size={20} /></button></div>{cart.length ? <div><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-item-icon">{item.image}</div><div className="cart-item-main"><h3>{item.name}</h3><strong>{money(item.price)}</strong><div className="quantity"><button aria-label="Уменьшить количество" onClick={() => changeQuantity(item.id, -1)}>{item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}</button><span>{item.quantity}</span><button aria-label="Увеличить количество" onClick={() => changeQuantity(item.id, 1)}><Plus size={14} /></button></div></div><button aria-label="Удалить товар" className="remove" onClick={() => removeFromCart(item.id)}><Trash2 size={16} /></button></div>)}</div><div className="cart-total"><span>Итого</span><strong>{money(total)}</strong></div><p className="checkout-note">Корзина сохранена в этом браузере. Оформление заказа станет доступно после подключения сервиса заказов.</p><button className="checkout" onClick={() => setCartOpen(false)}>Продолжить подбор</button></div> : <div className="empty-cart"><ShoppingCart size={32} /><p>Корзина пока пуста</p><span>Добавьте товар из результатов поиска</span></div>}</aside></div>}
    {storageError && <p className="feedback" role="alert">{storageError}</p>}
    <p className="notice" role="status">{notice}</p>
    <dialog ref={confirmDialog} className="confirm-dialog" onCancel={() => setPendingProduct(null)} onClose={() => setPendingProduct(null)} aria-labelledby="confirm-title">
      <h2 id="confirm-title">Добавить в корзину?</h2>
      <p>{pendingProduct?.name}</p>
      <strong>{pendingProduct ? money(pendingProduct.price) : ''} · 1 шт.</strong>
      <div className="confirm-actions">
        <button autoFocus onClick={() => setPendingProduct(null)}>Отмена</button>
        <button onClick={() => pendingProduct && addToCart(pendingProduct)}>Подтвердить добавление</button>
      </div>
    </dialog>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
