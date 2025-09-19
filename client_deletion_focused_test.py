import requests
import sys
import json
from datetime import datetime

class ClientDeletionFocusedTester:
    def __init__(self, base_url="https://budget-system-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if params:
            url += "?" + "&".join([f"{k}={v}" for k, v in params.items()])
            
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
                    print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                    return False, error_data
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
            return True
        return False

    def test_client_deletion_scenarios(self):
        """Test all client deletion scenarios"""
        
        # Test 1: Create and delete client without dependencies
        print("\n📋 TEST 1: CLIENT WITHOUT DEPENDENCIES")
        print("-" * 50)
        
        client_data = {
            "name": "Cliente Teste Exclusão Simples",
            "contact_name": "João Teste",
            "phone": "(11) 11111-1111",
            "email": "joao.teste@exclusao.com"
        }
        
        success, response = self.run_test(
            "Create Client Without Dependencies",
            "POST",
            "clients",
            200,
            data=client_data,
            token=self.admin_token
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create client for test 1")
            return False
            
        client_id = response['id']
        
        # Delete the client (should succeed)
        success, response = self.run_test(
            "Delete Client Without Dependencies",
            "DELETE",
            f"clients/{client_id}",
            200,
            token=self.admin_token
        )
        
        if success:
            print(f"✅ Test 1 PASSED: Client deleted successfully")
            print(f"   Message: {response.get('message')}")
            print(f"   Budgets deleted: {response.get('budgets_deleted', 0)}")
        
        # Test 2: Create client with budget and try to delete without force
        print("\n📋 TEST 2: CLIENT WITH DEPENDENCIES (NO FORCE)")
        print("-" * 50)
        
        client_data2 = {
            "name": "Cliente Com Orçamento Teste",
            "contact_name": "Maria Teste",
            "phone": "(11) 22222-2222",
            "email": "maria.teste@comorcamento.com"
        }
        
        success, response = self.run_test(
            "Create Client With Dependencies",
            "POST",
            "clients",
            200,
            data=client_data2,
            token=self.admin_token
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create client for test 2")
            return False
            
        client_id2 = response['id']
        
        # Create a budget for this client
        budget_data = {
            "client_id": client_id2,
            "budget_type": "REMOÇÃO",
            "items": [
                {
                    "item_id": "test-item-exclusao",
                    "item_name": "Item Teste Exclusão",
                    "quantity": 1.0,
                    "unit_price": 100.00,
                    "subtotal": 100.00
                }
            ],
            "discount_percentage": 0.0
        }
        
        success, response = self.run_test(
            "Create Budget for Client",
            "POST",
            "budgets",
            200,
            data=budget_data,
            token=self.admin_token
        )
        
        if not success:
            print("❌ Failed to create budget for test 2")
            return False
        
        # Try to delete client without force (should fail)
        success, response = self.run_test(
            "Delete Client With Dependencies (No Force)",
            "DELETE",
            f"clients/{client_id2}",
            400,  # Should fail
            token=self.admin_token
        )
        
        if success:
            print(f"✅ Test 2 PASSED: Deletion correctly prevented due to dependencies")
            print(f"   Error message: {response.get('detail')}")
        
        # Test 3: Delete client with dependencies using force_delete=true
        print("\n📋 TEST 3: CLIENT WITH DEPENDENCIES (FORCE DELETE)")
        print("-" * 50)
        
        success, response = self.run_test(
            "Delete Client With Dependencies (Force Delete)",
            "DELETE",
            f"clients/{client_id2}",
            200,
            token=self.admin_token,
            params={"force_delete": "true"}
        )
        
        if success:
            print(f"✅ Test 3 PASSED: Client force deleted successfully")
            print(f"   Message: {response.get('message')}")
            print(f"   Budgets deleted: {response.get('budgets_deleted', 0)}")
        
        # Test 4: Delete non-existent client
        print("\n📋 TEST 4: NON-EXISTENT CLIENT")
        print("-" * 50)
        
        success, response = self.run_test(
            "Delete Non-existent Client",
            "DELETE",
            "clients/non-existent-id-12345",
            404,
            token=self.admin_token
        )
        
        if success:
            print(f"✅ Test 4 PASSED: Correctly returned 404 for non-existent client")
            print(f"   Error message: {response.get('detail')}")
        
        # Test 5: Delete without authentication
        print("\n📋 TEST 5: AUTHENTICATION REQUIRED")
        print("-" * 50)
        
        # Create a client first
        client_data3 = {
            "name": "Cliente Teste Auth",
            "contact_name": "Pedro Teste",
            "phone": "(11) 33333-3333",
            "email": "pedro.teste@auth.com"
        }
        
        success, response = self.run_test(
            "Create Client for Auth Test",
            "POST",
            "clients",
            200,
            data=client_data3,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            client_id3 = response['id']
            
            # Try to delete without token
            success, response = self.run_test(
                "Delete Client Without Authentication",
                "DELETE",
                f"clients/{client_id3}",
                403,
                token=None  # No token
            )
            
            if success:
                print(f"✅ Test 5 PASSED: Correctly prevented deletion without authentication")
                print(f"   Error message: {response.get('detail')}")
            
            # Clean up
            self.run_test(
                "Cleanup Auth Test Client",
                "DELETE",
                f"clients/{client_id3}",
                200,
                token=self.admin_token
            )
        
        # Test 6: Parameter validation
        print("\n📋 TEST 6: PARAMETER VALIDATION")
        print("-" * 50)
        
        # Create client with budget for parameter test
        client_data4 = {
            "name": "Cliente Teste Parâmetros",
            "contact_name": "Ana Teste",
            "phone": "(11) 44444-4444",
            "email": "ana.teste@parametros.com"
        }
        
        success, response = self.run_test(
            "Create Client for Parameter Test",
            "POST",
            "clients",
            200,
            data=client_data4,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            client_id4 = response['id']
            
            # Create budget
            budget_data2 = {
                "client_id": client_id4,
                "budget_type": "IMPLANTAÇÃO AUTOMIDIA",
                "items": [
                    {
                        "item_id": "test-param-item",
                        "item_name": "Item Teste Parâmetros",
                        "quantity": 1.0,
                        "unit_price": 50.00,
                        "subtotal": 50.00
                    }
                ],
                "discount_percentage": 0.0
            }
            
            self.run_test(
                "Create Budget for Parameter Test",
                "POST",
                "budgets",
                200,
                data=budget_data2,
                token=self.admin_token
            )
            
            # Test with force_delete=false (explicit)
            success, response = self.run_test(
                "Delete Client With force_delete=false",
                "DELETE",
                f"clients/{client_id4}",
                400,  # Should fail due to dependencies
                token=self.admin_token,
                params={"force_delete": "false"}
            )
            
            if success:
                print(f"✅ Test 6a PASSED: force_delete=false correctly prevented deletion")
                print(f"   Error message: {response.get('detail')}")
            
            # Test with invalid force_delete parameter (should return 422)
            success, response = self.run_test(
                "Delete Client With Invalid force_delete Parameter",
                "DELETE",
                f"clients/{client_id4}",
                422,  # Pydantic validation error
                token=self.admin_token,
                params={"force_delete": "invalid"}
            )
            
            if success:
                print(f"✅ Test 6b PASSED: Invalid parameter correctly rejected")
                print(f"   Error details: {response.get('detail', [{}])[0].get('msg', 'N/A')}")
            
            # Clean up
            self.run_test(
                "Cleanup Parameter Test Client",
                "DELETE",
                f"clients/{client_id4}",
                200,
                token=self.admin_token,
                params={"force_delete": "true"}
            )
        
        return True

def main():
    print("🚀 Starting Focused Client Deletion Tests")
    print("=" * 60)
    
    tester = ClientDeletionFocusedTester()
    
    # Authentication
    print("\n📋 AUTHENTICATION")
    print("-" * 30)
    
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    # Run all deletion tests
    tester.test_client_deletion_scenarios()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All client deletion tests passed!")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"⚠️  {failed_tests} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())