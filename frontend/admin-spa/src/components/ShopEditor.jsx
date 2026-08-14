import { useEffect, useMemo, useRef, useState } from 'react';
import { adminApi } from '../lib/api';

const EMPTY_CATEGORY = { name: '', order: 0, active: true };
const EMPTY_PRODUCT = {
  name: '', description: '', categoryId: '', room: '', affiliateUrl: '', imageUrl: '', favorite: false, active: true,
};

export default function ShopEditor({ propertyId, propertyName, propertyDomain }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [sourceImageUrl, setSourceImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getShop(propertyId);
      setCategories(data.categories || []);
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [propertyId]);

  const categoryNames = useMemo(
    () => Object.fromEntries(categories.map(category => [category.categoryId, category.name])),
    [categories]
  );

  function newProduct() {
    setSourceImageUrl('');
    setEditingProduct({ ...EMPTY_PRODUCT, categoryId: categories.find(category => category.active)?.categoryId || categories[0]?.categoryId || '' });
  }

  async function saveCategory(event) {
    event.preventDefault();
    const categoryId = editingCategory.categoryId || makeId(editingCategory.name);
    await performSave(async () => {
      await adminApi.upsertShopCategory(propertyId, categoryId, editingCategory);
      setEditingCategory(null);
    });
  }

  async function saveProduct(event) {
    event.preventDefault();
    const productId = editingProduct.productId || makeId(editingProduct.name);
    await performSave(async () => {
      await adminApi.upsertShopProduct(propertyId, productId, editingProduct);
      setEditingProduct(null);
      setSourceImageUrl('');
    });
  }

  async function performSave(action) {
    setSaving(true);
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(category) {
    if (!window.confirm(`Delete the “${category.name}” category?`)) return;
    await performSave(() => adminApi.deleteShopCategory(propertyId, category.categoryId));
  }

  async function removeProduct(product) {
    if (!window.confirm(`Delete “${product.name}”?`)) return;
    await performSave(() => adminApi.deleteShopProduct(propertyId, product.productId));
  }

  async function uploadImage(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Choose a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Images must be 8 MB or smaller.');
      return;
    }
    setImageBusy(true);
    setError('');
    try {
      const { uploadUrl, fileUrl } = await adminApi.signUpload(propertyId, `shop_${file.name}`, file.type);
      await adminApi.uploadFile(uploadUrl, file);
      setEditingProduct(current => ({ ...current, imageUrl: fileUrl }));
    } catch (err) {
      setError(err.message);
    } finally {
      setImageBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function importImage() {
    if (!sourceImageUrl.trim()) return;
    setImageBusy(true);
    setError('');
    try {
      const { imageUrl } = await adminApi.importShopImage(propertyId, sourceImageUrl.trim());
      setEditingProduct(current => ({ ...current, imageUrl }));
      setSourceImageUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setImageBusy(false);
    }
  }

  const publicHost = propertyDomain?.startsWith('www.') ? propertyDomain : `www.${propertyDomain || 'staytheoverhang.com'}`;
  const publicUrl = `https://${publicHost}/shop-your-stay/`;

  return <div className="shop-admin">
    <div className="admin-editor-intro">
      <div><h2>Shop Your Stay</h2><p>Curate the products guests can discover at {propertyName}.</p></div>
      <a className="shop-admin__public-link" href={publicUrl} target="_blank" rel="noreferrer">View public shop ↗</a>
    </div>

    <div className="shop-admin__notice">
      <strong>One catalog, one permanent QR destination.</strong>
      <span>Products appear directly on cards. Inactive products and products in inactive categories stay private.</span>
    </div>
    {error && <div className="shop-admin__error" role="alert">{error}</div>}

    <section className="shop-admin__section">
      <div className="shop-admin__section-heading">
        <div><small>Filters and groups</small><h3>Categories</h3></div>
        <button className="shop-button shop-button--secondary" type="button" onClick={() => setEditingCategory({ ...EMPTY_CATEGORY })}>Add category</button>
      </div>
      {loading ? <p className="shop-admin__empty">Loading categories…</p> : categories.length === 0 ?
        <p className="shop-admin__empty">Add a category before creating products.</p> :
        <div className="shop-category-list">{categories.map(category =>
          <article className={`shop-category-row ${category.active ? '' : 'is-inactive'}`} key={category.categoryId}>
            <span className="shop-category-row__order">{category.order}</span>
            <div><strong>{category.name}</strong><small>{category.active ? 'Visible' : 'Inactive'} · {products.filter(product => product.categoryId === category.categoryId).length} products</small></div>
            <button type="button" onClick={() => setEditingCategory({ ...category })}>Edit</button>
            <button type="button" className="is-danger" onClick={() => removeCategory(category)}>Delete</button>
          </article>
        )}</div>}
    </section>

    <section className="shop-admin__section">
      <div className="shop-admin__section-heading">
        <div><small>Guest catalog</small><h3>Products</h3></div>
        <button className="shop-button" type="button" disabled={!categories.length} onClick={newProduct}>Add product</button>
      </div>
      {loading ? <p className="shop-admin__empty">Loading products…</p> : products.length === 0 ?
        <p className="shop-admin__empty">No products yet. Add the first item guests always ask about.</p> :
        <div className="shop-product-admin-grid">{products.map(product =>
          <article className={`shop-product-admin-card ${product.active ? '' : 'is-inactive'}`} key={product.productId}>
            <div className="shop-product-admin-card__image"><img src={product.imageUrl} alt="" /></div>
            <div className="shop-product-admin-card__body">
              <div className="shop-product-admin-card__badges">{product.favorite && <span>Favorite</span>} {!product.active && <span>Inactive</span>}</div>
              <small>{categoryNames[product.categoryId] || 'Uncategorized'}{product.room ? ` · ${product.room}` : ''}</small>
              <h4>{product.name}</h4>
              <p>{product.description}</p>
              <div><button type="button" onClick={() => { setSourceImageUrl(''); setEditingProduct({ ...product }); }}>Edit</button><button type="button" className="is-danger" onClick={() => removeProduct(product)}>Delete</button></div>
            </div>
          </article>
        )}</div>}
    </section>

    {editingCategory && <div className="shop-modal" role="dialog" aria-modal="true" aria-labelledby="category-editor-title">
      <form className="shop-modal__panel shop-modal__panel--small" onSubmit={saveCategory}>
        <div className="shop-modal__heading"><div><small>Shop organization</small><h3 id="category-editor-title">{editingCategory.categoryId ? 'Edit category' : 'New category'}</h3></div><button type="button" aria-label="Close" onClick={() => setEditingCategory(null)}>×</button></div>
        <label className="shop-field"><span>Category name</span><input required maxLength="100" value={editingCategory.name} onChange={event => setEditingCategory({ ...editingCategory, name: event.target.value })} /></label>
        <label className="shop-field"><span>Display order</span><small>Lower numbers appear first.</small><input required type="number" min="0" max="9999" value={editingCategory.order} onChange={event => setEditingCategory({ ...editingCategory, order: event.target.value })} /></label>
        <Toggle label="Active" hint="Inactive categories and their products are hidden from guests." checked={editingCategory.active} onChange={active => setEditingCategory({ ...editingCategory, active })} />
        <div className="shop-modal__actions"><button type="button" className="shop-button shop-button--secondary" onClick={() => setEditingCategory(null)}>Cancel</button><button className="shop-button" disabled={saving}>Save category</button></div>
      </form>
    </div>}

    {editingProduct && <div className="shop-modal" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
      <form className="shop-modal__panel" onSubmit={saveProduct}>
        <div className="shop-modal__heading"><div><small>Guest catalog</small><h3 id="product-editor-title">{editingProduct.productId ? 'Edit product' : 'New product'}</h3></div><button type="button" aria-label="Close" onClick={() => setEditingProduct(null)}>×</button></div>
        <div className="shop-form-grid">
          <label className="shop-field"><span>Name</span><input required maxLength="140" value={editingProduct.name} onChange={event => setEditingProduct({ ...editingProduct, name: event.target.value })} /></label>
          <label className="shop-field"><span>Category</span><select required value={editingProduct.categoryId} onChange={event => setEditingProduct({ ...editingProduct, categoryId: event.target.value })}><option value="">Choose a category</option>{categories.map(category => <option key={category.categoryId} value={category.categoryId}>{category.name}{category.active ? '' : ' (inactive)'}</option>)}</select></label>
          <label className="shop-field"><span>Room or location</span><small>Shown subtly on the card.</small><input maxLength="100" value={editingProduct.room || ''} onChange={event => setEditingProduct({ ...editingProduct, room: event.target.value })} placeholder="Primary bedroom" /></label>
          <label className="shop-field"><span>Affiliate link</span><input required type="url" pattern="https://.*" value={editingProduct.affiliateUrl} onChange={event => setEditingProduct({ ...editingProduct, affiliateUrl: event.target.value })} placeholder="https://…" /></label>
        </div>
        <label className="shop-field"><span>Description</span><textarea required maxLength="2000" rows="5" value={editingProduct.description} onChange={event => setEditingProduct({ ...editingProduct, description: event.target.value })} /></label>

        <fieldset className="shop-image-field">
          <legend>Product image</legend>
          {editingProduct.imageUrl ? <div className="shop-image-preview"><img src={editingProduct.imageUrl} alt="Product preview" /><button type="button" onClick={() => setEditingProduct({ ...editingProduct, imageUrl: '' })}>Remove</button></div> : <div className="shop-image-placeholder">Add one clear product photo</div>}
          <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => uploadImage(event.target.files?.[0])} />
          <div className="shop-image-actions">
            <button type="button" className="shop-button shop-button--secondary" disabled={imageBusy} onClick={() => fileInput.current?.click()}>{imageBusy ? 'Working…' : 'Upload image'}</button>
            <span>or</span>
            <input type="url" pattern="https://.*" value={sourceImageUrl} onChange={event => setSourceImageUrl(event.target.value)} placeholder="Authorized image URL" />
            <button type="button" className="shop-button shop-button--secondary" disabled={imageBusy || !sourceImageUrl.trim()} onClick={importImage}>Import</button>
          </div>
          <small>Only import an image you have permission to reuse. Do not paste an Amazon product-page URL; upload your own photo or use an approved Amazon API image later.</small>
        </fieldset>

        <div className="shop-toggle-grid"><Toggle label="Favorite" hint="Favorites appear before other products." checked={editingProduct.favorite} onChange={favorite => setEditingProduct({ ...editingProduct, favorite })} /><Toggle label="Active" hint="Inactive products are hidden from guests." checked={editingProduct.active} onChange={active => setEditingProduct({ ...editingProduct, active })} /></div>
        <div className="shop-modal__actions"><button type="button" className="shop-button shop-button--secondary" onClick={() => setEditingProduct(null)}>Cancel</button><button className="shop-button" disabled={saving || imageBusy || !editingProduct.imageUrl}>Save product</button></div>
      </form>
    </div>}
  </div>;
}

function Toggle({ label, hint, checked, onChange }) {
  return <label className="shop-toggle"><span><strong>{label}</strong><small>{hint}</small></span><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;
}

function makeId(name) {
  const slug = String(name || 'item').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55) || 'item';
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10);
  return `${slug}-${suffix}`;
}
