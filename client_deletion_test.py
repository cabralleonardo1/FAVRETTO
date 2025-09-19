import requests
import sys
import json
from datetime import datetime

class ClientDeletionTester:
    def __init__(self, base_url="https://budget-system-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_client_ids = []
        self.test_budget_ids = []
        self.test_seller_id = None

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
                    if isinstance(response_data, dict) and len(str(response_data)) < 300:
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
            print(f"   Admin user info: {response.get('user', {})}")
            return True
        return False

    def setup_test_data(self):
        """Create test clients, seller, and budgets for deletion testing"""
        print("\n📋 SETTING UP TEST DATA")
        print("-" * 40)
        
        # Create a test seller first
        seller_data = {
            "name": "Vendedor Teste Exclusão",
            "email": "vendedor.exclusao@teste.com",
            "phone": "(11) 99999-1111",
            "commission_percentage": 10.0,
            "registration_number": "REG_DEL_001"
        }
        
        success, response = self.run_test(
            "Create Test Seller",
            "POST",
            "sellers",
            200,
            data=seller_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.test_seller_id = response['id']
            print(f"   Created seller ID: {self.test_seller_id}")
        else:
            print("❌ Failed to create test seller")
            return False

        # Create test clients
        test_clients = [
            {
                "name": "Cliente Sem Dependências",
                "contact_name": "João Silva",
                "phone": "(11) 11111-1111",
                "email": "joao@semdep.com"
            },
            {
                "name": "Cliente Com Orçamentos Aprovados",
                "contact_name": "Maria Santos",
                "phone": "(11) 22222-2222", 
                "email": "maria@comorcamentos.com"
            },
            {
                "name": "Cliente Com Orçamentos Pendentes",
                "contact_name": "Pedro Costa",
                "phone": "(11) 33333-3333",
                "email": "pedro@pendentes.com"
            },
            {
                "name": "Cliente Com Orçamentos Mistos",
                "contact_name": "Ana Lima",
                "phone": "(11) 44444-4444",
                "email": "ana@mistos.com"
            }
        ]
        
        for i, client_data in enumerate(test_clients):
            success, response = self.run_test(
                f"Create Test Client {i+1}",
                "POST",
                "clients",
                200,
                data=client_data,
                token=self.admin_token
            )
            
            if success and 'id' in response:
                self.test_client_ids.append(response['id'])
                print(f"   Created client ID: {response['id']} - {client_data['name']}")
            else:
                print(f"❌ Failed to create test client {i+1}")
                return False

        # Create budgets for testing dependencies
        if len(self.test_client_ids) >= 4:
            # Client 2: Approved budgets
            budget_data_approved = {
                "client_id": self.test_client_ids[1],
                "seller_id": self.test_seller_id,
                "budget_type": "REMOÇÃO",
                "items": [
                    {
                        "item_id": "test-item-1",
                        "item_name": "Item Teste Aprovado",
                        "quantity": 5.0,
                        "unit_price": 100.00,
                        "subtotal": 500.00
                    }
                ],
                "discount_percentage": 0.0
            }
            
            success, response = self.run_test(
                "Create Approved Budget",
                "POST",
                "budgets",
                200,
                data=budget_data_approved,
                token=self.admin_token
            )
            
            if success and 'id' in response:
                budget_id = response['id']
                self.test_budget_ids.append(budget_id)
                
                # Update status to APPROVED
                status_data = {"status": "APPROVED"}
                self.run_test(
                    "Update Budget to APPROVED",
                    "PATCH",
                    f"budgets/{budget_id}/status",
                    200,
                    data=status_data,
                    token=self.admin_token
                )

            # Client 3: Pending budgets
            budget_data_pending = {
                "client_id": self.test_client_ids[2],
                "seller_id": self.test_seller_id,
                "budget_type": "IMPLANTAÇÃO AUTOMIDIA",
                "items": [
                    {
                        "item_id": "test-item-2",
                        "item_name": "Item Teste Pendente",
                        "quantity": 3.0,
                        "unit_price": 150.00,
                        "subtotal": 450.00
                    }
                ],
                "discount_percentage": 5.0
            }
            
            success, response = self.run_test(
                "Create Pending Budget",
                "POST",
                "budgets",
                200,
                data=budget_data_pending,
                token=self.admin_token
            )
            
            if success and 'id' in response:
                self.test_budget_ids.append(response['id'])

            # Client 4: Mixed budgets (approved + pending)
            # Approved budget
            budget_data_mixed_approved = {
                "client_id": self.test_client_ids[3],
                "seller_id": self.test_seller_id,
                "budget_type": "TROCA",
                "items": [
                    {
                        "item_id": "test-item-3",
                        "item_name": "Item Misto Aprovado",
                        "quantity": 2.0,
                        "unit_price": 200.00,
                        "subtotal": 400.00
                    }
                ],
                "discount_percentage": 10.0
            }
            
            success, response = self.run_test(
                "Create Mixed Budget (Approved)",
                "POST",
                "budgets",
                200,
                data=budget_data_mixed_approved,
                token=self.admin_token
            )
            
            if success and 'id' in response:
                budget_id = response['id']
                self.test_budget_ids.append(budget_id)
                
                # Update status to APPROVED
                status_data = {"status": "APPROVED"}
                self.run_test(
                    "Update Mixed Budget to APPROVED",
                    "PATCH",
                    f"budgets/{budget_id}/status",
                    200,
                    data=status_data,
                    token=self.admin_token
                )

            # Pending budget for same client
            budget_data_mixed_pending = {
                "client_id": self.test_client_ids[3],
                "seller_id": self.test_seller_id,
                "budget_type": "PLOTAGEM ADESIVO",
                "items": [
                    {
                        "item_id": "test-item-4",
                        "item_name": "Item Misto Pendente",
                        "quantity": 4.0,
                        "unit_price": 75.00,
                        "subtotal": 300.00
                    }
                ],
                "discount_percentage": 0.0
            }
            
            success, response = self.run_test(
                "Create Mixed Budget (Pending)",
                "POST",
                "budgets",
                200,
                data=budget_data_mixed_pending,
                token=self.admin_token
            )
            
            if success and 'id' in response:
                self.test_budget_ids.append(response['id'])

        print(f"   Created {len(self.test_client_ids)} test clients")
        print(f"   Created {len(self.test_budget_ids)} test budgets")
        return True

    def test_delete_client_without_dependencies(self):
        """Test 1: Delete client without dependencies (should succeed)"""
        if not self.test_client_ids:
            print("❌ No test clients available")
            return False
            
        client_id = self.test_client_ids[0]  # Client without dependencies
        
        success, response = self.run_test(
            "Delete Client Without Dependencies",
            "DELETE",
            f"clients/{client_id}",
            200,
            token=self.admin_token
        )
        
        if success:
            print(f"   ✅ Successfully deleted client without dependencies")
            print(f"   Message: {response.get('message', 'N/A')}")
            print(f"   Budgets deleted: {response.get('budgets_deleted', 0)}")
        
        return success

    def test_delete_client_with_dependencies_no_force(self):
        """Test 2: Delete client with dependencies without force_delete (should fail)"""
        if len(self.test_client_ids) < 2:
            print("❌ Not enough test clients available")
            return False
            
        client_id = self.test_client_ids[1]  # Client with approved budgets
        
        success, response = self.run_test(
            "Delete Client With Dependencies (No Force)",
            "DELETE",
            f"clients/{client_id}",
            400,  # Should fail with 400
            token=self.admin_token
        )
        
        if success:  # Success means it failed as expected (400 status)
            print(f"   ✅ Correctly prevented deletion due to dependencies")
            print(f"   Error message: {response.get('detail', 'N/A')}")
        
        return success

    def test_delete_client_with_dependencies_force_delete(self):
        """Test 3: Delete client with dependencies using force_delete=true (should succeed)"""
        if len(self.test_client_ids) < 3:
            print("❌ Not enough test clients available")
            return False
            
        client_id = self.test_client_ids[2]  # Client with pending budgets
        
        success, response = self.run_test(
            "Delete Client With Dependencies (Force Delete)",
            "DELETE",
            f"clients/{client_id}",
            200,
            token=self.admin_token,
            params={"force_delete": "true"}
        )
        
        if success:
            print(f"   ✅ Successfully force deleted client with dependencies")
            print(f"   Message: {response.get('message', 'N/A')}")
            print(f"   Budgets deleted: {response.get('budgets_deleted', 0)}")
        
        return success

    def test_delete_client_mixed_dependencies_force(self):
        """Test 4: Delete client with mixed dependencies (approved + pending) using force_delete"""
        if len(self.test_client_ids) < 4:
            print("❌ Not enough test clients available")
            return False
            
        client_id = self.test_client_ids[3]  # Client with mixed budgets
        
        success, response = self.run_test(
            "Delete Client With Mixed Dependencies (Force Delete)",
            "DELETE",
            f"clients/{client_id}",
            200,
            token=self.admin_token,
            params={"force_delete": "true"}
        )
        
        if success:
            print(f"   ✅ Successfully force deleted client with mixed dependencies")
            print(f"   Message: {response.get('message', 'N/A')}")
            print(f"   Budgets deleted: {response.get('budgets_deleted', 0)}")
        
        return success

    def test_delete_nonexistent_client(self):
        """Test 5: Delete non-existent client (should fail with 404)"""
        fake_client_id = "non-existent-client-id-12345"
        
        success, response = self.run_test(
            "Delete Non-existent Client",
            "DELETE",
            f"clients/{fake_client_id}",
            404,
            token=self.admin_token
        )
        
        if success:
            print(f"   ✅ Correctly returned 404 for non-existent client")
            print(f"   Error message: {response.get('detail', 'N/A')}")
        
        return success

    def test_delete_client_without_auth(self):
        """Test 6: Delete client without authentication (should fail with 403)"""
        # Create a temporary client for this test
        client_data = {
            "name": "Cliente Teste Auth",
            "contact_name": "Teste Auth",
            "phone": "(11) 55555-5555",
            "email": "auth@teste.com"
        }
        
        success, response = self.run_test(
            "Create Client for Auth Test",
            "POST",
            "clients",
            200,
            data=client_data,
            token=self.admin_token
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create client for auth test")
            return False
            
        client_id = response['id']
        
        success, response = self.run_test(
            "Delete Client Without Authentication",
            "DELETE",
            f"clients/{client_id}",
            403,  # Should fail with 403 (Forbidden)
            token=None  # No token
        )
        
        if success:
            print(f"   ✅ Correctly prevented deletion without authentication")
            print(f"   Error message: {response.get('detail', 'N/A')}")
            
            # Clean up - delete the test client
            self.run_test(
                "Cleanup Auth Test Client",
                "DELETE",
                f"clients/{client_id}",
                200,
                token=self.admin_token
            )
        
        return success

    def test_parameter_validation(self):
        """Test 7: Test parameter validation for force_delete"""
        # Create a temporary client with budget for this test
        client_data = {
            "name": "Cliente Teste Parâmetros",
            "contact_name": "Teste Params",
            "phone": "(11) 66666-6666",
            "email": "params@teste.com"
        }
        
        success, response = self.run_test(
            "Create Client for Parameter Test",
            "POST",
            "clients",
            200,
            data=client_data,
            token=self.admin_token
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create client for parameter test")
            return False
            
        client_id = response['id']
        
        # Create a budget for this client
        budget_data = {
            "client_id": client_id,
            "seller_id": self.test_seller_id,
            "budget_type": "SIDER E UV",
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
        
        success, response = self.run_test(
            "Create Budget for Parameter Test",
            "POST",
            "budgets",
            200,
            data=budget_data,
            token=self.admin_token
        )
        
        if not success:
            print("❌ Failed to create budget for parameter test")
            return False

        # Test with invalid force_delete parameter
        success1, response1 = self.run_test(
            "Delete Client With Invalid force_delete Parameter",
            "DELETE",
            f"clients/{client_id}",
            400,  # Should fail due to dependencies
            token=self.admin_token,
            params={"force_delete": "invalid"}  # Invalid boolean value
        )
        
        # Test with force_delete=false (explicit)
        success2, response2 = self.run_test(
            "Delete Client With force_delete=false",
            "DELETE",
            f"clients/{client_id}",
            400,  # Should fail due to dependencies
            token=self.admin_token,
            params={"force_delete": "false"}
        )
        
        # Clean up - force delete the test client
        self.run_test(
            "Cleanup Parameter Test Client",
            "DELETE",
            f"clients/{client_id}",
            200,
            token=self.admin_token,
            params={"force_delete": "true"}
        )
        
        return success1 and success2

    def test_audit_logging_verification(self):
        """Test 8: Verify audit logging is working (indirect test)"""
        # Create a client specifically for audit testing
        client_data = {
            "name": "Cliente Teste Auditoria",
            "contact_name": "Teste Audit",
            "phone": "(11) 77777-7777",
            "email": "audit@teste.com"
        }
        
        success, response = self.run_test(
            "Create Client for Audit Test",
            "POST",
            "clients",
            200,
            data=client_data,
            token=self.admin_token
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create client for audit test")
            return False
            
        client_id = response['id']
        
        # Delete the client (should create audit log)
        success, response = self.run_test(
            "Delete Client for Audit Verification",
            "DELETE",
            f"clients/{client_id}",
            200,
            token=self.admin_token
        )
        
        if success:
            print(f"   ✅ Client deletion completed successfully")
            print(f"   Message: {response.get('message', 'N/A')}")
            print(f"   ✅ Audit logging should have been triggered")
            print(f"   (Note: Audit logs are stored in database and not directly accessible via API)")
        
        return success

    def cleanup_test_data(self):
        """Clean up any remaining test data"""
        print("\n📋 CLEANING UP TEST DATA")
        print("-" * 40)
        
        # Delete any remaining test clients
        for i, client_id in enumerate(self.test_client_ids):
            try:
                self.run_test(
                    f"Cleanup Test Client {i+1}",
                    "DELETE",
                    f"clients/{client_id}",
                    200,  # May succeed or fail if already deleted
                    token=self.admin_token,
                    params={"force_delete": "true"}
                )
            except:
                pass  # Ignore errors during cleanup
        
        # Delete test seller
        if self.test_seller_id:
            try:
                self.run_test(
                    "Cleanup Test Seller",
                    "DELETE",
                    f"sellers/{self.test_seller_id}",
                    200,
                    token=self.admin_token
                )
            except:
                pass  # Ignore errors during cleanup

def main():
    print("🚀 Starting Client Deletion Functionality Tests")
    print("=" * 60)
    
    tester = ClientDeletionTester()
    
    # Authentication
    print("\n📋 AUTHENTICATION")
    print("-" * 30)
    
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    # Setup test data
    if not tester.setup_test_data():
        print("❌ Failed to setup test data, stopping tests")
        return 1
    
    # Client deletion tests
    print("\n📋 CLIENT DELETION TESTS")
    print("-" * 40)
    
    # Test 1: Normal deletion (without dependencies)
    tester.test_delete_client_without_dependencies()
    
    # Test 2: Deletion with dependencies (should fail without force_delete)
    tester.test_delete_client_with_dependencies_no_force()
    
    # Test 3: Deletion with dependencies using force_delete=true
    tester.test_delete_client_with_dependencies_force_delete()
    
    # Test 4: Deletion with mixed dependencies using force_delete
    tester.test_delete_client_mixed_dependencies_force()
    
    # Test 5: Validation tests
    print("\n📋 VALIDATION TESTS")
    print("-" * 30)
    
    tester.test_delete_nonexistent_client()
    tester.test_delete_client_without_auth()
    tester.test_parameter_validation()
    
    # Test 6: Audit logging verification
    print("\n📋 AUDIT LOGGING TESTS")
    print("-" * 30)
    
    tester.test_audit_logging_verification()
    
    # Cleanup
    tester.cleanup_test_data()
    
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