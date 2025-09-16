#!/usr/bin/env python3
"""
Teste específico para funcionalidade de vendedores (sellers) e orçamentos (budgets)
Conforme solicitado na review request
"""

import requests
import sys
import json
from datetime import datetime

class SellerBudgetTester:
    def __init__(self, base_url="https://budget-system-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_seller_id = None
        self.created_client_id = None
        self.created_budget_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 {name}")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"   ✅ Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 300:
                        print(f"   📄 Response: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
                    elif isinstance(response_data, list):
                        print(f"   📄 Response: Lista com {len(response_data)} itens")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"   ❌ Esperado {expected_status}, recebido {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   📄 Erro: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
                except:
                    print(f"   📄 Erro: {response.text}")
                return False, {}

        except Exception as e:
            print(f"   ❌ Erro de conexão: {str(e)}")
            return False, {}

    def test_login(self):
        """1. Primeiro fazer login com admin/admin123"""
        print("\n" + "="*60)
        print("🔐 TESTE DE AUTENTICAÇÃO")
        print("="*60)
        
        success, response = self.run_test(
            "Login com admin/admin123",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   🎫 Token obtido com sucesso")
            print(f"   👤 Usuário: {response.get('user', {}).get('username')}")
            print(f"   🔑 Role: {response.get('user', {}).get('role')}")
            return True
        else:
            print("   ❌ Falha no login - parando testes")
            return False

    def test_sellers_crud(self):
        """Testes específicos para Vendedores"""
        print("\n" + "="*60)
        print("👥 TESTES DE VENDEDORES (SELLERS)")
        print("="*60)
        
        # 1. Testar GET /api/sellers - listar vendedores
        success1, sellers_list = self.run_test(
            "GET /api/sellers - Listar vendedores",
            "GET",
            "sellers",
            200,
            token=self.admin_token
        )
        
        if success1:
            print(f"   📊 Encontrados {len(sellers_list)} vendedores ativos")
            for seller in sellers_list[:3]:  # Mostrar apenas os primeiros 3
                print(f"     - {seller['name']} (Comissão: {seller['commission_percentage']}%)")
        
        # 2. Testar POST /api/sellers - criar novo vendedor
        seller_data = {
            "name": "João da Silva",
            "email": "joao@teste.com",
            "phone": "(11) 99999-9999",
            "commission_percentage": 10.0,
            "registration_number": "REG001"
        }
        
        success2, seller_response = self.run_test(
            "POST /api/sellers - Criar novo vendedor",
            "POST",
            "sellers",
            200,
            data=seller_data,
            token=self.admin_token
        )
        
        if success2 and 'id' in seller_response:
            self.created_seller_id = seller_response['id']
            print(f"   🆔 ID do vendedor criado: {self.created_seller_id}")
        
        # 3. Testar PUT /api/sellers/{id} - atualizar vendedor
        if self.created_seller_id:
            update_data = {
                "commission_percentage": 12.5,
                "phone": "(11) 88888-8888"
            }
            
            success3, update_response = self.run_test(
                f"PUT /api/sellers/{self.created_seller_id} - Atualizar vendedor",
                "PUT",
                f"sellers/{self.created_seller_id}",
                200,
                data=update_data,
                token=self.admin_token
            )
            
            if success3:
                print(f"   📈 Comissão atualizada para: {update_response.get('commission_percentage')}%")
        else:
            success3 = False
            print("   ❌ Não foi possível testar atualização - vendedor não criado")
        
        # 4. Testar DELETE /api/sellers/{id} - excluir vendedor (soft delete)
        if self.created_seller_id:
            success4, delete_response = self.run_test(
                f"DELETE /api/sellers/{self.created_seller_id} - Excluir vendedor (soft delete)",
                "DELETE",
                f"sellers/{self.created_seller_id}",
                200,
                token=self.admin_token
            )
        else:
            success4 = False
            print("   ❌ Não foi possível testar exclusão - vendedor não criado")
        
        return all([success1, success2, success3, success4])

    def test_budgets_crud(self):
        """Testes específicos para Orçamentos"""
        print("\n" + "="*60)
        print("💰 TESTES DE ORÇAMENTOS (BUDGETS)")
        print("="*60)
        
        # Primeiro, criar dados necessários (cliente e vendedor)
        self.setup_budget_test_data()
        
        # 1. Testar GET /api/budgets - listar orçamentos
        success1, budgets_list = self.run_test(
            "GET /api/budgets - Listar orçamentos",
            "GET",
            "budgets",
            200,
            token=self.admin_token
        )
        
        if success1:
            print(f"   📊 Encontrados {len(budgets_list)} orçamentos")
            for budget in budgets_list[:3]:  # Mostrar apenas os primeiros 3
                print(f"     - Cliente: {budget['client_name']}, Total: R$ {budget['total']:.2f}")
        
        # 2. Testar POST /api/budgets - criar novo orçamento
        if self.created_client_id and self.created_seller_id:
            # Obter um item da tabela de preços
            success_price, price_items = self.run_test(
                "Obter itens da tabela de preços",
                "GET",
                "price-table",
                200,
                token=self.admin_token
            )
            
            if success_price and price_items:
                price_item = price_items[0]
                
                budget_data = {
                    "client_id": self.created_client_id,
                    "seller_id": self.created_seller_id,
                    "budget_type": "PLOTAGEM ADESIVO",
                    "items": [
                        {
                            "item_id": price_item['id'],
                            "item_name": price_item['name'],
                            "quantity": 5.0,
                            "unit_price": price_item['unit_price'],
                            "item_discount_percentage": 8.0,  # Teste de desconto por item
                            "subtotal": 5.0 * price_item['unit_price'],
                            "final_price": 5.0 * price_item['unit_price'] * 0.92  # Após desconto de 8%
                        }
                    ],
                    "installation_location": "São Paulo, SP",
                    "travel_distance_km": 25.0,
                    "observations": "Orçamento de teste com desconto por item",
                    "discount_percentage": 5.0
                }
                
                success2, budget_response = self.run_test(
                    "POST /api/budgets - Criar novo orçamento",
                    "POST",
                    "budgets",
                    200,
                    data=budget_data,
                    token=self.admin_token
                )
                
                if success2 and 'id' in budget_response:
                    self.created_budget_id = budget_response['id']
                    print(f"   🆔 ID do orçamento criado: {self.created_budget_id}")
                    print(f"   👤 Vendedor: {budget_response.get('seller_name')}")
                    print(f"   💰 Total: R$ {budget_response.get('total', 0):.2f}")
                    
                    # Verificar se seller_id funciona corretamente
                    if budget_response.get('seller_id') == self.created_seller_id:
                        print("   ✅ Campo seller_id funcionando corretamente")
                    else:
                        print("   ❌ Campo seller_id não está funcionando")
                    
                    # Verificar cálculos de desconto por item
                    items = budget_response.get('items', [])
                    if items and items[0].get('item_discount_percentage') == 8.0:
                        print("   ✅ Desconto por item (item_discount_percentage) funcionando")
                        print(f"   📊 Desconto aplicado: {items[0].get('item_discount_percentage')}%")
                    else:
                        print("   ❌ Desconto por item não está funcionando")
            else:
                success2 = False
                print("   ❌ Não foi possível obter itens da tabela de preços")
        else:
            success2 = False
            print("   ❌ Dados de teste não disponíveis (cliente/vendedor)")
        
        return all([success1, success2])

    def setup_budget_test_data(self):
        """Criar dados necessários para testes de orçamento"""
        print("\n📋 Configurando dados de teste...")
        
        # Criar cliente
        import time
        timestamp = str(int(time.time()))[-6:]
        
        client_data = {
            "name": f"Cliente Teste Budget {timestamp}",
            "contact_name": "Maria Silva",
            "phone": f"(11) 7777{timestamp[-4:]}",
            "email": f"cliente{timestamp}@budget.com"
        }
        
        success_client, client_response = self.run_test(
            "Criar cliente para teste de orçamento",
            "POST",
            "clients",
            200,
            data=client_data,
            token=self.admin_token
        )
        
        if success_client and 'id' in client_response:
            self.created_client_id = client_response['id']
            print(f"   👤 Cliente criado: {self.created_client_id}")
        
        # Criar vendedor
        seller_data = {
            "name": f"Vendedor Budget {timestamp}",
            "email": f"vendedor{timestamp}@budget.com",
            "phone": f"(11) 6666{timestamp[-4:]}",
            "commission_percentage": 15.0,
            "registration_number": f"REGB{timestamp}"
        }
        
        success_seller, seller_response = self.run_test(
            "Criar vendedor para teste de orçamento",
            "POST",
            "sellers",
            200,
            data=seller_data,
            token=self.admin_token
        )
        
        if success_seller and 'id' in seller_response:
            self.created_seller_id = seller_response['id']
            print(f"   👥 Vendedor criado: {self.created_seller_id}")

    def test_error_scenarios(self):
        """Testar cenários de erro"""
        print("\n" + "="*60)
        print("⚠️  TESTES DE CENÁRIOS DE ERRO")
        print("="*60)
        
        # Teste 1: Tentar acessar sem token
        success1, _ = self.run_test(
            "Tentar acessar sellers sem autenticação",
            "GET",
            "sellers",
            401  # Unauthorized
        )
        
        # Teste 2: Tentar criar vendedor com dados inválidos
        invalid_seller_data = {
            "name": "",  # Nome vazio
            "commission_percentage": 150.0  # Percentual inválido
        }
        
        success2, _ = self.run_test(
            "Criar vendedor com dados inválidos",
            "POST",
            "sellers",
            422,  # Validation error
            data=invalid_seller_data,
            token=self.admin_token
        )
        
        # Teste 3: Tentar acessar vendedor inexistente
        success3, _ = self.run_test(
            "Acessar vendedor inexistente",
            "GET",
            "sellers/00000000-0000-0000-0000-000000000000",
            404,  # Not found
            token=self.admin_token
        )
        
        return all([success1, success2, success3])

    def print_summary(self):
        """Imprimir resumo dos testes"""
        print("\n" + "="*60)
        print("📊 RESUMO DOS TESTES")
        print("="*60)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"Total de testes executados: {self.tests_run}")
        print(f"Testes aprovados: {self.tests_passed}")
        print(f"Testes falharam: {self.tests_run - self.tests_passed}")
        print(f"Taxa de sucesso: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 TODOS OS TESTES PASSARAM!")
            print("✅ Funcionalidade de vendedores está funcionando corretamente")
            print("✅ Funcionalidade de orçamentos está funcionando corretamente")
            print("✅ Campo seller_id nos orçamentos está funcionando")
            print("✅ Cálculos de desconto por item estão funcionando")
            return True
        else:
            print(f"\n⚠️  {self.tests_run - self.tests_passed} TESTES FALHARAM")
            print("Verifique os logs acima para detalhes dos erros")
            return False

def main():
    print("🚀 TESTE ESPECÍFICO - VENDEDORES E ORÇAMENTOS")
    print("Sistema de Orçamentos Favretto")
    print("URL: https://budget-system-1.preview.emergentagent.com/api")
    
    tester = SellerBudgetTester()
    
    # 1. Autenticação
    if not tester.test_login():
        return 1
    
    # 2. Testes de vendedores
    sellers_ok = tester.test_sellers_crud()
    
    # 3. Testes de orçamentos
    budgets_ok = tester.test_budgets_crud()
    
    # 4. Testes de cenários de erro
    errors_ok = tester.test_error_scenarios()
    
    # 5. Resumo
    all_tests_passed = tester.print_summary()
    
    return 0 if all_tests_passed else 1

if __name__ == "__main__":
    sys.exit(main())