import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
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
  Eye,
  Edit,
  UserPlus,
  Palette,
  Settings
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BudgetCreator = ({ user }) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [priceItems, setPriceItems] = useState([]);
  const [budgetTypes, setBudgetTypes] = useState([]);
  const [canvasColors, setCanvasColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Client dialog states
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientFormData, setClientFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    observations: ''
  });

  // Color dialog states
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState(null);
  const [colorFormData, setColorFormData] = useState({
    name: '',
    hex_code: ''
  });
  
  const [formData, setFormData] = useState({
    client_id: '',
    seller_id: '',
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
      area_m2: 0,
      canvas_color: 'none',
      print_percentage: 0,
      item_discount_percentage: 0,
      subtotal: 0,
      final_price: 0
    }
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [clientsRes, sellersRes, priceItemsRes, budgetTypesRes, colorsRes] = await Promise.all([
        axios.get(`${API}/clients`),
        axios.get(`${API}/sellers`),
        axios.get(`${API}/price-table`),
        axios.get(`${API}/budget-types`),
        axios.get(`${API}/canvas-colors`)
      ]);

      setClients(clientsRes.data);
      setSellers(sellersRes.data);
      setPriceItems(priceItemsRes.data);
      setBudgetTypes(budgetTypesRes.data.budget_types);
      setCanvasColors(colorsRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Erro ao carregar dados iniciais');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchCanvasColors = async () => {
    try {
      const response = await axios.get(`${API}/canvas-colors`);
      setCanvasColors(response.data);
    } catch (error) {
      console.error('Error fetching canvas colors:', error);
    }
  };

  // Client management functions
  const handleClientSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingClient) {
        await axios.put(`${API}/clients/${editingClient.id}`, clientFormData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        const response = await axios.post(`${API}/clients`, clientFormData);
        toast.success('Cliente criado com sucesso!');
        setFormData(prev => ({ ...prev, client_id: response.data.id }));
      }
      
      fetchClients();
      resetClientForm();
      setIsClientDialogOpen(false);
    } catch (error) {
      console.error('Error saving client:', error);
      const message = error.response?.data?.detail || 'Erro ao salvar cliente';
      toast.error(message);
    }
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setClientFormData({
      name: client.name,
      contact_name: client.contact_name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip_code: client.zip_code || '',
      observations: client.observations || ''
    });
    setIsClientDialogOpen(true);
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) {
      return;
    }

    try {
      await axios.delete(`${API}/clients/${clientId}`);
      toast.success('Cliente excluído com sucesso!');
      fetchClients();
      if (formData.client_id === clientId) {
        setFormData(prev => ({ ...prev, client_id: '' }));
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erro ao excluir cliente');
    }
  };

  const resetClientForm = () => {
    setClientFormData({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      observations: ''
    });
    setEditingClient(null);
  };

  // Color management functions
  const handleColorSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingColor) {
        await axios.put(`${API}/canvas-colors/${editingColor.id}`, colorFormData);
        toast.success('Cor atualizada com sucesso!');
      } else {
        await axios.post(`${API}/canvas-colors`, colorFormData);
        toast.success('Cor criada com sucesso!');
      }
      
      fetchCanvasColors();
      resetColorForm();
      setIsColorDialogOpen(false);
    } catch (error) {
      console.error('Error saving color:', error);
      const message = error.response?.data?.detail || 'Erro ao salvar cor';
      toast.error(message);
    }
  };

  const handleEditColor = (color) => {
    setEditingColor(color);
    setColorFormData({
      name: color.name,
      hex_code: color.hex_code || ''
    });
    setIsColorDialogOpen(true);
  };

  const handleDeleteColor = async (colorId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta cor?')) {
      return;
    }

    try {
      await axios.delete(`${API}/canvas-colors/${colorId}`);
      toast.success('Cor excluída com sucesso!');
      fetchCanvasColors();
    } catch (error) {
      console.error('Error deleting color:', error);
      toast.error('Erro ao excluir cor');
    }
  };

  const resetColorForm = () => {
    setColorFormData({
      name: '',
      hex_code: ''
    });
    setEditingColor(null);
  };

  const initializeDefaultColors = async () => {
    try {
      await axios.post(`${API}/canvas-colors/initialize`);
      toast.success('Cores padrão inicializadas!');
      fetchCanvasColors();
    } catch (error) {
      console.error('Error initializing colors:', error);
      toast.error('Erro ao inicializar cores padrão');
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateAreaM2 = (length, height, width) => {
    if (length > 0 && height > 0) {
      // Values are already in meters, no need to convert
      if (width > 0) {
        return length * height * width; // Volume in m³
      } else {
        return length * height; // Area in m²
      }
    }
    return 0;
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

    // Calculate area_m2 when dimensions change
    if (['length', 'height', 'width'].includes(field)) {
      const item = updatedItems[index];
      updatedItems[index].area_m2 = calculateAreaM2(item.length, item.height, item.width);
    }

    // Calculate subtotal based on item type and dimensions
    const item = updatedItems[index];
    let calculatedSubtotal = 0;
    let finalPrice = 0;

    if (item.unit_price > 0) {
      // For area/volume-based calculations
      if (item.area_m2 > 0) {
        calculatedSubtotal = item.area_m2 * item.quantity * item.unit_price;
      }
      // For simple quantity-based calculations
      else {
        calculatedSubtotal = item.quantity * item.unit_price;
      }

      // Calculate final price: Subtotal * % de Impressão
      if (item.print_percentage > 0) {
        finalPrice = calculatedSubtotal * (item.print_percentage / 100);
      } else {
        finalPrice = calculatedSubtotal; // Use subtotal if no print percentage
      }

      // Apply item discount if applicable
      if (item.item_discount_percentage > 0) {
        const discountAmount = finalPrice * (item.item_discount_percentage / 100);
        finalPrice = finalPrice - discountAmount;
      }
    }

    updatedItems[index].subtotal = calculatedSubtotal;
    updatedItems[index].final_price = finalPrice;
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
      area_m2: 0,
      canvas_color: 'none',
      print_percentage: 0,
      item_discount_percentage: 0,
      subtotal: 0,
      final_price: 0
    }]);
  };

  const removeBudgetItem = (index) => {
    if (budgetItems.length > 1) {
      setBudgetItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = budgetItems.reduce((sum, item) => sum + (item.final_price || item.subtotal), 0);
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
          area_m2: parseFloat(item.area_m2) || null,
          canvas_color: item.canvas_color || null,
          print_percentage: parseFloat(item.print_percentage) || null,
          item_discount_percentage: parseFloat(item.item_discount_percentage) || null,
          subtotal: item.final_price || item.subtotal
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
                <div className="flex space-x-2">
                  <Select value={formData.client_id || ""} onValueChange={(value) => handleFormChange('client_id', value)}>
                    <SelectTrigger className="flex-1">
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
                  
                  <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={resetClientForm}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
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
                      
                      <form onSubmit={handleClientSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="client_name">Nome da Empresa *</Label>
                            <Input
                              id="client_name"
                              value={clientFormData.name}
                              onChange={(e) => setClientFormData(prev => ({ ...prev, name: e.target.value }))}
                              required
                              placeholder="Nome da empresa"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="contact_name">Nome do Contato *</Label>
                            <Input
                              id="contact_name"
                              value={clientFormData.contact_name}
                              onChange={(e) => setClientFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                              required
                              placeholder="Nome da pessoa de contato"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Telefone *</Label>
                            <Input
                              id="phone"
                              value={clientFormData.phone}
                              onChange={(e) => setClientFormData(prev => ({ ...prev, phone: e.target.value }))}
                              required
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={clientFormData.email}
                              onChange={(e) => setClientFormData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="cliente@exemplo.com"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="address">Endereço</Label>
                          <Input
                            id="address"
                            value={clientFormData.address}
                            onChange={(e) => setClientFormData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Rua, número, bairro"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city">Cidade</Label>
                            <Input
                              id="city"
                              value={clientFormData.city}
                              onChange={(e) => setClientFormData(prev => ({ ...prev, city: e.target.value }))}
                              placeholder="Cidade"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="state">Estado</Label>
                            <Input
                              id="state"
                              value={clientFormData.state}
                              onChange={(e) => setClientFormData(prev => ({ ...prev, state: e.target.value }))}
                              placeholder="Estado"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="zip_code">CEP</Label>
                            <Input
                              id="zip_code"
                              value={clientFormData.zip_code}
                              onChange={(e) => setClientFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                              placeholder="00000-000"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="observations">Observações</Label>
                          <Textarea
                            id="observations"
                            value={clientFormData.observations}
                            onChange={(e) => setClientFormData(prev => ({ ...prev, observations: e.target.value }))}
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
                            onClick={() => setIsClientDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Selected client actions */}
                {formData.client_id && (
                  <div className="flex space-x-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const client = clients.find(c => c.id === formData.client_id);
                        if (client) handleEditClient(client);
                      }}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClient(formData.client_id)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seller">Vendedor</Label>
                <Select value={formData.seller_id || ""} onValueChange={(value) => handleFormChange('seller_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum vendedor</SelectItem>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.name} ({seller.commission_percentage}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_type">Tipo de Orçamento *</Label>
                <Select value={formData.budget_type || ""} onValueChange={(value) => handleFormChange('budget_type', value)}>
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
              <div className="flex space-x-2">
                {/* Color Management */}
                <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetColorForm}
                      className="text-purple-600 border-purple-600 hover:bg-purple-50"
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      Gerenciar Cores
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>
                        {editingColor ? 'Editar Cor' : 'Gerenciar Cores de Lona'}
                      </DialogTitle>
                      <DialogDescription>
                        Gerencie as cores disponíveis para lonas.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Current colors list */}
                      <div className="space-y-2">
                        <Label>Cores Disponíveis:</Label>
                        <div className="max-h-40 overflow-y-auto border rounded p-2">
                          {canvasColors.length > 0 ? (
                            canvasColors.map((color) => (
                              <div key={color.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                <div className="flex items-center space-x-2">
                                  {color.hex_code && (
                                    <div 
                                      className="w-4 h-4 rounded border"
                                      style={{ backgroundColor: color.hex_code }}
                                    ></div>
                                  )}
                                  <span className="font-medium">{color.name}</span>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditColor(color)}
                                    className="text-blue-600 hover:bg-blue-50"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteColor(color.id)}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-center py-4">Nenhuma cor cadastrada</p>
                          )}
                        </div>
                        
                        {canvasColors.length === 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={initializeDefaultColors}
                            className="w-full"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Inicializar Cores Padrão
                          </Button>
                        )}
                      </div>

                      {/* Color form */}
                      <form onSubmit={handleColorSubmit} className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="color_name">Nome da Cor *</Label>
                          <Input
                            id="color_name"
                            value={colorFormData.name}
                            onChange={(e) => setColorFormData(prev => ({ ...prev, name: e.target.value }))}
                            required
                            placeholder="Ex: AZUL CLARO"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="hex_code">Código Hex (opcional)</Label>
                          <Input
                            id="hex_code"
                            value={colorFormData.hex_code}
                            onChange={(e) => setColorFormData(prev => ({ ...prev, hex_code: e.target.value }))}
                            placeholder="#0066CC"
                          />
                        </div>
                        
                        <div className="flex space-x-3">
                          <Button type="submit" className="flex-1">
                            {editingColor ? 'Atualizar' : 'Adicionar'} Cor
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              resetColorForm();
                              setIsColorDialogOpen(false);
                            }}
                          >
                            Fechar
                          </Button>
                        </div>
                      </form>
                    </div>
                  </DialogContent>
                </Dialog>

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
              </div>
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
                      value={item.item_id || ""} 
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
                    <Label>Comprimento (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.length}
                      onChange={(e) => handleItemChange(index, 'length', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Altura (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.height}
                      onChange={(e) => handleItemChange(index, 'height', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Largura (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.width}
                      onChange={(e) => handleItemChange(index, 'width', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Área/Volume (m²/m³)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={item.area_m2}
                      onChange={(e) => handleItemChange(index, 'area_m2', parseFloat(e.target.value) || 0)}
                      placeholder="Calculado automaticamente"
                      className="bg-gray-50"
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cor da Lona</Label>
                    <Select 
                      value={item.canvas_color || ""} 
                      onValueChange={(value) => handleItemChange(index, 'canvas_color', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a cor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem cor específica</SelectItem>
                        {canvasColors.map((color) => (
                          <SelectItem key={color.id} value={color.name}>
                            <div className="flex items-center space-x-2">
                              {color.hex_code && (
                                <div 
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: color.hex_code }}
                                ></div>
                              )}
                              <span>{color.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>% de Impressão</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={item.print_percentage}
                      onChange={(e) => handleItemChange(index, 'print_percentage', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Desconto Item (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={item.item_discount_percentage}
                      onChange={(e) => handleItemChange(index, 'item_discount_percentage', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">Preço Unitário:</span>
                    <span className="font-medium">R$ {item.unit_price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="font-medium text-blue-600">
                        R$ {item.subtotal.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Preço Final:</span>
                      <span className="font-bold text-lg text-green-600">
                        R$ {(item.final_price || item.subtotal).toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}
                      </span>
                    </div>
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