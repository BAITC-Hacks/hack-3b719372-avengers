import React from 'react';
const labels = {
  TORGOVAYA_MARKA: 'Производитель', OBYEM: 'Тип товара',
  KOLICHESTVO_POLYUSOV: 'Количество полюсов', NOMINALNYY_TOK: 'Номинальный ток',
  NOMINALNOE_NAPRYAZHENIE: 'Напряжение',
  NOMINALNAYA_OTKLYUCHAYUSHCHAYA_SPOSOBNOST: 'Отключающая способность',
  TIP_USTANOVKI: 'Монтаж', KRATNOST_MIN: 'Минимальная кратность',
};
export default function ProductDetails({ product }) {
  const properties = Object.entries(labels).filter(([key]) => ['string', 'number'].includes(typeof product.properties?.[key]));
  const namedCurrent = product.name.match(/\b(\d+)\s*[АA](?=\s|$)/)?.[1];
  const propertyCurrent = String(product.properties?.NOMINALNYY_TOK || '').match(/(\d+)\s*[АA]/)?.[1];
  return <details className="product-details">
    <summary>Характеристики и склады</summary>
    {namedCurrent && propertyCurrent && namedCurrent !== propertyCurrent && <p className="data-warning">Данные каталога расходятся: в названии {namedCurrent} А, в характеристиках {propertyCurrent} А. Уточните параметр у менеджера.</p>}
    {product.description && <p>{product.description}</p>}
    {properties.length ? <dl>{properties.map(([key, label]) => <React.Fragment key={key}><dt>{label}</dt><dd>{product.properties[key]}</dd></React.Fragment>)}</dl> : <p>Характеристики не предоставлены.</p>}
    {!!product.stores?.length && <><h4>Остатки по складам</h4><ul>{product.stores.filter(store => Number(store.quantity) > 0).map((store, index) => <li key={index}>{store.name}: {store.quantity} шт.</li>)}</ul></>}
    {product.url && <a href={product.url} target="_blank" rel="noopener noreferrer">Страница товара на сайте ↗</a>}
    <small>Сертификат в ответе API не предоставлен.</small>
  </details>;
}
