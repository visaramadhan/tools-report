'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [newSubCategory, setNewSubCategory] = useState('');
  const [newSubPrefix, setNewSubPrefix] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubCategories(categoryId: string) {
    try {
        const res = await fetch(`/api/subcategories?categoryId=${categoryId}`);
        if (res.ok) {
            const data = await res.json();
            setSubCategories((prev: any) => ({...prev, [categoryId]: data}));
        }
    } catch (error) {
        console.error('Failed to fetch subcategories');
    }
  }

  const toggleExpand = (categoryId: string) => {
      if (expandedCategory === categoryId) {
          setExpandedCategory(null);
      } else {
          setExpandedCategory(categoryId);
          if (!subCategories[categoryId]) {
              fetchSubCategories(categoryId);
          }
      }
  };

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory }),
      });

      if (res.ok) {
        setNewCategory('');
        fetchCategories();
      } else {
        alert('Gagal membuat kategori');
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateSubCategory(e: React.FormEvent, categoryId: string) {
    e.preventDefault();
    if (!newSubCategory.trim() || !newSubPrefix.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name: newSubCategory, 
            prefix: newSubPrefix.toUpperCase(),
            categoryId
        }),
      });

      if (res.ok) {
        setNewSubCategory('');
        setNewSubPrefix('');
        fetchSubCategories(categoryId);
      } else {
        alert('Gagal membuat sub kategori');
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Apakah anda yakin ingin menghapus kategori ini? Semua sub kategori akan ikut terhapus (logic dependent).')) return;
    
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchCategories();
      }
    } catch (error) {
      alert('Gagal menghapus kategori');
    }
  }

  async function handleDeleteSubCategory(id: string, categoryId: string) {
    if (!confirm('Apakah anda yakin ingin menghapus sub kategori ini?')) return;
    
    try {
      const res = await fetch(`/api/subcategories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSubCategories(categoryId);
      }
    } catch (error) {
      alert('Gagal menghapus sub kategori');
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-2xl font-bold">Manajemen Kategori & Sub Kategori</h1>
      <p className="text-sm text-gray-500">Atur Prefix di Sub Kategori (misal: APD-2026-001)</p>

      <form onSubmit={handleCreateCategory} className="flex gap-2">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Nama Kategori Baru"
          className="flex-1 border rounded-md p-2"
        />
        <button
          type="submit"
          disabled={isCreating || !newCategory.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isCreating ? '...' : 'Tambah Kategori'}
        </button>
      </form>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-2">
          {categories.map((category: any) => (
            <div key={category._id} className="card overflow-hidden">
              <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => toggleExpand(category._id)}>
                <div className="flex items-center gap-2">
                    {expandedCategory === category._id ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                    <span className="font-medium text-gray-800">{category.name}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category._id); }} className="text-error hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              {expandedCategory === category._id && (
                  <div className="p-4 border-t border-gray-100 bg-white">
                      <h4 className="text-sm font-semibold mb-3 text-gray-700">Sub Kategori</h4>
                      
                      <form onSubmit={(e) => handleCreateSubCategory(e, category._id)} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newSubCategory}
                            onChange={(e) => setNewSubCategory(e.target.value)}
                            placeholder="Nama Sub Kategori"
                            className="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <input
                            type="text"
                            value={newSubPrefix}
                            onChange={(e) => setNewSubPrefix(e.target.value)}
                            placeholder="Prefix (e.g. APD)"
                            maxLength={5}
                            className="w-32 border border-gray-200 rounded-lg p-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <button
                            type="submit"
                            disabled={isCreating || !newSubCategory.trim() || !newSubPrefix.trim()}
                            className="bg-success text-white px-4 py-1 rounded-lg hover:bg-opacity-90 disabled:opacity-50 text-sm font-medium transition-all shadow-sm"
                        >
                            Tambah
                        </button>
                      </form>

                      <div className="space-y-2">
                          {subCategories[category._id]?.map((sub: any) => (
                              <div key={sub._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                  <div>
                                      <span className="text-sm font-medium text-gray-700">{sub.name}</span>
                                      <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono">{sub.prefix}</span>
                                  </div>
                                  <button onClick={() => handleDeleteSubCategory(sub._id, category._id)} className="text-error hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                          {(!subCategories[category._id] || subCategories[category._id].length === 0) && (
                              <p className="text-sm text-gray-500 italic p-2">Belum ada sub kategori.</p>
                          )}
                      </div>
                  </div>
              )}
            </div>
          ))}
          {categories.length === 0 && <div className="text-center text-gray-500 mt-4">Belum ada kategori</div>}
        </div>
      )}
    </div>
  );
}
