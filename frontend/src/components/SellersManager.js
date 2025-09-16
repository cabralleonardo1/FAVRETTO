import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  User,
  Percent,
  UserCheck,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SellersManager = ({ onAuthError }) => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_percentage: 5.0,
    registration_number: '',
    observations: ''
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      const response = await axios.get(`${API}/sellers`);
      setSellers(response.data);
    } catch (error) {
      console.error('Error fetching sellers:', error);
      toast.error('Erro ao carregar vendedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingSeller) {
        await axios.put(`${API}/sellers/${editingSeller.id}`, formData);
        toast.success('Vendedor atualizado com sucesso!');
      } else {
        await axios.post(`${API}/sellers`, formData);
        toast.success('Vendedor criado com sucesso!');
      }
      
      fetchSellers();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving seller:', error);
      const message = error.response?.data?.detail || 'Erro ao salvar vendedor';
      toast.error(message);
    }
  };

  const handleEdit = (seller) => {
    setEditingSeller(seller);
    setFormData({
      name: seller.name,
      email: seller.email || '',
      phone: seller.phone || '',
      commission_percentage: seller.commission_percentage,
      registration_number: seller.registration_number || '',
      observations: seller.observations || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (sellerId) => {
    if (!window.confirm('Tem certeza que deseja excluir este vendedor?')) {
      return;
    }

    try {
      await axios.delete(`${API}/sellers/${sellerId}`);
      toast.success('Vendedor excluído com sucesso!');
      fetchSellers();
    } catch (error) {
      console.error('Error deleting seller:', error);
      toast.error('Erro ao excluir vendedor');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      commission_percentage: 5.0,
      registration_number: '',
      observations: ''
    });
    setEditingSeller(null);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    });
  };

  const filteredSellers = sellers.filter(seller =>
    seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (seller.email && seller.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (seller.phone && seller.phone.includes(searchTerm)) ||
    (seller.registration_number && seller.registration_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Vendedores</h1>
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
          <h1 className="text-3xl font-bold text-gray-900">Vendedores</h1>
          <p className="text-gray-600 mt-1">Gerencie sua equipe de vendas e configure comissões</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={resetForm}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Vendedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}
              </DialogTitle>
              <DialogDescription>
                {editingSeller 
                  ? 'Atualize as informações do vendedor.'
                  : 'Adicione um novo vendedor à equipe.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Nome do vendedor"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="vendedor@exemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="commission_percentage">Comissão (%) *</Label>
                <div className="relative">
                  <Input
                    id="commission_percentage"
                    name="commission_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commission_percentage}
                    onChange={handleChange}
                    required
                    className="pr-10"
                  />
                  <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="registration_number">Número de Registro</Label>
                <Input
                  id="registration_number"
                  name="registration_number"
                  value={formData.registration_number}
                  onChange={handleChange}
                  placeholder="CPF, CNPJ ou código interno"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  name="observations"
                  value={formData.observations}
                  onChange={handleChange}
                  placeholder="Informações adicionais sobre o vendedor"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingSeller ? 'Atualizar' : 'Criar'} Vendedor
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
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar vendedores por nome, email, telefone ou registro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sellers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Equipe de Vendas ({filteredSellers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSellers.length > 0 ? (
            <div className="space-y-4">
              {filteredSellers.map((seller) => (
                <div key={seller.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{seller.name}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        {seller.email && (
                          <p className="text-sm text-gray-500 flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{seller.email}</span>
                          </p>
                        )}
                        {seller.phone && (
                          <p className="text-sm text-gray-500 flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{seller.phone}</span>
                          </p>
                        )}
                      </div>
                      {seller.registration_number && (
                        <p className="text-xs text-gray-400 mt-1">
                          Registro: {seller.registration_number}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-green-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-bold text-lg">{seller.commission_percentage}%</span>
                      </div>
                      <p className="text-xs text-gray-500">Comissão</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(seller)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(seller.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhum vendedor encontrado' : 'Nenhum vendedor cadastrado'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Tente buscar com outros termos ou adicione um novo vendedor.'
                  : 'Comece adicionando vendedores à sua equipe de vendas.'
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Vendedor
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellersManager;