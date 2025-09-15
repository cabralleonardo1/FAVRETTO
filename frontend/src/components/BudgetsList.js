import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Calendar,
  User,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BudgetsList = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [budgetTypes, setBudgetTypes] = useState([]);

  useEffect(() => {
    fetchBudgets();
    fetchBudgetTypes();
  }, []);

  const fetchBudgets = async () => {
    try {
      const response = await axios.get(`${API}/budgets`);
      setBudgets(response.data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetTypes = async () => {
    try {
      const response = await axios.get(`${API}/budget-types`);
      setBudgetTypes(response.data.budget_types);
    } catch (error) {
      console.error('Error fetching budget types:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'SENT':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'APPROVED':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'REJECTED':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
      case 'SENT':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'Rascunho';
      case 'SENT':
        return 'Enviado';
      case 'APPROVED':
        return 'Aprovado';
      case 'REJECTED':
        return 'Rejeitado';
      default:
        return status;
    }
  };

  const filteredBudgets = budgets.filter(budget => {
    const matchesSearch = 
      budget.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.budget_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || budget.budget_type === selectedType;
    const matchesStatus = !selectedStatus || budget.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Orçamentos</h1>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-600 mt-1">Visualize e gerencie todos os orçamentos</p>
        </div>
        
        <Link to="/budgets/new">
          <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Orçamento
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por cliente, tipo ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os tipos</SelectItem>
                {budgetTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <SelectValue placeholder="Filtrar por status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os status</SelectItem>
                <SelectItem value="DRAFT">Rascunho</SelectItem>
                <SelectItem value="SENT">Enviado</SelectItem>
                <SelectItem value="APPROVED">Aprovado</SelectItem>
                <SelectItem value="REJECTED">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Budgets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Lista de Orçamentos ({filteredBudgets.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBudgets.length > 0 ? (
            <div className="space-y-4">
              {filteredBudgets.map((budget) => (
                <div key={budget.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{budget.client_name}</h3>
                        <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(budget.status)}`}>
                          {getStatusIcon(budget.status)}
                          <span>{getStatusLabel(budget.status)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                        <FileText className="w-4 h-4" />
                        <span>{budget.budget_type}</span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(budget.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>Por {budget.created_by}</span>
                        </div>
                        
                        {budget.installation_location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{budget.installation_location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end space-x-1 mb-1">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="text-2xl font-bold text-gray-900">
                          {budget.total.toLocaleString('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          })}
                        </span>
                      </div>
                      
                      {budget.discount_percentage > 0 && (
                        <div className="text-sm text-gray-500">
                          Desconto: {budget.discount_percentage}%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Budget Items Preview */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Itens ({budget.items.length}):</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {budget.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-xs bg-gray-50 rounded px-2 py-1">
                          <span className="font-medium">{item.item_name}</span>
                          <span className="text-gray-500 ml-1">
                            (Qtd: {item.quantity})
                          </span>
                        </div>
                      ))}
                      {budget.items.length > 3 && (
                        <div className="text-xs bg-gray-100 rounded px-2 py-1 text-gray-600">
                          +{budget.items.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Observations */}
                  {budget.observations && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                        <strong>Observações:</strong> {budget.observations}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      ID: {budget.id.slice(0, 8)}...
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedType || selectedStatus 
                  ? 'Nenhum orçamento encontrado' 
                  : 'Nenhum orçamento criado'
                }
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || selectedType || selectedStatus
                  ? 'Tente ajustar os filtros ou crie um novo orçamento.'
                  : 'Comece criando seu primeiro orçamento para um cliente.'
                }
              </p>
              {!searchTerm && !selectedType && !selectedStatus && (
                <Link to="/budgets/new">
                  <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Orçamento
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetsList;