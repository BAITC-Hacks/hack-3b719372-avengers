import React, { useEffect, useRef, useState } from 'react';
import { searchCatalog } from '../catalog';
import { addServerCart, readServerCart } from './cart';
import ProductDetails from './ProductDetails';
import { ACCEPT_ATTACHMENTS, validateAttachment } from './attachment';

export default function ChatWidget({ apiBase }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: apiBase
    ? 'Здравствуйте! Напишите название или артикул — найду товары в каталоге. AI-консультация пока не подключена.'
    : 'Здравствуйте! Это демонстрация виджета EKT. Поиск станет доступен после настройки адреса сервера.' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [preview, setPreview] = useState('');
  const fileInput = useRef(null);
  useEffect(() => {
    if (!attachment || !/\.jpe?g$/i.test(attachment.name)) { setPreview(''); return; }
    const url = URL.createObjectURL(attachment);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);
  const chooseFile = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const issue = validateAttachment(file);
    setAttachmentError(issue);
    if (!issue) setAttachment(file);
  };
  const busy = useRef(false);
  const cartBusy = useRef(false);
  const [pending, setPending] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [adding, setAdding] = useState(false);
  const [cartError, setCartError] = useState('');
  const [cart, setCart] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [readingCart, setReadingCart] = useState(false);
  const cartSequence = useRef(0);
  const loadCart = async () => {
    if (!apiBase) return;
    const sequence = ++cartSequence.current;
    setReadingCart(true);
    setCartError('');
    try {
      const items = await readServerCart(apiBase);
      if (sequence === cartSequence.current) setCart({
        items, items_count: items.reduce((sum, item) => sum + item.quantity, 0),
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      });
    } catch { if (sequence === cartSequence.current) setCartError('Не удалось обновить корзину. Повторите загрузку.'); }
    finally { if (sequence === cartSequence.current) setReadingCart(false); }
  };
  useEffect(() => {
    const update = event => { if (event.detail?.base === apiBase) loadCart(); };
    window.addEventListener('ekt-cart-updated', update);
    return () => { window.removeEventListener('ekt-cart-updated', update); cartSequence.current++; };
  }, [apiBase]);
  const count = Number(quantity);
  const existing = pending && cart ? cart.items.filter(item => String(item.id) === pending.id).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : 0;
  const remaining = pending?.stock == null ? null : Math.max(0, pending.stock - existing);
  const invalidQuantity = !Number.isSafeInteger(count) || count < 1 || remaining !== null && count > remaining;
  const confirmAdd = async () => {
    if (!pending || invalidQuantity || cartBusy.current || readingCart || cartError) return;
    cartBusy.current = true;
    setAdding(true);
    setCartError('');
    try {
      const result = await addServerCart(apiBase, pending.id, count);
      setCart(result);
      setMessages(items => [...items, { role: 'assistant', text: 'Добавлено в серверную демо-корзину: ' + pending.name + ' — ' + count + ' шт. Всего в корзине: ' + result.items_count + ' шт., ' + result.total.toLocaleString('ru-RU') + ' ₸.' }]);
      setPending(null);
    } catch (failure) { setCartError(failure.message); }
    finally { cartBusy.current = false; setAdding(false); }
  };
  const field = useRef(null);
  const launcher = useRef(null);
  const feed = useRef(null);
  useEffect(() => { if (open) field.current?.focus(); }, [open]);
  useEffect(() => {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [messages, loading, open, error]);
  const close = () => { setOpen(false); launcher.current?.focus(); };
  const send = async (event, retry = false) => {
    event.preventDefault();
    const query = retry ? lastQuery : input.trim();
    if (!query || busy.current || attachment) return;
    setError('');
    setLastQuery(query);
    if (!retry) {
      setMessages(items => [...items, { role: 'user', text: query }]);
      setInput('');
    }
    if (!apiBase) {
      setMessages(items => [...items, { role: 'assistant', text: 'Это деморежим. Для поиска реальных товаров укажите адрес backend при подключении виджета.' }]);
      return;
    }
    busy.current = true;
    setLoading(true);
    try {
      const products = await searchCatalog(apiBase, query);
      setMessages(items => [...items, { role: 'assistant',
        text: products.length ? 'Результаты поиска по каталогу:' : 'Ничего не найдено. Попробуйте точный артикул или более короткое название.',
        products }]);
    } catch (failure) { setError(failure.message); }
    finally { busy.current = false; setLoading(false); }
  };
  return <>
    {open && <section className="window" role="region" aria-label="Консультант EKT" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
      <header><div className="mark" aria-hidden="true">✦</div><div><h2>EKT · Помощник</h2><p>{apiBase ? 'Поиск по каталогу' : 'Демонстрационный режим'}</p></div><button className="close" aria-label="Закрыть чат" onClick={close}>×</button></header>
      <nav className="widget-tabs"><button aria-pressed={!showCart} onClick={() => setShowCart(false)}>Чат</button><button aria-pressed={showCart} onClick={() => { setShowCart(true); loadCart(); }}>Корзина{cart ? ' · ' + cart.items_count : ''}</button></nav>
      {showCart && <div className="widget-cart">
        <h3>Серверная корзина</h3>
        <button disabled={readingCart || !apiBase} onClick={loadCart}>Обновить</button>
        {readingCart && <p role="status">Загружаем…</p>}
        {cartError && <p role="alert">{cartError}</p>}
        {!apiBase && <p>Настройте адрес backend для просмотра корзины.</p>}
        {cart && <>{cart.items.length ? cart.items.map(item => <article key={item.id}><strong>{item.name}</strong><p>{item.quantity} шт. × {item.price.toLocaleString('ru-RU')} ₸</p><b>{(item.price * item.quantity).toLocaleString('ru-RU')} ₸</b></article>) : <p>Корзина пуста.</p>}<h4>Итого: {cart.total.toLocaleString('ru-RU')} ₸</h4></>}
        <small>Общая демо-корзина сервера. Ссылка на оформление пока не предоставлена.</small>
      </div>}
      <div className="chat-content" hidden={showCart}>
      <div className="feed" ref={feed} role="log" aria-live="polite" aria-relevant="additions" aria-label="Сообщения">
        {messages.map((message, index) => <div key={index} className={'message ' + message.role}>
          <p>{message.text}</p>
          {message.products?.map(product => <article key={product.id}>
            <strong>{product.name}</strong>
            {product.sku && <small>Артикул: {product.sku}</small>}
            <small>{product.stock !== null ? 'Остаток: ' + product.stock : product.available ? 'В наличии' : 'Наличие не подтверждено'}</small>
            <b>{product.price === null ? 'Цена уточняется' : product.price.toLocaleString('ru-RU') + ' ₸'}</b>
            <ProductDetails product={product} />
            <button className="add" disabled={!product.available || !/^\d+$/.test(product.id) || adding} onClick={() => { setPending(product); setQuantity('1'); loadCart(); }}>В корзину</button>
          </article>)}
        </div>)}
        {loading && <p className="muted" role="status">Ищем товары…</p>}
      </div>
      {pending && <div className="confirmation" role="region" aria-label="Подтверждение добавления">
        <strong>Добавить: {pending.name}?</strong>
        <label>Количество <input type="number" min="1" max={remaining ?? undefined} step="1" value={quantity} disabled={adding} onChange={event => setQuantity(event.target.value)} /></label>
        <small>{remaining === null ? 'Остаток проверит сервер' : 'Можно добавить по текущим данным: ' + remaining}</small>
        {invalidQuantity && <p role="status">Укажите целое количество от 1{remaining !== null ? ' до ' + remaining : ''}.</p>}
        {readingCart && <p role="status">Проверяем содержимое корзины…</p>}
        <div><button disabled={adding || invalidQuantity || readingCart || !!cartError} onClick={confirmAdd}>{adding ? 'Добавляем…' : 'Да, добавить'}</button><button disabled={adding} onClick={() => { setPending(null); setCartError(''); }}>Отмена</button></div>
        {cartError && <button disabled={readingCart} onClick={loadCart}>Обновить корзину</button>}
        {cartError && <p role="alert">{cartError}</p>}
        <small>Это общая демо-корзина сервера, не оформление заказа на ekt.kz.</small>
      </div>}
      {error && <div className="error" role="alert">{error}<button disabled={loading} onClick={event => send(event, true)}>Повторить поиск</button></div>}
      <div className="attachment-area">
        <input className="sr-only" tabIndex={-1} aria-label="Выбрать вложение" type="file" accept={ACCEPT_ATTACHMENTS} ref={fileInput} onChange={chooseFile} />
        {attachment && <div className="attachment-preview">
          {preview && <img src={preview} alt="Предпросмотр вложения" onError={() => setPreview('')} />}
          <div><strong>{attachment.name}</strong><small>{(attachment.size / 1024 / 1024).toFixed(2)} МБ · не отправлен</small></div>
          <button aria-label="Удалить вложение" onClick={() => { setAttachment(null); setAttachmentError(''); }}>×</button>
        </div>}
        {attachment && <p role="status">Загрузка файлов ещё не подключена. Удалите вложение, чтобы отправить текст.</p>}
        {attachmentError && <p role="alert">{attachmentError}</p>}
      </div>
      <form onSubmit={send}><button className="attach-button" title="JPEG, PDF, Excel, Word — до 10 МБ" type="button" aria-label="Прикрепить файл" disabled={loading} onClick={() => fileInput.current?.click()}>＋</button><label className="sr-only" htmlFor="message">Название или артикул</label><input id="message" ref={field} value={input} onChange={event => setInput(event.target.value)} maxLength={4000} placeholder="Название или артикул" autoComplete="off" /><button disabled={loading || !input.trim() || !!attachment} aria-label="Отправить сообщение" type="submit">↑</button></form>
      <footer>Поиск по каталогу · серверная демо-корзина</footer>
      </div>
    </section>}
    <button ref={launcher} className="launcher" aria-expanded={open} aria-label={open ? 'Закрыть чат EKT' : 'Открыть чат EKT'} onClick={() => open ? close() : setOpen(true)}><span aria-hidden="true">✦</span> Помощник EKT</button>
  </>;
}
