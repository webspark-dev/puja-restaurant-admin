import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { menuAPI } from '../services/api';

export default function MenuManagement() {
  const [activeTab, setActiveTab] = useState('items');
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [itemModal, setItemModal] = useState(null);
  const [catModal, setCatModal] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadData = async () => {
    try {
      const [menuRes, catsRes] = await Promise.all([
        menuAPI.getMenu(),
        menuAPI.getCategories()
      ]);
      setItems(menuRes.data.items || []);
      setCategories(catsRes.data.categories || []);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Load failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (itemId) => {
    try {
      await menuAPI.toggleItem(itemId);
      setItems(prev => prev.map(i =>
        i.id === itemId ? { ...i, available: !i.available } : i
      ));
      setToast({ type: 'success', message: 'Availability updated' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed' });
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await menuAPI.deleteItem(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
      setToast({ type: 'success', message: 'Item deleted' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete' });
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await menuAPI.deleteCategory(catId);
      setCategories(prev => prev.filter(c => c.id !== catId));
      setToast({ type: 'success', message: 'Category deleted' });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed'
      });
    }
  };

  const filteredItems = items.filter(i => {
    const matchCat = filterCat === 'all' || i.category_id === filterCat;
    const matchSearch = !searchQuery
      || i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) {
    return (
      <Layout title="Menu">
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="loader"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Menu Management">

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: '#fff',
        borderRadius: '12px',
        padding: '4px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <button
          onClick={() => setActiveTab('items')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            background: activeTab === 'items' ? '#2563eb' : 'transparent',
            color: activeTab === 'items' ? '#fff' : '#666',
            fontWeight: '700',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🍔 Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            background: activeTab === 'categories' ? '#2563eb' : 'transparent',
            color: activeTab === 'categories' ? '#fff' : '#666',
            fontWeight: '700',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          📁 Categories ({categories.length})
        </button>
      </div>

      {/* ITEMS TAB */}
      {activeTab === 'items' && (
        <>
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <input
              type="text"
              placeholder="🔍 Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '12px',
                border: '1.5px solid #e5e5e5',
                borderRadius: '10px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={() => setItemModal({ mode: 'create' })}
              style={{
                padding: '12px 20px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              + Add
            </button>
          </div>

          {/* Category Filter */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            marginBottom: '16px',
            paddingBottom: '4px'
          }}>
            <button
              onClick={() => setFilterCat('all')}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                whiteSpace: 'nowrap',
                background: filterCat === 'all' ? '#2563eb' : '#fff',
                color: filterCat === 'all' ? '#fff' : '#666',
                fontSize: '12px',
                fontWeight: '700',
                border: '1px solid #e5e5e5',
                cursor: 'pointer'
              }}
            >
              All ({items.length})
            </button>
            {categories.map(cat => {
              const count = items.filter(i => i.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCat(cat.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                    background: filterCat === cat.id ? '#2563eb' : '#fff',
                    color: filterCat === cat.id ? '#fff' : '#666',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: '1px solid #e5e5e5',
                    cursor: 'pointer'
                  }}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Items List */}
          {filteredItems.length === 0 ? (
            <div style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '60px 20px',
              textAlign: 'center',
              color: '#999'
            }}>
              <div style={{ fontSize: '50px', marginBottom: '12px' }}>🍽️</div>
              <div>No items found</div>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  opacity: item.available ? 1 : 0.55
                }}
              >
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  {/* Image */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    background: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<span style="font-size:36px;">🍽️</span>';
                        }}
                      />
                    ) : (
                      '🍽️'
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        border: item.is_veg ? '1.5px solid #16a34a' : '1.5px solid #b8142a',
                        borderRadius: '3px',
                        position: 'relative',
                        flexShrink: 0
                      }}>
                        <span style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '6px',
                          height: '6px',
                          background: item.is_veg ? '#16a34a' : '#b8142a',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                      <h3 style={{ fontSize: '15px', fontWeight: '700' }}>
                        {item.name}
                      </h3>
                    </div>

                    {item.description && (
                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '6px'
                      }}>
                        {item.description}
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '800',
                        color: '#1a1a1a'
                      }}>
                        ₹{item.price}
                      </span>

                      {item.is_featured && (
                        <span style={{
                          fontSize: '10px',
                          background: '#fef3c7',
                          color: '#b45309',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: '700'
                        }}>
                          ⭐ Featured
                        </span>
                      )}

                      {item.is_best_seller && (
                        <span style={{
                          fontSize: '10px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: '700'
                        }}>
                          🔥 Best Seller
                        </span>
                      )}

                      {!item.available && (
                        <span style={{
                          fontSize: '10px',
                          background: '#f0f0f0',
                          color: '#666',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: '700'
                        }}>
                          ⏸️ Disabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '6px'
                }}>
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: item.available ? '#fef3c7' : '#dcfce7',
                      color: item.available ? '#b45309' : '#16a34a',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {item.available ? '⏸️ Disable' : '▶️ Enable'}
                  </button>
                  <button
                    onClick={() => setItemModal({ mode: 'edit', item })}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#2563eb',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <>
          <button
            onClick={() => setCatModal({ mode: 'create' })}
            style={{
              width: '100%',
              padding: '14px',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '700',
              marginBottom: '16px',
              cursor: 'pointer'
            }}
          >
            + Add Category
          </button>

          {categories.length === 0 ? (
            <div style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '60px 20px',
              textAlign: 'center',
              color: '#999'
            }}>
              No categories yet
            </div>
          ) : (
            categories.map(cat => {
              const itemCount = items.filter(i => i.category_id === cat.id).length;
              return (
                <div
                  key={cat.id}
                  style={{
                    background: '#fff',
                    borderRadius: '14px',
                    padding: '16px',
                    marginBottom: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      marginBottom: '4px'
                    }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {itemCount} items • Order: {cat.display_order}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setCatModal({ mode: 'edit', category: cat })}
                      style={{
                        padding: '10px 14px',
                        background: '#2563eb',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '700',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      style={{
                        padding: '10px 14px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '700',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* Item Modal */}
      {itemModal && (
        <ItemModal
          mode={itemModal.mode}
          item={itemModal.item}
          categories={categories}
          onClose={() => setItemModal(null)}
          onSave={() => {
            const wasCreate = itemModal.mode === 'create';
            setItemModal(null);
            loadData();
            setToast({
              type: 'success',
              message: wasCreate ? 'Item created' : 'Item updated'
            });
          }}
        />
      )}

      {/* Category Modal */}
      {catModal && (
        <CategoryModal
          mode={catModal.mode}
          category={catModal.category}
          onClose={() => setCatModal(null)}
          onSave={() => {
            const wasCreate = catModal.mode === 'create';
            setCatModal(null);
            loadData();
            setToast({
              type: 'success',
              message: wasCreate ? 'Category created' : 'Category updated'
            });
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff',
          padding: '14px 24px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '700',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          zIndex: 2000,
          maxWidth: '90%'
        }}>
          {toast.type === 'success' ? '✅ ' : '❌ '}
          {toast.message}
        </div>
      )}

    </Layout>
  );
}

// ============================================
// Item Modal (with Image Upload)
// ============================================
function ItemModal({ mode, item, categories, onClose, onSave }) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState(item?.price || '');
  const [categoryId, setCategoryId] = useState(
    item?.category_id || categories[0]?.id || ''
  );
  const [imageUrl, setImageUrl] = useState(item?.image_url || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(item?.thumbnail_url || '');
  const [uploading, setUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);
  const [isVeg, setIsVeg] = useState(item?.is_veg ?? true);
  const [isFeatured, setIsFeatured] = useState(item?.is_featured || false);
  const [isBestSeller, setIsBestSeller] = useState(item?.is_best_seller || false);
  const [prepTime, setPrepTime] = useState(item?.prep_time_minutes || 15);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only images allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5 MB)');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const res = await menuAPI.uploadImage(file, name || 'item');
      setImageUrl(res.data.image_url);
      setThumbnailUrl(res.data.thumbnail_url);
      setUploadStats(res.data.stats);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setThumbnailUrl('');
    setUploadStats(null);
  };

  const handleSave = async () => {
    if (!name || !price || !categoryId) {
      setError('Name, Price, Category required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category_id: categoryId,
        image_url: imageUrl || null,
        thumbnail_url: thumbnailUrl || null,
        is_veg: isVeg,
        is_featured: isFeatured,
        is_best_seller: isBestSeller,
        prep_time_minutes: parseInt(prepTime)
      };

      if (mode === 'create') {
        await menuAPI.createItem(data);
      } else {
        await menuAPI.updateItem(item.id, data);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
            {mode === 'create' ? '➕ Add Item' : '✏️ Edit Item'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              fontSize: '24px',
              color: '#666',
              padding: '4px 8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* 📷 IMAGE UPLOAD */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#555'
          }}>
            📷 Item Photo
          </label>

          {imageUrl ? (
            <div style={{
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
              marginBottom: '10px',
              border: '1.5px solid #e5e5e5'
            }}>
              <img
                src={imageUrl}
                alt="Preview"
                style={{
                  width: '100%',
                  height: '180px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              <button
                onClick={handleRemoveImage}
                type="button"
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(220, 38, 38, 0.9)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>

              {uploadStats && (
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  ✅ {uploadStats.main_kb} KB (WebP)
                </div>
              )}
            </div>
          ) : (
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              background: '#f8fafc',
              cursor: uploading ? 'wait' : 'pointer',
              transition: 'all 0.2s'
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              {uploading ? (
                <>
                  <div className="loader" style={{
                    width: '30px',
                    height: '30px',
                    borderWidth: '3px'
                  }}></div>
                  <div style={{
                    marginTop: '12px',
                    fontSize: '13px',
                    color: '#666',
                    fontWeight: '600'
                  }}>
                    Uploading & processing...
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📷</div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#2563eb',
                    marginBottom: '4px'
                  }}>
                    Choose Photo
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#94a3b8'
                  }}>
                    JPG, PNG, WebP (max 5 MB)
                  </div>
                </>
              )}
            </label>
          )}
        </div>

        {/* Name */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '6px',
            color: '#555'
          }}>
            Item Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chicken Biryani"
            style={{
              width: '100%',
              padding: '12px',
              border: '1.5px solid #e5e5e5',
              borderRadius: '10px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '6px',
            color: '#555'
          }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Aromatic basmati rice with tender chicken"
            rows="3"
            style={{
              width: '100%',
              padding: '12px',
              border: '1.5px solid #e5e5e5',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Price + Prep Time */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '6px',
              color: '#555'
            }}>
              Price (₹) *
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="180"
              style={{
                width: '100%',
                padding: '12px',
                border: '1.5px solid #e5e5e5',
                borderRadius: '10px',
                fontSize: '14px'
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '6px',
              color: '#555'
            }}>
              Prep Time (min)
            </label>
            <input
              type="number"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1.5px solid #e5e5e5',
                borderRadius: '10px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '6px',
            color: '#555'
          }}>
            Category *
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1.5px solid #e5e5e5',
              borderRadius: '10px',
              fontSize: '14px'
            }}
          >
            <option value="">Select category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Toggles */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => setIsVeg(!isVeg)}
            style={{
              padding: '10px 14px',
              background: isVeg ? '#dcfce7' : '#fee2e2',
              color: isVeg ? '#16a34a' : '#dc2626',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isVeg ? '🥬 Veg' : '🍖 Non-Veg'}
          </button>
          <button
            type="button"
            onClick={() => setIsFeatured(!isFeatured)}
            style={{
              padding: '10px 14px',
              background: isFeatured ? '#fef3c7' : '#f0f0f0',
              color: isFeatured ? '#b45309' : '#666',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ⭐ Featured
          </button>
          <button
            type="button"
            onClick={() => setIsBestSeller(!isBestSeller)}
            style={{
              padding: '10px 14px',
              background: isBestSeller ? '#fee2e2' : '#f0f0f0',
              color: isBestSeller ? '#dc2626' : '#666',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            🔥 Best Seller
          </button>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            style={{
              flex: 2,
              padding: '14px',
              background: (saving || uploading) ? '#94a3b8' : '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: (saving || uploading) ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? '⏳ Saving...' : uploading ? '⏳ Uploading...' : '✓ Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Category Modal
// ============================================
function CategoryModal({ mode, category, onClose, onSave }) {
  const [name, setName] = useState(category?.name || '');
  const [displayOrder, setDisplayOrder] = useState(category?.display_order || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name required');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const data = {
        name: name.trim(),
        display_order: parseInt(displayOrder) || 0
      };
      if (mode === 'create') {
        await menuAPI.createCategory(data);
      } else {
        await menuAPI.updateCategory(category.id, data);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '16px',
          maxWidth: '400px',
          width: '100%',
          padding: '24px'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
            {mode === 'create' ? '➕ Add Category' : '✏️ Edit Category'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              fontSize: '24px',
              color: '#666',
              padding: '4px 8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '6px',
            color: '#555'
          }}>
            Category Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Desserts"
            style={{
              width: '100%',
              padding: '12px',
              border: '1.5px solid #e5e5e5',
              borderRadius: '10px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '6px',
            color: '#555'
          }}>
            Display Order
          </label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1.5px solid #e5e5e5',
              borderRadius: '10px',
              fontSize: '14px'
            }}
          />
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2,
              padding: '14px',
              background: saving ? '#94a3b8' : '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? '⏳ Saving...' : '✓ Save'}
          </button>
        </div>
      </div>
    </div>
  );
}