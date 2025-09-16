import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
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
  Plus,
  Edit,
  Copy,
  History,
  Download,
  Printer,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BudgetsList = ({ onAuthError }) => {
  const [budgets, setBudgets] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetTypes, setBudgetTypes] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [budgetsRes, clientsRes, budgetTypesRes] = await Promise.all([
        axios.get(`${API}/budgets`),
        axios.get(`${API}/clients`),
        axios.get(`${API}/budget-types`)
      ]);

      setBudgets(budgetsRes.data);
      setClients(clientsRes.data);
      setBudgetTypes(budgetTypesRes.data.budget_types);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      if (error.response?.status === 401 && onAuthError) {
        onAuthError();
      } else {
        toast.error('Erro ao carregar dados');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgets = async () => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (selectedClient !== 'all') {
        params.append('client_id', selectedClient);
      }
      
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      
      if (startDate) {
        params.append('start_date', startDate + 'T00:00:00Z');
      }
      
      if (endDate) {
        params.append('end_date', endDate + 'T23:59:59Z');
      }

      const response = await axios.get(`${API}/budgets?${params.toString()}`);
      setBudgets(response.data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      if (error.response?.status === 401 && onAuthError) {
        onAuthError();
      } else {
        toast.error('Erro ao carregar orçamentos');
      }
    }
  };

  const fetchBudgetHistory = async (budgetId) => {
    try {
      const response = await axios.get(`${API}/budgets/${budgetId}/history`);
      setBudgetHistory(response.data);
    } catch (error) {
      console.error('Error fetching budget history:', error);
      if (error.response?.status === 401 && onAuthError) {
        onAuthError();
      } else {
        toast.error('Erro ao carregar histórico');
      }
    }
  };

  const handleDuplicateBudget = async (budgetId) => {
    try {
      const response = await axios.post(`${API}/budgets/${budgetId}/duplicate`);
      toast.success('Orçamento duplicado com sucesso!');
      fetchBudgets();
    } catch (error) {
      console.error('Error duplicating budget:', error);
      toast.error('Erro ao duplicar orçamento');
    }
  };

  const handleViewBudget = async (budget) => {
    setSelectedBudget(budget);
    setIsViewDialogOpen(true);
  };

  const handleViewHistory = async (budget) => {
    setSelectedBudget(budget);
    await fetchBudgetHistory(budget.id);
    setIsHistoryDialogOpen(true);
  };

  const handleEditBudget = (budget) => {
    // Navegar para a página de edição de orçamento usando React Router
    window.open(`/budgets/edit/${budget.id}`, '_blank');
  };

  const handleDeleteBudget = async (budgetId, budgetClientName) => {
    if (!window.confirm(`Tem certeza que deseja excluir o orçamento de "${budgetClientName}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/budgets/${budgetId}`);
      toast.success('Orçamento excluído com sucesso!');
      fetchBudgets(); // Recarregar a lista
    } catch (error) {
      console.error('Error deleting budget:', error);
      if (error.response?.status === 401 && onAuthError) {
        onAuthError();
      } else {
        const message = error.response?.data?.detail || 'Erro ao excluir orçamento';
        toast.error(message);
      }
    }
  };

  const exportBudgetToPDF = (budget) => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orçamento ${budget.id.slice(0, 8)} - ${budget.client_name}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
            line-height: 1.5;
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
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .info-section h3 {
            color: #374151;
            margin-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
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
          .totals {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .final-total {
            font-size: 18px;
            font-weight: bold;
            color: #059669;
            border-top: 2px solid #ddd;
            padding-top: 10px;
            margin-top: 10px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }
          .status-draft { background: #f3f4f6; color: #374151; }
          .status-sent { background: #dbeafe; color: #1e40af; }
          .status-approved { background: #dcfce7; color: #166534; }
          .status-rejected { background: #fee2e2; color: #991b1b; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sistema Favretto - Orçamento</h1>
          <p>ID: ${budget.id.slice(0, 8)}... | Data: ${new Date(budget.created_at).toLocaleDateString('pt-BR')}</p>
          <p>Status: <span class="status-badge status-${budget.status.toLowerCase()}">${getStatusLabel(budget.status)}</span></p>
        </div>
        
        <div class="info-grid">
          <div class="info-section">
            <h3>Informações do Cliente</h3>
            <p><strong>Cliente:</strong> ${budget.client_name}</p>
            <p><strong>Tipo:</strong> ${budget.budget_type}</p>
            ${budget.installation_location ? `<p><strong>Local:</strong> ${budget.installation_location}</p>` : ''}
            ${budget.travel_distance_km ? `<p><strong>Distância:</strong> ${budget.travel_distance_km} km</p>` : ''}
          </div>
          
          <div class="info-section">
            <h3>Detalhes do Orçamento</h3>
            <p><strong>Criado por:</strong> ${budget.created_by}</p>
            <p><strong>Versão:</strong> ${budget.version || 1}</p>
            <p><strong>Validade:</strong> ${budget.validity_days} dias</p>
            <p><strong>Desconto:</strong> ${budget.discount_percentage}%</p>
          </div>
        </div>

        ${budget.observations ? `
          <div class="info-section">
            <h3>Observações</h3>
            <p>${budget.observations}</p>
          </div>
        ` : ''}

        <h3>Itens do Orçamento</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd</th>
              <th>Dimensões</th>
              <th>Área/Vol</th>
              <th>Cor</th>
              <th>% Imp.</th>
              <th>Valor Unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${budget.items.map(item => `
              <tr>
                <td><strong>${item.item_name}</strong></td>
                <td>${item.quantity}</td>
                <td>${item.length && item.height ? `${item.length}x${item.height}${item.width ? `x${item.width}` : ''} cm` : '-'}</td>
                <td>${item.area_m2 ? `${item.area_m2.toFixed(3)} m²/m³` : '-'}</td>
                <td>${item.canvas_color || '-'}</td>
                <td>${item.print_percentage ? `${item.print_percentage}%` : '-'}</td>
                <td>R$ ${item.unit_price.toFixed(2)}</td>
                <td>R$ ${item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>R$ ${budget.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          ${budget.discount_amount > 0 ? `
            <div class="total-row">
              <span>Desconto (${budget.discount_percentage}%):</span>
              <span style="color: #dc2626;">- R$ ${budget.discount_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          <div class="total-row final-total">
            <span>TOTAL:</span>
            <span>R$ ${budget.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div class="footer">
          <p><strong>Sistema Favretto</strong> - Orçamentos e Pedidos</p>
          <p>Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const exportBudgetsToCSV = () => {
    const csvContent = [
      // Header
      ['ID', 'Cliente', 'Tipo', 'Status', 'Data', 'Subtotal', 'Desconto', 'Total', 'Criado Por'].join(','),
      // Data rows
      ...filteredBudgets.map(budget => [
        budget.id.slice(0, 8),
        budget.client_name,
        budget.budget_type,
        getStatusLabel(budget.status),
        new Date(budget.created_at).toLocaleDateString('pt-BR'),
        budget.subtotal.toFixed(2),
        budget.discount_amount.toFixed(2),
        budget.total.toFixed(2),
        budget.created_by
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orcamentos-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const applyFilters = () => {
    fetchBudgets();
  };

  const clearFilters = () => {
    setSelectedClient('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    // Fetch all budgets without filters
    setTimeout(() => {
      fetchInitialData();
    }, 100);
  };

  const filteredBudgets = budgets.filter(budget => {
    const matchesSearch = 
      budget.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.budget_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || budget.budget_type === selectedType;
    
    return matchesSearch && matchesType;
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
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={exportBudgetsToCSV}
            className="text-purple-600 border-purple-600 hover:bg-purple-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          
          <Link to="/budgets/new">
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
          </Link>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <span>Filtros Avançados</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por cliente, tipo ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {budgetTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="DRAFT">Rascunho</SelectItem>
                <SelectItem value="SENT">Enviado</SelectItem>
                <SelectItem value="APPROVED">Aprovado</SelectItem>
                <SelectItem value="REJECTED">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data Inicial</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end_date">Data Final</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end space-x-2">
              <Button onClick={applyFilters} className="flex-1">
                Aplicar Filtros
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Limpar
              </Button>
            </div>
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
                        {budget.version > 1 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            v{budget.version}
                          </span>
                        )}
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
                          <div className="text-gray-500">
                            <span>Qtd: {item.quantity}</span>
                            {item.canvas_color && <span className="ml-2">Cor: {item.canvas_color}</span>}
                          </div>
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
                        onClick={() => handleViewBudget(budget)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportBudgetToPDF(budget)}
                        className="text-purple-600 border-purple-600 hover:bg-purple-50"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateBudget(budget.id)}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewHistory(budget)}
                        className="text-gray-600 border-gray-600 hover:bg-gray-50"
                      >
                        <History className="w-4 h-4 mr-2" />
                        Histórico
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBudget(budget)}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBudget(budget.id, budget.client_name)}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
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
                {searchTerm || selectedType !== 'all' || selectedClient !== 'all' || selectedStatus !== 'all' 
                  ? 'Nenhum orçamento encontrado' 
                  : 'Nenhum orçamento criado'
                }
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || selectedType !== 'all' || selectedClient !== 'all' || selectedStatus !== 'all'
                  ? 'Tente ajustar os filtros ou crie um novo orçamento.'
                  : 'Comece criando seu primeiro orçamento para um cliente.'
                }
              </p>
              {!searchTerm && selectedType === 'all' && selectedClient === 'all' && selectedStatus === 'all' && (
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

      {/* Budget Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Orçamento</DialogTitle>
            <DialogDescription>
              {selectedBudget && `${selectedBudget.client_name} - ${selectedBudget.budget_type}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBudget && (
            <div className="space-y-6">
              {/* Budget Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Informações do Cliente</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Cliente:</strong> {selectedBudget.client_name}</p>
                    <p><strong>Tipo:</strong> {selectedBudget.budget_type}</p>
                    {selectedBudget.installation_location && (
                      <p><strong>Local:</strong> {selectedBudget.installation_location}</p>
                    )}
                    {selectedBudget.travel_distance_km && (
                      <p><strong>Distância:</strong> {selectedBudget.travel_distance_km} km</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Detalhes do Orçamento</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Status:</strong> <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBudget.status)}`}>
                      {getStatusIcon(selectedBudget.status)}
                      <span>{getStatusLabel(selectedBudget.status)}</span>
                    </span></p>
                    <p><strong>Criado por:</strong> {selectedBudget.created_by}</p>
                    <p><strong>Data:</strong> {new Date(selectedBudget.created_at).toLocaleString('pt-BR')}</p>
                    <p><strong>Versão:</strong> {selectedBudget.version || 1}</p>
                  </div>
                </div>
              </div>

              {selectedBudget.observations && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Observações</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">{selectedBudget.observations}</p>
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Itens do Orçamento</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-2 text-left text-xs font-medium">Item</th>
                        <th className="border border-gray-200 p-2 text-left text-xs font-medium">Qtd</th>
                        <th className="border border-gray-200 p-2 text-left text-xs font-medium">Dimensões</th>
                        <th className="border border-gray-200 p-2 text-left text-xs font-medium">Área/Vol</th>
                        <th className="border border-gray-200 p-2 text-left text-xs font-medium">Cor</th>
                        <th className="border border-gray-200 p-2 text-left text-xs font-medium">% Imp.</th>
                        <th className="border border-gray-200 p-2 text-right text-xs font-medium">Unit.</th>
                        <th className="border border-gray-200 p-2 text-right text-xs font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBudget.items.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-200 p-2 text-sm">{item.item_name}</td>
                          <td className="border border-gray-200 p-2 text-sm">{item.quantity}</td>
                          <td className="border border-gray-200 p-2 text-sm">
                            {item.length && item.height ? `${item.length}x${item.height}${item.width ? `x${item.width}` : ''} cm` : '-'}
                          </td>
                          <td className="border border-gray-200 p-2 text-sm">
                            {item.area_m2 ? `${item.area_m2.toFixed(3)} m²/m³` : '-'}
                          </td>
                          <td className="border border-gray-200 p-2 text-sm">{item.canvas_color || '-'}</td>
                          <td className="border border-gray-200 p-2 text-sm">{item.print_percentage ? `${item.print_percentage}%` : '-'}</td>
                          <td className="border border-gray-200 p-2 text-sm text-right">R$ {item.unit_price.toFixed(2)}</td>
                          <td className="border border-gray-200 p-2 text-sm text-right font-medium">
                            R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">R$ {selectedBudget.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {selectedBudget.discount_amount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Desconto ({selectedBudget.discount_percentage}%):</span>
                    <span className="font-medium text-red-600">- R$ {selectedBudget.discount_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-300 pt-2">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-green-600">
                    R$ {selectedBudget.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Budget History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico do Orçamento</DialogTitle>
            <DialogDescription>
              {selectedBudget && `${selectedBudget.client_name} - ${selectedBudget.budget_type}`}
            </DialogDescription>
          </DialogHeader>
          
          {budgetHistory.length > 0 ? (
            <div className="space-y-4">
              {budgetHistory.map((entry, index) => (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {entry.changes.action === 'created' && 'Orçamento Criado'}
                      {entry.changes.action === 'updated' && 'Orçamento Atualizado'}
                      {entry.changes.action === 'duplicated_from' && 'Orçamento Duplicado'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(entry.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p><strong>Por:</strong> {entry.changed_by}</p>
                    {entry.change_reason && <p><strong>Motivo:</strong> {entry.change_reason}</p>}
                  </div>
                  
                  {entry.changes.changes && (
                    <div className="text-xs bg-gray-50 rounded p-2">
                      <strong>Alterações:</strong> {Object.keys(entry.changes.changes).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum histórico encontrado</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetsList;