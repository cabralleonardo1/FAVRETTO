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
  Filter,
  FileText,
  Printer,
  Download,
  Upload,
  RefreshCw
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [importing, setImporting] = useState(false);
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

  const importStandardData = async () => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem importar dados');
      return;
    }

    if (!window.confirm('Isso irá adicionar todos os itens padrão da planilha Favretto. Continuar?')) {
      return;
    }

    setImporting(true);

    const standardItems = [
      { code: "ADH001", name: "Adesivo Impresso (Baú Liso)", unit: "M²", unit_price: 130, category: "Adesivos" },
      { code: "ADH002", name: "Adesivo Impresso (Baú Corrugado)", unit: "M²", unit_price: 170, category: "Adesivos" },
      { code: "ADH003", name: "Adesivo Colorido (Recorte)", unit: "M²", unit_price: 244.44, category: "Adesivos" },
      { code: "ADH004", name: "Adesivo Impresso (Recorte)", unit: "M²", unit_price: 166.67, category: "Adesivos" },
      { code: "ADH005", name: "Adesivo Colorido (Envelopamento)", unit: "M²", unit_price: 222.22, category: "Adesivos" },
      { code: "ADH006", name: "Adesivo Perfurado", unit: "M²", unit_price: 46.67, category: "Adesivos" },
      { code: "LON001", name: "Lona Sider", unit: "ML", unit_price: 225, category: "Lonas" },
      { code: "LON002", name: "Lona Sider (Sem Acabamento)", unit: "ML", unit_price: 111.11, category: "Lonas" },
      { code: "LON003", name: "Lona de Teto", unit: "ML", unit_price: 88.89, category: "Lonas" },
      { code: "LON004", name: "Lona de Teto Instalada", unit: "ML", unit_price: 188.89, category: "Lonas" },
      { code: "AUT001", name: "Automidia Perfis", unit: "ML", unit_price: 75, category: "Automidia" },
      { code: "AUT002", name: "Automidia Lona", unit: "M²", unit_price: 57, category: "Automidia" },
      { code: "AUT003", name: "Automidia Instalação", unit: "ML", unit_price: 35, category: "Automidia" },
      { code: "POR001", name: "Porta Lateral (Baú Liso)", unit: "UNID.", unit_price: 555.56, category: "Portas e Testes" },
      { code: "POR002", name: "Porta Lateral (Baú Corrugado)", unit: "UNID.", unit_price: 1388.89, category: "Portas e Testes" },
      { code: "POR003", name: "Porta Traseira Lisa", unit: "UNID.", unit_price: 910, category: "Portas e Testes" },
      { code: "POR004", name: "Porta Traseira Corrugada", unit: "UNID.", unit_price: 1190, category: "Portas e Testes" },
      { code: "TES001", name: "Testeira Lisa", unit: "UNID.", unit_price: 1040, category: "Portas e Testes" },
      { code: "TES002", name: "Testeira Corrugada", unit: "UNID.", unit_price: 1300, category: "Portas e Testes" },
      { code: "CHA001", name: "Chapa ACM", unit: "M²", unit_price: 200, category: "Chapas" },
      { code: "SER001", name: "Remoção de Adesivo", unit: "M²", unit_price: 44.44, category: "Serviços" },
      { code: "SER002", name: "Deslocamento / Viagem", unit: "KM", unit_price: 5.33, category: "Serviços" },
      { code: "PER001", name: "Perfil Randon", unit: "UNID.", unit_price: 194.44, category: "Perfis" },
      { code: "PER002", name: "Perfil Fachinni", unit: "UNID.", unit_price: 205.56, category: "Perfis" },
      { code: "BAN001", name: "Bandô Termoplástico", unit: "ML", unit_price: 31.11, category: "Bandôs" },
      { code: "BAN002", name: "Bandô Borracha", unit: "ML", unit_price: 55.56, category: "Bandôs" },
      { code: "ACE001", name: "Fivela e Rabicho", unit: "UNID.", unit_price: 23.33, category: "Acessórios" },
      { code: "ACE002", name: "Roldanas", unit: "UNID.", unit_price: 9.44, category: "Acessórios" },
      { code: "ACE003", name: "Fita Refletiva", unit: "UNID.", unit_price: 4.5, category: "Acessórios" },
      { code: "IMP001", name: "Impressão UV", unit: "M²", unit_price: 66.67, category: "Impressão" },
      { code: "IMP002", name: "Impressão UV p/ Automidia", unit: "M²", unit_price: 30, category: "Impressão" },
      { code: "ISO001", name: "Isolamento de Porta Lateral", unit: "UNID.", unit_price: 222.22, category: "Isolamento" },
      { code: "REP001", name: "Reparo Cantoneira", unit: "UNID.", unit_price: 33.33, category: "Reparos" },
      { code: "REP002", name: "Reparo Perfil Base", unit: "ML", unit_price: 40, category: "Reparos" },
      { code: "REP003", name: "Reparo Perfil Conector", unit: "ML", unit_price: 40, category: "Reparos" },
      { code: "REP004", name: "Reparo Perfil de Acabamento", unit: "ML", unit_price: 40, category: "Reparos" },
      { code: "REP005", name: "Reparo Perfis (3 Perfis em Conjunto)", unit: "ML", unit_price: 85, category: "Reparos" },
      { code: "INS001", name: "Instalação Lona Sider", unit: "PAR", unit_price: 750, category: "Instalação" },
      { code: "INS002", name: "Instalação Automidia", unit: "UNID.", unit_price: 1350, category: "Instalação" },
      { code: "DES001", name: "Design", unit: "UNID.", unit_price: 450, category: "Design" },
      { code: "SEG001", name: "Seguro Automidia / Reparo", unit: "UNID.", unit_price: 2000, category: "Seguro" },
      { code: "ACA001", name: "Laminação p/ Plotagem em Adesivo", unit: "M²", unit_price: 36, category: "Acabamento" },
      { code: "OUT001", name: "Outros", unit: "R$", unit_price: 0, category: "Outros" }
    ];

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const item of standardItems) {
        try {
          await axios.post(`${API}/price-table`, item);
          successCount++;
        } catch (error) {
          if (error.response?.status === 400 && error.response?.data?.detail?.includes('already exists')) {
            // Item já existe, ignorar
          } else {
            console.error(`Error importing item ${item.code}:`, error);
            errorCount++;
          }
        }
      }

      toast.success(`Importação concluída! ${successCount} itens adicionados.`);
      fetchItems();
      fetchCategories();
    } catch (error) {
      console.error('Error importing standard data:', error);
      toast.error('Erro ao importar dados padrão');
    } finally {
      setImporting(false);
    }
  };

  const exportToPDF = () => {
    const filteredItems = items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Create print window
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tabela de Preços - Favretto</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #ddd;
            padding-bottom: 20px;
          }
          .header h1 { 
            color: #2563eb; 
            margin: 0;
            font-size: 24px;
          }
          .header p { 
            margin: 5px 0; 
            color: #666;
            font-size: 14px;
          }
          .summary {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px 8px; 
            text-align: left;
            font-size: 12px;
          }
          th { 
            background-color: #f3f4f6; 
            font-weight: bold;
            color: #374151;
          }
          tr:nth-child(even) { 
            background-color: #f9fafb; 
          }
          tr:hover { 
            background-color: #e5e7eb; 
          }
          .category-badge {
            background: #dbeafe;
            color: #1e40af;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 500;
          }
          .price {
            font-weight: bold;
            color: #059669;
            text-align: right;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sistema Favretto - Tabela de Preços</h1>
          <p>Data de Geração: ${new Date().toLocaleDateString('pt-BR')}</p>
          <p>Total de Itens: ${filteredItems.length}</p>
        </div>
        
        <div class="summary">
          <div>
            <strong>Filtros Aplicados:</strong>
            ${searchTerm ? `Busca: "${searchTerm}"` : ''}
            ${selectedCategory ? `Categoria: ${selectedCategory}` : ''}
            ${!searchTerm && !selectedCategory ? 'Todos os itens' : ''}
          </div>
          <div>
            <strong>Gerado por:</strong> ${user.username} (${user.role})
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 10%">Código</th>
              <th style="width: 35%">Nome do Produto</th>
              <th style="width: 15%">Categoria</th>
              <th style="width: 10%">Unidade</th>
              <th style="width: 15%">Preço Unit.</th>
              <th style="width: 15%">Preço (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredItems.map(item => `
              <tr>
                <td><strong>${item.code}</strong></td>
                <td>${item.name}</td>
                <td><span class="category-badge">${item.category}</span></td>
                <td>${item.unit}</td>
                <td class="price">${item.unit_price.toFixed(2)}</td>
                <td class="price">R$ ${item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p><strong>Sistema Favretto</strong> - Orçamentos e Pedidos</p>
          <p>Este documento foi gerado automaticamente pelo sistema em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Auto print after small delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
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
        
        <div className="flex items-center space-x-2">
          {/* Export/Print buttons */}
          <Button
            variant="outline"
            onClick={exportToPDF}
            className="text-purple-600 border-purple-600 hover:bg-purple-50"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir/PDF
          </Button>

          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={importStandardData}
                disabled={importing}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                {importing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {importing ? 'Importando...' : 'Importar Dados Padrão'}
              </Button>

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
            </>
          )}
        </div>
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
                <SelectItem value="all">Todas as categorias</SelectItem>
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
                          <span className="font-mono text-sm font-medium">{item.code}</span>
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
              <Tag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedCategory ? 'Nenhum item encontrado' : 'Nenhum item cadastrado'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || selectedCategory
                  ? 'Tente ajustar os filtros ou adicione um novo item.'
                  : 'Comece importando os dados padrão ou adicionando itens manualmente.'
                }
              </p>
              {isAdmin && !searchTerm && !selectedCategory && (
                <div className="flex items-center justify-center space-x-4">
                  <Button 
                    onClick={importStandardData}
                    disabled={importing}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    {importing ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {importing ? 'Importando...' : 'Importar Dados Padrão'}
                  </Button>
                  
                  <Button 
                    onClick={() => setIsDialogOpen(true)}
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item Manual
                  </Button>
                </div>
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