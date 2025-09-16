import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  TrendingUp, 
  Search, 
  Filter, 
  DollarSign,
  Calendar,
  User,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CommissionsManager = () => {
  const [commissions, setCommissions] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [summary, setSummary] = useState({ summary: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState('commissions'); // 'commissions' or 'summary'

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [commissionsRes, sellersRes, summaryRes] = await Promise.all([
        axios.get(`${API}/commissions`),
        axios.get(`${API}/sellers`),
        axios.get(`${API}/commissions/summary`)
      ]);

      setCommissions(commissionsRes.data);
      setSellers(sellersRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Erro ao carregar dados de comissões');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissions = async () => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (selectedSeller !== 'all') {
        params.append('seller_id', selectedSeller);
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

      const [commissionsRes, summaryRes] = await Promise.all([
        axios.get(`${API}/commissions?${params.toString()}`),
        axios.get(`${API}/commissions/summary?${params.toString()}`)
      ]);

      setCommissions(commissionsRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      toast.error('Erro ao carregar comissões');
    }
  };

  const applyFilters = () => {
    fetchCommissions();
  };

  const clearFilters = () => {
    setSelectedSeller('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    // Fetch all commissions without filters
    setTimeout(() => {
      fetchInitialData();
    }, 100);
  };

  const exportCommissionsToCSV = () => {
    const csvContent = [
      // Header
      ['Data', 'Vendedor', 'Orçamento', 'Valor Total', 'Comissão %', 'Valor Comissão', 'Status'].join(','),
      // Data rows
      ...commissions.map(commission => [
        new Date(commission.created_at).toLocaleDateString('pt-BR'),
        commission.seller_name,
        commission.budget_id.slice(0, 8),
        commission.budget_total.toFixed(2),
        commission.commission_percentage.toFixed(2),
        commission.commission_amount.toFixed(2),
        getStatusLabel(commission.status)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `comissoes-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'CALCULATED':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'PAID':
        return 'text-green-600 bg-green-100 border-green-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-4 h-4" />;
      case 'CALCULATED':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'CALCULATED':
        return 'Calculada';
      case 'PAID':
        return 'Paga';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Comissões</h1>
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
          <h1 className="text-3xl font-bold text-gray-900">Comissões</h1>
          <p className="text-gray-600 mt-1">Acompanhe e gerencie as comissões da equipe de vendas</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'summary' ? 'default' : 'outline'}
            onClick={() => setViewMode('summary')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Resumo
          </Button>
          
          <Button
            variant={viewMode === 'commissions' ? 'default' : 'outline'}
            onClick={() => setViewMode('commissions')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Detalhado
          </Button>

          <Button
            variant="outline"
            onClick={exportCommissionsToCSV}
            className="text-purple-600 border-purple-600 hover:bg-purple-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vendedores</SelectItem>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.name}
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
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="CALCULATED">Calculada</SelectItem>
                <SelectItem value="PAID">Paga</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={applyFilters} className="flex-1">
              Aplicar Filtros
            </Button>
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

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === 'summary' ? (
        /* Summary View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span>Resumo de Comissões por Vendedor</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.summary && summary.summary.length > 0 ? (
              <div className="space-y-6">
                {/* Totals Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Total Comissões</p>
                          <p className="text-xl font-bold text-green-600">
                            R$ {summary.totals.total_commission_amount?.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2 
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Total Vendas</p>
                          <p className="text-xl font-bold text-blue-600">
                            R$ {summary.totals.total_sales_amount?.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2 
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-8 h-8 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600">Total Orçamentos</p>
                          <p className="text-xl font-bold text-purple-600">
                            {summary.totals.total_commission_count}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sellers Summary */}
                <div className="space-y-4">
                  {summary.summary.map((seller) => (
                    <Card key={seller._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{seller.seller_name}</h3>
                              <p className="text-sm text-gray-600">
                                {seller.commission_count} orçamento(s) • Comissão média: {seller.avg_commission_percentage?.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center space-x-1 mb-1">
                              <DollarSign className="w-5 h-5 text-green-600" />
                              <span className="text-2xl font-bold text-green-600">
                                R$ {seller.total_commissions.toLocaleString('pt-BR', { 
                                  minimumFractionDigits: 2 
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              De R$ {seller.total_sales.toLocaleString('pt-BR', { 
                                minimumFractionDigits: 2 
                              })} em vendas
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum dado de comissão encontrado
                </h3>
                <p className="text-gray-600">
                  Não há comissões no período selecionado ou para os filtros aplicados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Detailed View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Lista Detalhada de Comissões ({commissions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commissions.length > 0 ? (
              <div className="space-y-4">
                {commissions.map((commission) => (
                  <div key={commission.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{commission.seller_name}</h3>
                          <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(commission.status)}`}>
                            {getStatusIcon(commission.status)}
                            <span>{getStatusLabel(commission.status)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(commission.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <FileText className="w-4 h-4" />
                            <span>Orçamento: {commission.budget_id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-end space-x-1 mb-1">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-xl font-bold text-green-600">
                            R$ {commission.commission_amount.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 2 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {commission.commission_percentage}% de R$ {commission.budget_total.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 2 
                          })}
                        </p>
                      </div>
                    </div>

                    {commission.observations && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                          <strong>Observações:</strong> {commission.observations}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        {commission.payment_date && (
                          <span>Pago em: {new Date(commission.payment_date).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Orçamento
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
                  Nenhuma comissão encontrada
                </h3>
                <p className="text-gray-600 mb-6">
                  Não há comissões para os filtros aplicados ou ainda não foram geradas comissões.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CommissionsManager;