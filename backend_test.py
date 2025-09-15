import requests
import sys
import json
from datetime import datetime

class FavrettoAPITester:
    def __init__(self, base_url="https://orcasys-favretto.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.operator_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_client_id = None
        self.created_price_item_id = None
        self.created_budget_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
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
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 200:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin user info: {response.get('user', {})}")
            return True
        return False

    def test_operator_login(self):
        """Test operator login"""
        success, response = self.run_test(
            "Operator Login",
            "POST",
            "auth/login",
            200,
            data={"username": "operador", "password": "operador123"}
        )
        if success and 'access_token' in response:
            self.operator_token = response['access_token']
            print(f"   Operator user info: {response.get('user', {})}")
            return True
        return False

    def test_invalid_login(self):
        """Test invalid login credentials"""
        success, _ = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"username": "invalid", "password": "invalid"}
        )
        return success

    def test_auth_me_admin(self):
        """Test /auth/me endpoint with admin token"""
        success, response = self.run_test(
            "Auth Me (Admin)",
            "GET",
            "auth/me",
            200,
            token=self.admin_token
        )
        return success

    def test_auth_me_operator(self):
        """Test /auth/me endpoint with operator token"""
        success, response = self.run_test(
            "Auth Me (Operator)",
            "GET",
            "auth/me",
            200,
            token=self.operator_token
        )
        return success

    def test_create_client(self):
        """Test client creation"""
        client_data = {
            "name": "Empresa Teste LTDA",
            "contact_name": "João Silva",
            "phone": "(11) 99999-9999",
            "email": "joao@empresateste.com",
            "address": "Rua Teste, 123 - São Paulo, SP",
            "observations": "Cliente de teste criado automaticamente"
        }
        
        success, response = self.run_test(
            "Create Client",
            "POST",
            "clients",
            200,
            data=client_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.created_client_id = response['id']
            return True
        return False

    def test_get_clients(self):
        """Test getting all clients"""
        success, response = self.run_test(
            "Get All Clients",
            "GET",
            "clients",
            200,
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} clients")
            return True
        return False

    def test_get_client_by_id(self):
        """Test getting specific client"""
        if not self.created_client_id:
            print("❌ No client ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Client by ID",
            "GET",
            f"clients/{self.created_client_id}",
            200,
            token=self.admin_token
        )
        return success

    def test_update_client(self):
        """Test updating client"""
        if not self.created_client_id:
            print("❌ No client ID available for testing")
            return False
            
        update_data = {
            "observations": "Cliente atualizado via teste automatizado"
        }
        
        success, response = self.run_test(
            "Update Client",
            "PUT",
            f"clients/{self.created_client_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        return success

    def test_create_price_item_admin(self):
        """Test price table item creation as admin"""
        # Use timestamp to ensure unique code
        import time
        timestamp = str(int(time.time()))[-6:]
        
        item_data = {
            "code": f"TEST{timestamp}",
            "name": "Item de Teste Automatizado",
            "unit": "m²",
            "unit_price": 25.50,
            "category": "TESTE"
        }
        
        success, response = self.run_test(
            "Create Price Item (Admin)",
            "POST",
            "price-table",
            200,
            data=item_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.created_price_item_id = response['id']
            return True
        return False

    def test_create_price_item_operator(self):
        """Test price table item creation as operator (should fail)"""
        item_data = {
            "code": "TEST002",
            "name": "Item de Teste Operador",
            "unit": "m²",
            "unit_price": 30.00,
            "category": "TESTE"
        }
        
        success, response = self.run_test(
            "Create Price Item (Operator - Should Fail)",
            "POST",
            "price-table",
            403,
            data=item_data,
            token=self.operator_token
        )
        return success

    def test_get_price_table(self):
        """Test getting price table"""
        success, response = self.run_test(
            "Get Price Table",
            "GET",
            "price-table",
            200,
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} price items")
            return True
        return False

    def test_get_price_categories(self):
        """Test getting price categories"""
        success, response = self.run_test(
            "Get Price Categories",
            "GET",
            "price-table/categories",
            200,
            token=self.admin_token
        )
        return success

    def test_update_price_item_admin(self):
        """Test price table item update as admin"""
        if not self.created_price_item_id:
            print("❌ No price item ID available for testing")
            return False
            
        update_data = {
            "name": "Item de Teste Atualizado",
            "unit_price": 35.75
        }
        
        success, response = self.run_test(
            "Update Price Item (Admin)",
            "PUT",
            f"price-table/{self.created_price_item_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        return success

    def test_update_price_item_operator(self):
        """Test price table item update as operator (should fail)"""
        if not self.created_price_item_id:
            print("❌ No price item ID available for testing")
            return False
            
        update_data = {
            "name": "Tentativa de Atualização Operador",
            "unit_price": 40.00
        }
        
        success, response = self.run_test(
            "Update Price Item (Operator - Should Fail)",
            "PUT",
            f"price-table/{self.created_price_item_id}",
            403,
            data=update_data,
            token=self.operator_token
        )
        return success

    def test_delete_price_item_admin(self):
        """Test price table item deletion as admin (soft delete)"""
        if not self.created_price_item_id:
            print("❌ No price item ID available for testing")
            return False
            
        success, response = self.run_test(
            "Delete Price Item (Admin)",
            "DELETE",
            f"price-table/{self.created_price_item_id}",
            200,
            token=self.admin_token
        )
        return success

    def test_delete_price_item_operator(self):
        """Test price table item deletion as operator (should fail)"""
        # Create another item first for operator delete test
        import time
        timestamp = str(int(time.time()))[-6:]
        
        item_data = {
            "code": f"DEL{timestamp}",
            "name": "Item para Teste de Deleção",
            "unit": "un",
            "unit_price": 15.00,
            "category": "TESTE"
        }
        
        success, response = self.run_test(
            "Create Item for Delete Test",
            "POST",
            "price-table",
            200,
            data=item_data,
            token=self.admin_token
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create item for delete test")
            return False
            
        item_id = response['id']
        
        success, response = self.run_test(
            "Delete Price Item (Operator - Should Fail)",
            "DELETE",
            f"price-table/{item_id}",
            403,
            token=self.operator_token
        )
        return success

    def test_duplicate_code_validation(self):
        """Test that duplicate codes are rejected"""
        # First get existing items to find a code that exists
        try:
            response = self.run_test(
                "Get Existing Items for Duplicate Test",
                "GET",
                "price-table",
                200,
                token=self.admin_token
            )
            
            if response[0] and response[1] and len(response[1]) > 0:
                existing_code = response[1][0]['code']
                
                item_data = {
                    "code": existing_code,  # Use existing code
                    "name": "Item Duplicado",
                    "unit": "m²",
                    "unit_price": 50.00,
                    "category": "TESTE"
                }
                
                success, response = self.run_test(
                    "Create Duplicate Code Item (Should Fail)",
                    "POST",
                    "price-table",
                    400,
                    data=item_data,
                    token=self.admin_token
                )
                return success
            else:
                print("❌ No existing items found for duplicate test")
                return False
        except Exception as e:
            print(f"❌ Error in duplicate test: {e}")
            return False

    def test_get_budget_types(self):
        """Test getting budget types"""
        success, response = self.run_test(
            "Get Budget Types",
            "GET",
            "budget-types",
            200,
            token=self.admin_token
        )
        
        if success and 'budget_types' in response:
            print(f"   Available budget types: {[bt['value'] for bt in response['budget_types']]}")
            return True
        return False

    def test_create_budget(self):
        """Test budget creation"""
        if not self.created_client_id or not self.created_price_item_id:
            print("❌ Missing client or price item for budget creation")
            return False
            
        budget_data = {
            "client_id": self.created_client_id,
            "budget_type": "REMOÇÃO",
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item de Teste",
                    "quantity": 10.5,
                    "unit_price": 25.50,
                    "length": 5.0,
                    "height": 2.1,
                    "subtotal": 267.75
                }
            ],
            "installation_location": "São Paulo, SP",
            "travel_distance_km": 15.5,
            "observations": "Orçamento de teste criado automaticamente",
            "discount_percentage": 10.0
        }
        
        success, response = self.run_test(
            "Create Budget",
            "POST",
            "budgets",
            200,
            data=budget_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.created_budget_id = response['id']
            print(f"   Budget total: R$ {response.get('total', 0):.2f}")
            return True
        return False

    def test_get_budgets(self):
        """Test getting all budgets"""
        success, response = self.run_test(
            "Get All Budgets",
            "GET",
            "budgets",
            200,
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} budgets")
            return True
        return False

    def test_get_budget_by_id(self):
        """Test getting specific budget"""
        if not self.created_budget_id:
            print("❌ No budget ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Budget by ID",
            "GET",
            f"budgets/{self.created_budget_id}",
            200,
            token=self.admin_token
        )
        return success

    def test_canvas_colors_initialize(self):
        """Test canvas colors initialization"""
        success, response = self.run_test(
            "Initialize Canvas Colors",
            "POST",
            "canvas-colors/initialize",
            200,
            token=self.admin_token
        )
        return success

    def test_get_canvas_colors(self):
        """Test getting canvas colors"""
        success, response = self.run_test(
            "Get Canvas Colors",
            "GET",
            "canvas-colors",
            200,
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} canvas colors")
            expected_colors = ["BRANCA", "PRETA", "AZUL", "VERDE", "AMARELA", "VERMELHA"]
            found_colors = [color['name'] for color in response]
            print(f"   Colors: {found_colors}")
            return True
        return False

    def test_create_canvas_color(self):
        """Test creating new canvas color"""
        color_data = {
            "name": "ROSA",
            "hex_code": "#FF69B4"
        }
        
        success, response = self.run_test(
            "Create Canvas Color",
            "POST",
            "canvas-colors",
            200,
            data=color_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.created_color_id = response['id']
            return True
        return False

    def test_update_canvas_color(self):
        """Test updating canvas color"""
        if not hasattr(self, 'created_color_id') or not self.created_color_id:
            print("❌ No color ID available for testing")
            return False
            
        update_data = {
            "name": "ROSA CLARO",
            "hex_code": "#FFB6C1"
        }
        
        success, response = self.run_test(
            "Update Canvas Color",
            "PUT",
            f"canvas-colors/{self.created_color_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        return success

    def test_delete_canvas_color(self):
        """Test deleting canvas color (soft delete)"""
        if not hasattr(self, 'created_color_id') or not self.created_color_id:
            print("❌ No color ID available for testing")
            return False
            
        success, response = self.run_test(
            "Delete Canvas Color",
            "DELETE",
            f"canvas-colors/{self.created_color_id}",
            200,
            token=self.admin_token
        )
        return success

    def test_duplicate_canvas_color(self):
        """Test duplicate canvas color validation"""
        color_data = {
            "name": "BRANCA",  # Should already exist
            "hex_code": "#FFFFFF"
        }
        
        success, response = self.run_test(
            "Create Duplicate Canvas Color (Should Fail)",
            "POST",
            "canvas-colors",
            400,
            data=color_data,
            token=self.admin_token
        )
        return success

    def test_create_budget_with_new_fields(self):
        """Test budget creation with new fields (area_m2, canvas_color, print_percentage)"""
        if not self.created_client_id or not self.created_price_item_id:
            print("❌ Missing client or price item for budget creation")
            return False
            
        budget_data = {
            "client_id": self.created_client_id,
            "budget_type": "PLOTAGEM ADESIVO",
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item com Novos Campos",
                    "quantity": 5.0,
                    "unit_price": 30.00,
                    "length": 4.0,
                    "height": 2.5,
                    "width": 1.0,
                    "area_m2": 1.0,  # (4.0 * 2.5 * 1.0) / 10000 = 0.001, but let's use 1.0 for testing
                    "canvas_color": "BRANCA",
                    "print_percentage": 75.0,
                    "subtotal": 150.00
                }
            ],
            "installation_location": "Rio de Janeiro, RJ",
            "travel_distance_km": 25.0,
            "observations": "Orçamento com novos campos de teste",
            "discount_percentage": 5.0
        }
        
        success, response = self.run_test(
            "Create Budget with New Fields",
            "POST",
            "budgets",
            200,
            data=budget_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.created_budget_with_fields_id = response['id']
            print(f"   Budget with new fields total: R$ {response.get('total', 0):.2f}")
            # Verify new fields are present
            if response.get('items') and len(response['items']) > 0:
                item = response['items'][0]
                print(f"   Item area_m2: {item.get('area_m2')}")
                print(f"   Item canvas_color: {item.get('canvas_color')}")
                print(f"   Item print_percentage: {item.get('print_percentage')}")
            return True
        return False

    def test_duplicate_budget(self):
        """Test budget duplication"""
        if not self.created_budget_id:
            print("❌ No budget ID available for duplication test")
            return False
            
        success, response = self.run_test(
            "Duplicate Budget",
            "POST",
            f"budgets/{self.created_budget_id}/duplicate",
            200,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.duplicated_budget_id = response['id']
            print(f"   Duplicated budget ID: {self.duplicated_budget_id}")
            print(f"   Original budget ID: {response.get('original_budget_id')}")
            print(f"   Status: {response.get('status')}")
            print(f"   Version: {response.get('version')}")
            return True
        return False

    def test_budget_history(self):
        """Test budget history retrieval"""
        if not self.created_budget_id:
            print("❌ No budget ID available for history test")
            return False
            
        success, response = self.run_test(
            "Get Budget History",
            "GET",
            f"budgets/{self.created_budget_id}/history",
            200,
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} history entries")
            for entry in response[:2]:  # Show first 2 entries
                print(f"   - {entry.get('changes', {}).get('action', 'unknown')} by {entry.get('changed_by')} at {entry.get('created_at')}")
            return True
        return False

    def test_budget_filters(self):
        """Test budget filtering"""
        # Test filter by client
        success, response = self.run_test(
            "Filter Budgets by Client",
            "GET",
            f"budgets?client_id={self.created_client_id}",
            200,
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} budgets for client")
            
        # Test filter by status
        success2, response2 = self.run_test(
            "Filter Budgets by Status",
            "GET",
            "budgets?status=DRAFT",
            200,
            token=self.admin_token
        )
        
        if success2 and isinstance(response2, list):
            print(f"   Found {len(response2)} DRAFT budgets")
            
        return success and success2

    def test_client_duplicate_validation(self):
        """Test client duplicate validation (name and phone)"""
        # Try to create client with same name
        client_data = {
            "name": "Empresa Teste LTDA",  # Same name as created client
            "contact_name": "Maria Santos",
            "phone": "(11) 88888-8888",
            "email": "maria@empresateste.com"
        }
        
        success, response = self.run_test(
            "Create Client with Duplicate Name (Should Fail)",
            "POST",
            "clients",
            400,
            data=client_data,
            token=self.admin_token
        )
        
        # Try to create client with same phone
        client_data2 = {
            "name": "Outra Empresa LTDA",
            "contact_name": "Pedro Costa",
            "phone": "(11) 99999-9999",  # Same phone as created client
            "email": "pedro@outraempresa.com"
        }
        
        success2, response2 = self.run_test(
            "Create Client with Duplicate Phone (Should Fail)",
            "POST",
            "clients",
            400,
            data=client_data2,
            token=self.admin_token
        )
        
        return success and success2

    def test_client_with_new_fields(self):
        """Test client creation with new address fields"""
        client_data = {
            "name": "Cliente Completo LTDA",
            "contact_name": "Ana Silva",
            "phone": "(11) 77777-7777",
            "email": "ana@clientecompleto.com",
            "address": "Rua das Flores, 456",
            "city": "São Paulo",
            "state": "SP",
            "zip_code": "01234-567",
            "observations": "Cliente com todos os campos preenchidos"
        }
        
        success, response = self.run_test(
            "Create Client with New Address Fields",
            "POST",
            "clients",
            200,
            data=client_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.created_complete_client_id = response['id']
            print(f"   Client city: {response.get('city')}")
            print(f"   Client state: {response.get('state')}")
            print(f"   Client zip_code: {response.get('zip_code')}")
            return True
        return False

    def test_delete_client(self):
        """Test client deletion"""
        if not self.created_client_id:
            print("❌ No client ID available for testing")
            return False
            
        success, response = self.run_test(
            "Delete Client",
            "DELETE",
            f"clients/{self.created_client_id}",
            200,
            token=self.admin_token
        )
        return success

    def test_delete_complete_client(self):
        """Test deletion of complete client"""
        if not hasattr(self, 'created_complete_client_id') or not self.created_complete_client_id:
            print("❌ No complete client ID available for testing")
            return False
            
        success, response = self.run_test(
            "Delete Complete Client",
            "DELETE",
            f"clients/{self.created_complete_client_id}",
            200,
            token=self.admin_token
        )
        return success

def main():
    print("🚀 Starting Favretto API Tests - COMPREHENSIVE TESTING")
    print("=" * 60)
    
    tester = FavrettoAPITester()
    
    # Authentication tests
    print("\n📋 AUTHENTICATION TESTS")
    print("-" * 30)
    
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
        
    if not tester.test_operator_login():
        print("❌ Operator login failed, stopping tests")
        return 1
    
    tester.test_invalid_login()
    tester.test_auth_me_admin()
    tester.test_auth_me_operator()
    
    # Canvas Colors tests (NEW FEATURE)
    print("\n📋 CANVAS COLORS TESTS (NEW FEATURE)")
    print("-" * 40)
    
    tester.test_canvas_colors_initialize()
    tester.test_get_canvas_colors()
    tester.test_create_canvas_color()
    tester.test_update_canvas_color()
    tester.test_duplicate_canvas_color()  # Should fail
    tester.test_delete_canvas_color()
    
    # Client management tests (ENHANCED)
    print("\n📋 CLIENT MANAGEMENT TESTS (ENHANCED)")
    print("-" * 40)
    
    tester.test_create_client()
    tester.test_client_with_new_fields()  # NEW: city, state, zip_code
    tester.test_get_clients()
    tester.test_get_client_by_id()
    tester.test_update_client()
    tester.test_client_duplicate_validation()  # NEW: name/phone validation
    
    # Price table tests
    print("\n📋 PRICE TABLE TESTS")
    print("-" * 30)
    
    tester.test_create_price_item_admin()
    tester.test_create_price_item_operator()  # Should fail
    tester.test_get_price_table()
    tester.test_get_price_categories()
    tester.test_update_price_item_admin()
    tester.test_update_price_item_operator()  # Should fail
    tester.test_duplicate_code_validation()  # Should fail
    tester.test_delete_price_item_operator()  # Should fail
    tester.test_delete_price_item_admin()  # Should succeed
    
    # Budget tests (ENHANCED)
    print("\n📋 BUDGET TESTS (ENHANCED)")
    print("-" * 30)
    
    tester.test_get_budget_types()
    tester.test_create_budget()
    tester.test_create_budget_with_new_fields()  # NEW: area_m2, canvas_color, print_percentage
    tester.test_get_budgets()
    tester.test_get_budget_by_id()
    tester.test_budget_filters()  # NEW: client_id, status filters
    tester.test_duplicate_budget()  # NEW: duplication feature
    tester.test_budget_history()  # NEW: history tracking
    
    # Cleanup
    print("\n📋 CLEANUP TESTS")
    print("-" * 30)
    
    tester.test_delete_client()
    tester.test_delete_complete_client()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())