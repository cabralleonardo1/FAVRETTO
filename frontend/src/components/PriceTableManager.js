import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Tag, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package,
  DollarSign,
  Filter
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PriceTableManager = ({ user }) => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: '',
    unit_price: '',
    category: ''
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/price-table`);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching price table:', error);
      toast.error('Erro ao carregar tabela de preços');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/price-table/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast.error('Apenas administradores podem modificar a tabela de preços');
      return;
    }

    try {
      const submitData = {
        ...formData,
        unit_price: parseFloat(formData.unit_price)
      };

      if (editingItem) {
        await axios.put(`${API}/price-table/${editingItem.id}`, submitData);
        toast.success('Item atualizado com sucesso!');
      } else {
        await axios.post(`${API}/price-table`, submitData);
        toast.success('Item criado com sucesso!');
      }
      
      fetchItems();
      fetchCategories();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Erro ao salvar item');
    }
  };

  const handleEdit = (item) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem editar itens');
      return;
    }

    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      unit: item.unit,
      unit_price: item.unit_price.toString(),
      category: item.category
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (itemId) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem excluir itens');
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir este item?')) {
      return;
    }

    try {
      await axios.delete(`${API}/price-table/${itemId}`);
      toast.success('Item excluído com sucesso!');
      fetchItems();
      fetchCategories();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao excluir item');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      unit: '',
      unit_price: '',
      category: ''
    });
    setEditingItem(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Tabela de Preços</h1>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tabela de Preços</h1>
          <p className="text-gray-600 mt-1">Gerencie produtos e serviços disponíveis</p>
        </div>
        
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={resetForm}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Editar Item' : 'Novo Item'}
                </DialogTitle>
                <DialogDescription>
                  {editingItem 
                    ? 'Atualize as informações do item.'
                    : 'Adicione um novo item à tabela de preços.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    placeholder="Código do produto/serviço"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Nome do produto/serviço"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Input
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Adesivos, Impressão, Instalação"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade *</Label>
                  <Input
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    required
                    placeholder="Ex: m², un, ml, kg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Preço Unitário (R$) *</Label>
                  <Input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingItem ? 'Atualizar' : 'Criar'} Item
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por nome, código ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <SelectValue placeholder="Filtrar por categoria" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Price Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-green-600" />
            <span>Itens da Tabela ({filteredItems.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700">Código</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Nome</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Categoria</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Unidade</th>
                    <th className="text-right p-4 font-semibold text-gray-700">Preço Unit.</th>
                    {isAdmin && (
                      <th className="text-center p-4 font-semibold text-gray-700">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr key={item.id} className={`border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="font-mono text-sm">{item.code}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-600">{item.unit}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-green-700">
                            {item.unit_price.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2 
                            })}
                          </span>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="p-4">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <PriceTag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedCategory ? 'Nenhum item encontrado' : 'Nenhum item cadastrado'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || selectedCategory
                  ? 'Tente ajustar os filtros ou adicione um novo item.'
                  : 'Comece adicionando itens à tabela de preços.'
                }
              </p>
              {isAdmin && !searchTerm && !selectedCategory && (
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Item
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!isAdmin && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-yellow-800">
              <Package className="w-5 h-5" />
              <p className="text-sm">
                <strong>Informação:</strong> Apenas administradores podem modificar a tabela de preços. 
                Entre em contato com um administrador para adicionar ou editar itens.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PriceTableManager;