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
  User,
  CheckSquare,
  Square,
  AlertTriangle,
  Trash,
  Shield
} from 'lucide-react';
import axios from 'axios';
import { toast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientsManager = ({ onAuthError }) => {
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

  // Bulk delete states
  const [selectedClients, setSelectedClients] = useState(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState('confirm'); // 'confirm', 'dependencies', 'processing'
  const [dependenciesData, setDependenciesData] = useState(null);
  const [deleteResults, setDeleteResults] = useState(null);
  const [forceDelete, setForceDelete] = useState(false);

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
      if (error.response?.status === 401 && onAuthError) {
        onAuthError();
      } else {
        const message = error.response?.data?.detail || 'Erro ao salvar cliente';
        toast.error(message);
      }
    }
  };

  // Bulk selection functions
  const toggleClientSelection = (clientId) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const toggleAllClients = () => {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map(client => client.id)));
    }
  };

  const clearSelection = () => {
    setSelectedClients(new Set());
    setIsDeleteDialogOpen(false);
    setDeleteStep('confirm');
    setDependenciesData(null);
    setDeleteResults(null);
    setForceDelete(false);
  };

  // Check dependencies before deletion
  const checkDependencies = async () => {
    try {
      setDeleteStep('processing');
      const response = await axios.post(`${API}/clients/check-dependencies`, 
        Array.from(selectedClients)
      );
      
      setDependenciesData(response.data);
      setDeleteStep('dependencies');
    } catch (error) {
      console.error('Error checking dependencies:', error);
      if (error.response?.status === 401 && onAuthError) {
        onAuthError();
      } else {
        toast.error('Erro ao verificar dependências');
        setDeleteStep('confirm');
      }
    }
  };

  // Execute bulk delete
  const executeBulkDelete = async () => {
    try {
      setDeleteStep('processing');
      
      const response = await axios.post(`${API}/clients/bulk-delete`, {
        client_ids: Array.from(selectedClients),
        force_delete: forceDelete
      });
      
      setDeleteResults(response.data);
      
      if (response.data.success) {
        toast.success(
          `${response.data.deleted_count} cliente(s) excluído(s) com sucesso!`
        );
        
        // Refresh clients list
        fetchClients();
        
        // Clear selection after successful deletion
        setTimeout(() => {
          clearSelection();
        }, 3000);
      } else {
        toast.error('Exclusão concluída com problemas');
      }
      
    } catch (error) {
      console.error('Error in bulk delete:', error);
      if (error.response?.status === 401 && onAuthError) {
        onAuthError();
      } else {
        const message = error.response?.data?.detail || 'Erro ao excluir clientes';
        toast.error(message);
        setDeleteStep('confirm');
      }
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

  const renderDeleteDialog = () => {
    switch (deleteStep) {
      case 'confirm':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Confirmar Exclusão em Massa</span>
              </DialogTitle>
              <DialogDescription>
                Você está prestes a excluir {selectedClients.size} cliente(s). Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Verificação de Segurança</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Vamos verificar se existem orçamentos ou outras dependências associadas aos clientes selecionados.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={clearSelection}>
                  Cancelar
                </Button>
                <Button onClick={checkDependencies} className="bg-yellow-600 hover:bg-yellow-700">
                  Verificar Dependências
                </Button>
              </div>
            </div>
          </>
        );

      case 'dependencies':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Análise de Dependências</DialogTitle>
              <DialogDescription>
                Resultado da verificação para {selectedClients.size} cliente(s)
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {dependenciesData.clients_with_dependencies > 0 ? (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-800">Dependências Encontradas</h4>
                        <p className="text-sm text-red-700 mt-1">
                          {dependenciesData.clients_with_dependencies} cliente(s) possuem {dependenciesData.total_budgets} orçamento(s) associado(s).
                        </p>
                        {dependenciesData.total_approved_budgets > 0 && (
                          <p className="text-sm text-red-700 font-medium">
                            {dependenciesData.total_approved_budgets} orçamentos aprovados (Total: R$ {dependenciesData.total_budget_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900">Detalhes por Cliente:</h5>
                    {dependenciesData.details.map((client, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{client.client_name}</p>
                            <div className="text-sm text-gray-600 space-y-1">
                              {client.messages.map((msg, idx) => (
                                <p key={idx}>• {msg}</p>
                              ))}
                            </div>
                          </div>
                          {client.total_value > 0 && (
                            <div className="text-right">
                              <p className="text-sm font-medium text-green-600">
                                R$ {client.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="force-delete"
                        checked={forceDelete}
                        onChange={(e) => setForceDelete(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="force-delete" className="text-sm font-medium text-orange-800">
                        Forçar exclusão (excluir clientes e todos os orçamentos associados)
                      </label>
                    </div>
                    <p className="text-xs text-orange-700 mt-1">
                      ⚠️ Esta ação irá excluir permanentemente todos os orçamentos dos clientes selecionados.
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <CheckSquare className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">Nenhuma Dependência Encontrada</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Os clientes selecionados podem ser excluídos com segurança.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDeleteStep('confirm')}>
                  Voltar
                </Button>
                <Button
                  onClick={executeBulkDelete}
                  variant="destructive"
                  disabled={dependenciesData.clients_with_dependencies > 0 && !forceDelete}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Confirmar Exclusão
                </Button>
              </div>
            </div>
          </>
        );

      case 'processing':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Processando Exclusão</DialogTitle>
              <DialogDescription>
                Aguarde enquanto processamos a exclusão dos clientes...
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </>
        );

      default:
        if (deleteResults) {
          return (
            <>
              <DialogHeader>
                <DialogTitle>Resultado da Exclusão</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${deleteResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start space-x-2">
                    {deleteResults.success ? (
                      <CheckSquare className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-medium ${deleteResults.success ? 'text-green-800' : 'text-red-800'}`}>
                        {deleteResults.success ? 'Exclusão Concluída' : 'Exclusão com Problemas'}
                      </h4>
                      <div className="text-sm mt-1">
                        <p>Total solicitado: {deleteResults.total_requested}</p>
                        <p>Excluídos com sucesso: {deleteResults.deleted_count}</p>
                        <p>Ignorados: {deleteResults.skipped_count}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {deleteResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-red-800">Erros:</h5>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {deleteResults.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">
                          {error.client_name}: {error.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {deleteResults.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-yellow-800">Avisos:</h5>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {deleteResults.warnings.map((warning, index) => (
                        <p key={index} className="text-sm text-yellow-600">
                          {warning.client_name}: {warning.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={clearSelection}>
                    Fechar
                  </Button>
                </div>
              </div>
            </>
          );
        }
        return null;
    }
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

      {/* Bulk Actions */}
      {filteredClients.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleAllClients}
                    className="flex items-center justify-center w-5 h-5 border border-gray-300 rounded hover:bg-gray-100"
                  >
                    {selectedClients.size === filteredClients.length && filteredClients.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : selectedClients.size > 0 ? (
                      <Square className="w-4 h-4 text-blue-600 opacity-50" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <span className="text-sm font-medium">
                    {selectedClients.size === 0 
                      ? 'Selecionar todos'
                      : `${selectedClients.size} selecionado(s)`
                    }
                  </span>
                </div>
                
                {selectedClients.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedClients(new Set())}
                  >
                    Limpar seleção
                  </Button>
                )}
              </div>

              {selectedClients.size > 0 && (
                <div className="space-x-2">
                  <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir Selecionados ({selectedClients.size})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      {renderDeleteDialog()}
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                <div key={client.id} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${selectedClients.has(client.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleClientSelection(client.id)}
                      className="flex items-center justify-center w-5 h-5 border border-gray-300 rounded hover:bg-gray-100"
                    >
                      {selectedClients.has(client.id) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
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