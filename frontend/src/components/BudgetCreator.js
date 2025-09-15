import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  User, 
  Package,
  MapPin,
  DollarSign,
  Percent,
  Save,
  Eye
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BudgetCreator = ({ user }) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [budgetTypes, setBudgetTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    budget_type: '',
    installation_location: '',
    travel_distance_km: '',
    observations: '',
    discount_percentage: 0
  });

  const [budgetItems, setBudgetItems] = useState([
    {
      id: Date.now(),
      item_id: '',
      item_name: '',
      quantity: 1,
      unit_price: 0,
      length: 0,
      height: 0,
      width: 0,
      subtotal: 0
    }
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [clientsRes, priceItemsRes, budgetTypesRes] = await Promise.all([
        axios.get(`${API}/clients`),
        axios.get(`${API}/price-table`),
        axios.get(`${API}/budget-types`)
      ]);

      setClients(clientsRes.data);
      setPriceItems(priceItemsRes.data);
      setBudgetTypes(budgetTypesRes.data.budget_types);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Erro ao carregar dados iniciais');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...budgetItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // If item_id changed, update name and price
    if (field === 'item_id') {
      const selectedItem = priceItems.find(item => item.id === value);
      if (selectedItem) {
        updatedItems[index].item_name = selectedItem.name;
        updatedItems[index].unit_price = selectedItem.unit_price;
      }
    }

    // Calculate subtotal based on item type and dimensions
    const item = updatedItems[index];
    let calculatedSubtotal = 0;

    if (item.unit_price > 0) {
      // For area-based calculations (length x height)
      if (item.length > 0 && item.height > 0) {
        const area = (item.length / 100) * (item.height / 100); // Convert cm to m²
        calculatedSubtotal = area * item.quantity * item.unit_price;
      }
      // For volume-based calculations (length x height x width)
      else if (item.length > 0 && item.height > 0 && item.width > 0) {
        const volume = (item.length / 100) * (item.height / 100) * (item.width / 100); // Convert cm to m³
        calculatedSubtotal = volume * item.quantity * item.unit_price;
      }
      // For simple quantity-based calculations
      else {
        calculatedSubtotal = item.quantity * item.unit_price;
      }
    }

    updatedItems[index].subtotal = calculatedSubtotal;
    setBudgetItems(updatedItems);
  };

  const addBudgetItem = () => {
    setBudgetItems(prev => [...prev, {
      id: Date.now(),
      item_id: '',
      item_name: '',
      quantity: 1,
      unit_price: 0,
      length: 0,
      height: 0,
      width: 0,
      subtotal: 0
    }]);
  };

  const removeBudgetItem = (index) => {
    if (budgetItems.length > 1) {
      setBudgetItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = budgetItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = subtotal * (formData.discount_percentage / 100);
    const total = subtotal - discountAmount;

    return { subtotal, discountAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.budget_type) {
      toast.error('Por favor, selecione o cliente e o tipo de orçamento');
      return;
    }

    if (budgetItems.some(item => !item.item_id)) {
      toast.error('Por favor, selecione todos os itens do orçamento');
      return;
    }

    setSaving(true);

    try {
      const budgetData = {
        ...formData,
        travel_distance_km: parseFloat(formData.travel_distance_km) || 0,
        discount_percentage: parseFloat(formData.discount_percentage) || 0,
        items: budgetItems.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          length: parseFloat(item.length) || null,
          height: parseFloat(item.height) || null,
          width: parseFloat(item.width) || null,
          subtotal: item.subtotal
        }))
      };

      const response = await axios.post(`${API}/budgets`, budgetData);
      toast.success('Orçamento criado com sucesso!');
      navigate('/budgets');
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Erro ao criar orçamento');
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, discountAmount, total } = calculateTotals();

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Novo Orçamento</h1>
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
          <h1 className="text-3xl font-bold text-gray-900">Novo Orçamento</h1>
          <p className="text-gray-600 mt-1">Crie um novo orçamento para seu cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client and Budget Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Informações Básicas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select value={formData.client_id} onValueChange={(value) => handleFormChange('client_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.contact_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget_type">Tipo de Orçamento *</Label>
                <Select value={formData.budget_type} onValueChange={(value) => handleFormChange('budget_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="installation_location">Local de Instalação</Label>
                <Input
                  id="installation_location"
                  value={formData.installation_location}
                  onChange={(e) => handleFormChange('installation_location', e.target.value)}
                  placeholder="Endereço ou local da instalação"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="travel_distance_km">Distância (km)</Label>
                <Input
                  id="travel_distance_km"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.travel_distance_km}
                  onChange={(e) => handleFormChange('travel_distance_km', e.target.value)}
                  placeholder="Distância para deslocamento"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleFormChange('observations', e.target.value)}
                placeholder="Observações sobre o orçamento"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Budget Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-green-600" />
                <span>Itens do Orçamento</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBudgetItem}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {budgetItems.map((item, index) => (
              <div key={item.id} className="p-4 border border-gray-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                  {budgetItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBudgetItem(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Produto/Serviço *</Label>
                    <Select 
                      value={item.item_id} 
                      onValueChange={(value) => handleItemChange(index, 'item_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o item" />
                      </SelectTrigger>
                      <SelectContent>
                        {priceItems.map((priceItem) => (
                          <SelectItem key={priceItem.id} value={priceItem.id}>
                            {priceItem.code} - {priceItem.name} (R$ {priceItem.unit_price.toFixed(2)}/{priceItem.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Comprimento (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.length}
                      onChange={(e) => handleItemChange(index, 'length', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Altura (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.height}
                      onChange={(e) => handleItemChange(index, 'height', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Largura (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.width}
                      onChange={(e) => handleItemChange(index, 'width', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">Preço Unitário:</span>
                    <span className="font-medium">R$ {item.unit_price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="font-bold text-lg text-green-600">
                      R$ {item.subtotal.toLocaleString('pt-BR', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Totals and Discount */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <span>Totais e Desconto</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount_percentage">Desconto (%)</Label>
                <div className="relative">
                  <Input
                    id="discount_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) => handleFormChange('discount_percentage', parseFloat(e.target.value) || 0)}
                    className="pr-10"
                  />
                  <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  R$ {subtotal.toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Desconto ({formData.discount_percentage}%):</span>
                  <span className="font-medium text-red-600">
                    - R$ {discountAmount.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between border-t border-gray-300 pt-3">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-green-600">
                  R$ {total.toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/budgets')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Salvando...</span>
              </div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Criar Orçamento
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BudgetCreator;