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
  MapPin,
  User
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientsManager = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    observations: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingClient) {
        await axios.put(`${API}/clients/${editingClient.id}`, formData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await axios.post(`${API}/clients`, formData);
        toast.success('Cliente criado com sucesso!');
      }
      
      fetchClients();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      contact_name: client.contact_name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      observations: client.observations || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) {
      return;
    }

    try {
      await axios.delete(`${API}/clients/${clientId}`);
      toast.success('Cliente excluído com sucesso!');
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erro ao excluir cliente');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      observations: ''
    });
    setEditingClient(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
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
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gerencie seus clientes e informações de contato</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={resetForm}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingClient 
                  ? 'Atualize as informações do cliente.'
                  : 'Adicione um novo cliente ao sistema.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Nome da empresa ou cliente"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact_name">Nome do Contato *</Label>
                <Input
                  id="contact_name"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  required
                  placeholder="Nome da pessoa de contato"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="(00) 00000-0000"
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
                  placeholder="cliente@exemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Endereço completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  name="observations"
                  value={formData.observations}
                  onChange={handleChange}
                  placeholder="Observações sobre o cliente"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingClient ? 'Atualizar' : 'Criar'} Cliente
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
              placeholder="Buscar clientes por nome, contato ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Lista de Clientes ({filteredClients.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length > 0 ? (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{client.name}</h3>
                      <p className="text-sm text-gray-600 flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{client.contact_name}</span>
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-500 flex items-center space-x-1">
                          <Phone className="w-4 h-4" />
                          <span>{client.phone}</span>
                        </p>
                        {client.email && (
                          <p className="text-sm text-gray-500 flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{client.email}</span>
                          </p>
                        )}
                      </div>
                      {client.address && (
                        <p className="text-sm text-gray-500 flex items-center space-x-1 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{client.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(client)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(client.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Tente buscar com outros termos ou adicione um novo cliente.'
                  : 'Comece adicionando seu primeiro cliente ao sistema.'
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Cliente
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsManager;