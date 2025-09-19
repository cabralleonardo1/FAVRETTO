import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Users, 
  FileText, 
  Calculator, 
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, onAuthError }) => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalBudgets: 0,
    recentBudgets: [],
    monthlyRevenue: 0,
    approvalRate: 0,
    draftBudgets: 0,
    sentBudgets: 0,
    approvedBudgets: 0,
    rejectedBudgets: 0,
    approvedThisMonth: 0,
    currentMonth: '',
    lastUpdated: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [clientsRes, budgetsRes, statisticsRes] = await Promise.all([
        axios.get(`${API}/clients`),
        axios.get(`${API}/budgets`),
        axios.get(`${API}/statistics/budgets`)
      ]);

      const clients = clientsRes.data;
      const budgets = budgetsRes.data;
      const statistics = statisticsRes.data;
      // Get recent budgets (last 5)
      const recentBudgets = budgets
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      setStats({
        totalClients: clients.length,
        totalBudgets: statistics.total_budgets,
        recentBudgets,
        monthlyRevenue: statistics.monthly_revenue,
        approvalRate: statistics.approval_rate,
        draftBudgets: statistics.draft_budgets,
        sentBudgets: statistics.sent_budgets,
        approvedBudgets: statistics.approved_budgets,
        rejectedBudgets: statistics.rejected_budgets,
        approvedThisMonth: statistics.approved_this_month,
        currentMonth: statistics.current_month,
        lastUpdated: statistics.last_updated
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401 && onAuthError) {
        onAuthError();
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'text-gray-600 bg-gray-100';
      case 'SENT':
        return 'text-blue-600 bg-blue-100';
      case 'APPROVED':
        return 'text-green-600 bg-green-100';
      case 'REJECTED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Bem-vindo, {user.username}! Aqui está um resumo do seu sistema.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Orçamentos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalBudgets}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Receita do Mês</p>
                <p className="text-3xl font-bold text-gray-900">
                  R$ {stats.monthlyRevenue.toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Aprovação</p>
                <p className="text-3xl font-bold text-gray-900">{stats.approvalRate}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.approvedBudgets} de {stats.totalBudgets} orçamentos
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rascunhos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.draftBudgets}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Enviados</p>
                <p className="text-2xl font-bold text-blue-900">{stats.sentBudgets}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aprovados</p>
                <p className="text-2xl font-bold text-green-900">{stats.approvedBudgets}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejeitados</p>
                <p className="text-2xl font-bold text-red-900">{stats.rejectedBudgets}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Card */}
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span>Receita do Mês - {stats.currentMonth}</span>
          </CardTitle>
          <CardDescription>
            Apenas orçamentos aprovados são considerados na receita
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-900">
                R$ {stats.monthlyRevenue.toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2 
                })}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {stats.approvedThisMonth} orçamentos aprovados este mês
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                Última atualização: {stats.lastUpdated && new Date(stats.lastUpdated).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <span>Orçamentos Recentes</span>
            </CardTitle>
            <CardDescription>
              Últimos orçamentos criados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentBudgets.length > 0 ? (
                stats.recentBudgets.map((budget) => (
                  <div key={budget.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{budget.client_name}</p>
                      <p className="text-sm text-gray-600">{budget.budget_type}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(budget.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        R$ {budget.total.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}
                      </p>
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(budget.status)}`}>
                        {getStatusIcon(budget.status)}
                        <span>{budget.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum orçamento encontrado</p>
                  <p className="text-sm">Crie seu primeiro orçamento</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span>Ações Rápidas</span>
            </CardTitle>
            <CardDescription>
              Acesso rápido às funcionalidades principais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <a
                href="/clients"
                className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Gerenciar Clientes</p>
                  <p className="text-sm text-gray-600">Adicionar e editar clientes</p>
                </div>
              </a>

              <a
                href="/budgets/new"
                className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Calculator className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Novo Orçamento</p>
                  <p className="text-sm text-gray-600">Criar orçamento para cliente</p>
                </div>
              </a>

              {user.role === 'admin' && (
                <a
                  href="/price-table"
                  className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <DollarSign className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="font-medium text-gray-900">Tabela de Preços</p>
                    <p className="text-sm text-gray-600">Gerenciar preços e produtos</p>
                  </div>
                </a>
              )}

              <a
                href="/budgets"
                className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <FileText className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Ver Orçamentos</p>
                  <p className="text-sm text-gray-600">Listar todos os orçamentos</p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;