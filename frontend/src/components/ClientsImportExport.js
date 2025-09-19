import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Info,
  Settings
} from 'lucide-react';
import axios from 'axios';
import { toast } from './ui/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientsImportExport = ({ onAuthError }) => {
  // Import states
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Export states
  const [exporting, setExporting] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    fields: ['name', 'contact_name', 'phone', 'email', 'address', 'city', 'state', 'zip_code'],
    include_dates: true,
    date_format: '%d/%m/%Y'
  });
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Available fields for export
  const availableFields = [
    { key: 'name', label: 'Nome' },
    { key: 'contact_name', label: 'Contato' },
    { key: 'phone', label: 'Telefone' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Endereço' },
    { key: 'city', label: 'Cidade' },
    { key: 'state', label: 'Estado' },
    { key: 'zip_code', label: 'CEP' }
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Apenas arquivos CSV são permitidos');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error('Arquivo muito grande. Limite máximo: 10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo CSV');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(`${API}/clients/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setImportResult(response.data);
      
      if (response.data.success) {
        toast.success(`Importação concluída! ${response.data.imported_count} clientes importados.`);
      } else {
        toast.error('Importação concluída com erros. Verifique os detalhes.');
      }

    } catch (error) {
      console.error('Error importing CSV:', error);
      if (error.response?.status === 401 && onAuthError) {
        onAuthError();
      } else {
        const message = error.response?.data?.detail || 'Erro ao importar arquivo';
        toast.error(message);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const response = await axios.post(`${API}/clients/export`, exportConfig, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'clientes_export.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Exportação concluída com sucesso!');
      setIsExportDialogOpen(false);

    } catch (error) {
      console.error('Error exporting CSV:', error);
      if (error.response?.status === 401 && onAuthError) {
        onAuthError();
      } else {
        const message = error.response?.data?.detail || 'Erro ao exportar dados';
        toast.error(message);
      }
    } finally {
      setExporting(false);
    }
  };

  const toggleField = (fieldKey) => {
    setExportConfig(prev => ({
      ...prev,
      fields: prev.fields.includes(fieldKey)
        ? prev.fields.filter(f => f !== fieldKey)
        : [...prev.fields, fieldKey]
    }));
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportResult(null);
    setIsImportDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Importar/Exportar Clientes</h1>
        <p className="text-gray-600 mt-1">
          Gerencie dados de clientes em massa através de arquivos CSV
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import Card */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <span>Importar Clientes</span>
            </CardTitle>
            <CardDescription>
              Importe clientes em massa a partir de um arquivo CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Selecione um arquivo CSV para importar
              </p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="max-w-xs mx-auto"
              />
              {selectedFile && (
                <p className="text-sm text-green-600 mt-2">
                  Arquivo selecionado: {selectedFile.name}
                </p>
              )}
            </div>

            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full" 
                  disabled={!selectedFile || importing}
                >
                  {importing ? 'Importando...' : 'Importar Clientes'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Confirmar Importação</DialogTitle>
                  <DialogDescription>
                    Arquivo: {selectedFile?.name}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Formato esperado:</strong> CSV com colunas: Nome, Contato, Telefone, Email, Endereço, Cidade, Estado, CEP
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={resetImport}>
                      Cancelar
                    </Button>
                    <Button onClick={handleImport} disabled={importing}>
                      {importing ? 'Importando...' : 'Confirmar Importação'}
                    </Button>
                  </div>

                  {importing && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Processando arquivo...</p>
                      <Progress value={50} className="w-full" />
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Import Results */}
            {importResult && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center space-x-2">
                    {importResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {importResult.success ? 'Importação Concluída' : 'Importação com Problemas'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p>Total processado: {importResult.total_processed}</p>
                    <p>Importados com sucesso: {importResult.imported_count}</p>
                    <p>Erros: {importResult.errors.length}</p>
                    <p>Avisos: {importResult.warnings.length}</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-800">Erros:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {importResult.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">
                          Linha {error.row}: {error.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {importResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-800">Avisos:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {importResult.warnings.map((warning, index) => (
                        <p key={index} className="text-sm text-yellow-600">
                          {warning.row ? `Linha ${warning.row}: ` : ''}{warning.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Card */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-green-600" />
              <span>Exportar Clientes</span>
            </CardTitle>
            <CardDescription>
              Exporte dados de clientes para arquivo CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="text-center py-8">
                <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Configure e exporte seus dados de clientes
                </p>
              </div>

              <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" disabled={exporting}>
                    <Settings className="w-4 h-4 mr-2" />
                    {exporting ? 'Exportando...' : 'Configurar Exportação'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Configurar Exportação</DialogTitle>
                    <DialogDescription>
                      Selecione os campos e opções para exportação
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Field Selection */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Campos para Exportar</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {availableFields.map((field) => (
                          <div key={field.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={field.key}
                              checked={exportConfig.fields.includes(field.key)}
                              onCheckedChange={() => toggleField(field.key)}
                            />
                            <Label htmlFor={field.key} className="text-sm">
                              {field.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Date Options */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include_dates"
                          checked={exportConfig.include_dates}
                          onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, include_dates: checked }))}
                        />
                        <Label htmlFor="include_dates">Incluir datas de criação e atualização</Label>
                      </div>

                      {exportConfig.include_dates && (
                        <div className="space-y-2">
                          <Label htmlFor="date_format">Formato da Data</Label>
                          <Select 
                            value={exportConfig.date_format} 
                            onValueChange={(value) => setExportConfig(prev => ({ ...prev, date_format: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="%d/%m/%Y">DD/MM/AAAA</SelectItem>
                              <SelectItem value="%Y-%m-%d">AAAA-MM-DD</SelectItem>
                              <SelectItem value="%m/%d/%Y">MM/DD/AAAA</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleExport} disabled={exporting || exportConfig.fields.length === 0}>
                        {exporting ? 'Exportando...' : 'Exportar CSV'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-blue-600" />
            <span>Instruções de Uso</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Importação CSV</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Formato aceito: arquivo .csv</li>
                <li>• Tamanho máximo: 10MB</li>
                <li>• Limite: 1000 registros por importação</li>
                <li>• Colunas esperadas: Nome, Contato, Telefone, Email, Endereço, Cidade, Estado, CEP</li>
                <li>• Encoding suportado: UTF-8 ou Latin1</li>
                <li>• Clientes duplicados (mesmo nome) são ignorados</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Exportação CSV</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Selecione os campos desejados</li>
                <li>• Opção de incluir datas de criação/atualização</li>
                <li>• Formato de data configurável</li>
                <li>• Download automático do arquivo</li>
                <li>• Nome do arquivo com timestamp</li>
                <li>• Compatível com Excel (UTF-8 com BOM)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsImportExport;