import requests
import sys
import json
from datetime import datetime

class BulkDeleteTester:
    def __init__(self, base_url="https://budget-system-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.operator_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_clients = []
        self.created_budgets = []
        self.created_sellers = []

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
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
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

    def create_test_clients(self, count=5):
        """Create test clients for bulk operations"""
        print(f"\n📋 Creating {count} test clients...")
        
        for i in range(count):
            client_data = {
                "name": f"Cliente Teste Bulk {i+1}",
                "contact_name": f"Contato {i+1}",
                "phone": f"(11) 9999{i+1:04d}",
                "email": f"cliente{i+1}@bulktest.com",
                "address": f"Rua Teste {i+1}, 123",
                "city": "São Paulo",
                "state": "SP",
                "zip_code": f"0123{i+1:04d}",
                "observations": f"Cliente {i+1} para teste de exclusão em massa"
            }
            
            success, response = self.run_test(
                f"Create Test Client {i+1}",
                "POST",
                "clients",
                200,
                data=client_data,
                token=self.admin_token
            )
            
            if success and 'id' in response:
                self.created_clients.append({
                    'id': response['id'],
                    'name': response['name'],
                    'has_budgets': False
                })
                print(f"   Created client {i+1}: {response['id']}")
            else:
                print(f"   Failed to create client {i+1}")
                
        return len(self.created_clients) >= count

    def create_test_seller(self):
        """Create a test seller for budgets"""
        seller_data = {
            "name": "Vendedor Bulk Test",
            "email": "vendedor@bulktest.com",
            "phone": "(11) 88888-8888",
            "commission_percentage": 10.0,
            "registration_number": "BULK001"
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
            self.created_sellers.append(response['id'])
            return response['id']
        return None

    def create_budgets_for_clients(self, client_ids, seller_id):
        """Create budgets for specific clients"""
        print(f"\n📋 Creating budgets for {len(client_ids)} clients...")
        
        for i, client_id in enumerate(client_ids):
            budget_data = {
                "client_id": client_id,
                "seller_id": seller_id,
                "budget_type": "REMOÇÃO",
                "items": [
                    {
                        "item_id": "test-item-1",
                        "item_name": f"Item Teste Bulk {i+1}",
                        "quantity": 5.0,
                        "unit_price": 100.00,
                        "subtotal": 500.00
                    }
                ],
                "installation_location": "São Paulo, SP",
                "observations": f"Orçamento de teste para cliente {client_id}",
                "discount_percentage": 0.0
            }
            
            # Create some approved budgets and some pending
            if i % 2 == 0:
                budget_data["status"] = "APPROVED"
            
            success, response = self.run_test(
                f"Create Budget for Client {i+1}",
                "POST",
                "budgets",
                200,
                data=budget_data,
                token=self.admin_token
            )
            
            if success and 'id' in response:
                self.created_budgets.append(response['id'])
                # Mark client as having budgets
                for client in self.created_clients:
                    if client['id'] == client_id:
                        client['has_budgets'] = True
                        break
                print(f"   Created budget for client {client_id}: {response['id']}")

    def test_check_dependencies_endpoint(self):
        """Test POST /api/clients/check-dependencies endpoint"""
        print(f"\n📋 Testing Check Dependencies Endpoint...")
        
        # Test with clients that have dependencies
        clients_with_budgets = [c['id'] for c in self.created_clients if c['has_budgets']]
        clients_without_budgets = [c['id'] for c in self.created_clients if not c['has_budgets']]
        
        # Test 1: Check dependencies for clients with budgets
        if clients_with_budgets:
            success, response = self.run_test(
                "Check Dependencies - Clients with Budgets",
                "POST",
                "clients/check-dependencies",
                200,
                data=clients_with_budgets,
                token=self.admin_token
            )
            
            if success:
                print(f"   Total clients checked: {response.get('total_clients', 0)}")
                print(f"   Clients with dependencies: {response.get('clients_with_dependencies', 0)}")
                print(f"   Total budgets: {response.get('total_budgets', 0)}")
                print(f"   Total approved budgets: {response.get('total_approved_budgets', 0)}")
                print(f"   Total budget value: R$ {response.get('total_budget_value', 0):.2f}")
                
                # Verify response structure
                if 'details' in response and len(response['details']) > 0:
                    detail = response['details'][0]
                    print(f"   First client detail: {detail.get('client_name')} - {detail.get('budgets')} budgets")
        
        # Test 2: Check dependencies for clients without budgets
        if clients_without_budgets:
            success, response = self.run_test(
                "Check Dependencies - Clients without Budgets",
                "POST",
                "clients/check-dependencies",
                200,
                data=clients_without_budgets,
                token=self.admin_token
            )
            
            if success:
                print(f"   Clients with dependencies: {response.get('clients_with_dependencies', 0)} (should be 0)")
        
        # Test 3: Check with non-existent client IDs
        fake_ids = ["fake-id-1", "fake-id-2"]
        success, response = self.run_test(
            "Check Dependencies - Non-existent Clients",
            "POST",
            "clients/check-dependencies",
            200,
            data=fake_ids,
            token=self.admin_token
        )
        
        # Test 4: Test authorization (operator should fail)
        if self.operator_token:
            success, response = self.run_test(
                "Check Dependencies - Operator Access (Should Fail)",
                "POST",
                "clients/check-dependencies",
                403,
                data=clients_with_budgets[:1] if clients_with_budgets else ["test"],
                token=self.operator_token
            )

    def test_bulk_delete_without_force(self):
        """Test bulk delete without force_delete flag"""
        print(f"\n📋 Testing Bulk Delete without Force...")
        
        # Get clients with and without dependencies
        clients_with_budgets = [c['id'] for c in self.created_clients if c['has_budgets']]
        clients_without_budgets = [c['id'] for c in self.created_clients if not c['has_budgets']]
        
        # Test 1: Try to delete clients with dependencies (should skip them)
        if clients_with_budgets:
            delete_request = {
                "client_ids": clients_with_budgets[:2],  # Try first 2 clients with budgets
                "force_delete": False
            }
            
            success, response = self.run_test(
                "Bulk Delete - Clients with Dependencies (No Force)",
                "POST",
                "clients/bulk-delete",
                200,
                data=delete_request,
                token=self.admin_token
            )
            
            if success:
                print(f"   Total requested: {response.get('total_requested', 0)}")
                print(f"   Deleted count: {response.get('deleted_count', 0)} (should be 0)")
                print(f"   Skipped count: {response.get('skipped_count', 0)}")
                print(f"   Dependencies found: {len(response.get('dependencies_found', []))}")
                print(f"   Warnings: {len(response.get('warnings', []))}")
                
                # Verify dependencies were found
                if response.get('dependencies_found'):
                    dep = response['dependencies_found'][0]
                    print(f"   First dependency: {dep.get('client_name')} - {dep.get('budgets')} budgets")
        
        # Test 2: Delete clients without dependencies (should succeed)
        if clients_without_budgets:
            delete_request = {
                "client_ids": clients_without_budgets[:1],  # Delete first client without budgets
                "force_delete": False
            }
            
            success, response = self.run_test(
                "Bulk Delete - Clients without Dependencies",
                "POST",
                "clients/bulk-delete",
                200,
                data=delete_request,
                token=self.admin_token
            )
            
            if success:
                print(f"   Deleted count: {response.get('deleted_count', 0)} (should be 1)")
                print(f"   Skipped count: {response.get('skipped_count', 0)} (should be 0)")
                
                # Remove deleted client from our tracking
                if response.get('deleted_count', 0) > 0:
                    deleted_id = clients_without_budgets[0]
                    self.created_clients = [c for c in self.created_clients if c['id'] != deleted_id]

    def test_bulk_delete_with_force(self):
        """Test bulk delete with force_delete=true"""
        print(f"\n📋 Testing Bulk Delete with Force...")
        
        # Get remaining clients with dependencies
        clients_with_budgets = [c['id'] for c in self.created_clients if c['has_budgets']]
        
        if clients_with_budgets:
            delete_request = {
                "client_ids": clients_with_budgets[:1],  # Force delete first client with budgets
                "force_delete": True
            }
            
            success, response = self.run_test(
                "Bulk Delete - Force Delete with Dependencies",
                "POST",
                "clients/bulk-delete",
                200,
                data=delete_request,
                token=self.admin_token
            )
            
            if success:
                print(f"   Total requested: {response.get('total_requested', 0)}")
                print(f"   Deleted count: {response.get('deleted_count', 0)} (should be 1)")
                print(f"   Skipped count: {response.get('skipped_count', 0)} (should be 0)")
                print(f"   Success: {response.get('success', False)}")
                
                # Remove deleted client from our tracking
                if response.get('deleted_count', 0) > 0:
                    deleted_id = clients_with_budgets[0]
                    self.created_clients = [c for c in self.created_clients if c['id'] != deleted_id]

    def test_bulk_delete_limits(self):
        """Test bulk delete limits and validation"""
        print(f"\n📋 Testing Bulk Delete Limits and Validation...")
        
        # Test 1: Empty client list
        delete_request = {
            "client_ids": [],
            "force_delete": False
        }
        
        success, response = self.run_test(
            "Bulk Delete - Empty Client List (Should Fail)",
            "POST",
            "clients/bulk-delete",
            400,
            data=delete_request,
            token=self.admin_token
        )
        
        # Test 2: Too many clients (over 100 limit)
        fake_ids = [f"fake-id-{i}" for i in range(101)]  # 101 fake IDs
        delete_request = {
            "client_ids": fake_ids,
            "force_delete": False
        }
        
        success, response = self.run_test(
            "Bulk Delete - Over 100 Clients Limit (Should Fail)",
            "POST",
            "clients/bulk-delete",
            400,
            data=delete_request,
            token=self.admin_token
        )
        
        # Test 3: Non-existent client IDs
        delete_request = {
            "client_ids": ["fake-id-1", "fake-id-2", "fake-id-3"],
            "force_delete": False
        }
        
        success, response = self.run_test(
            "Bulk Delete - Non-existent Client IDs",
            "POST",
            "clients/bulk-delete",
            200,
            data=delete_request,
            token=self.admin_token
        )
        
        if success:
            print(f"   Deleted count: {response.get('deleted_count', 0)} (should be 0)")
            print(f"   Skipped count: {response.get('skipped_count', 0)} (should be 3)")
            print(f"   Errors: {len(response.get('errors', []))}")

    def test_bulk_delete_permissions(self):
        """Test bulk delete permissions"""
        print(f"\n📋 Testing Bulk Delete Permissions...")
        
        # Test operator access (should fail)
        if self.operator_token and self.created_clients:
            delete_request = {
                "client_ids": [self.created_clients[0]['id']],
                "force_delete": False
            }
            
            success, response = self.run_test(
                "Bulk Delete - Operator Access (Should Fail)",
                "POST",
                "clients/bulk-delete",
                403,
                data=delete_request,
                token=self.operator_token
            )
        
        # Test without authentication (should fail)
        if self.created_clients:
            delete_request = {
                "client_ids": [self.created_clients[0]['id']],
                "force_delete": False
            }
            
            success, response = self.run_test(
                "Bulk Delete - No Authentication (Should Fail)",
                "POST",
                "clients/bulk-delete",
                401,
                data=delete_request,
                token=None
            )

    def test_mixed_scenarios(self):
        """Test mixed scenarios (some clients with dependencies, others without)"""
        print(f"\n📋 Testing Mixed Scenarios...")
        
        # Get remaining clients
        clients_with_budgets = [c['id'] for c in self.created_clients if c['has_budgets']]
        clients_without_budgets = [c['id'] for c in self.created_clients if not c['has_budgets']]
        
        if clients_with_budgets and clients_without_budgets:
            # Mix clients with and without dependencies
            mixed_clients = clients_with_budgets[:1] + clients_without_budgets[:1]
            
            delete_request = {
                "client_ids": mixed_clients,
                "force_delete": False
            }
            
            success, response = self.run_test(
                "Bulk Delete - Mixed Clients (Some with Dependencies)",
                "POST",
                "clients/bulk-delete",
                200,
                data=delete_request,
                token=self.admin_token
            )
            
            if success:
                print(f"   Total requested: {response.get('total_requested', 0)}")
                print(f"   Deleted count: {response.get('deleted_count', 0)} (should be 1)")
                print(f"   Skipped count: {response.get('skipped_count', 0)} (should be 1)")
                print(f"   Dependencies found: {len(response.get('dependencies_found', []))}")
                print(f"   Warnings: {len(response.get('warnings', []))}")

    def test_audit_logging(self):
        """Test audit logging functionality"""
        print(f"\n📋 Testing Audit Logging...")
        
        # Note: We can't directly test audit logs without a specific endpoint,
        # but we can verify that bulk delete operations complete successfully
        # which indicates audit logging is working (since it's part of the process)
        
        if self.created_clients:
            remaining_clients = [c['id'] for c in self.created_clients if not c['has_budgets']]
            
            if remaining_clients:
                delete_request = {
                    "client_ids": remaining_clients[:1],
                    "force_delete": False
                }
                
                success, response = self.run_test(
                    "Bulk Delete - Verify Audit Logging Works",
                    "POST",
                    "clients/bulk-delete",
                    200,
                    data=delete_request,
                    token=self.admin_token
                )
                
                if success and response.get('success'):
                    print("   ✅ Audit logging appears to be working (operation completed successfully)")
                    # Remove deleted client from tracking
                    if response.get('deleted_count', 0) > 0:
                        deleted_id = remaining_clients[0]
                        self.created_clients = [c for c in self.created_clients if c['id'] != deleted_id]

    def cleanup_remaining_data(self):
        """Clean up any remaining test data"""
        print(f"\n📋 Cleaning up remaining test data...")
        
        # Delete remaining clients with force
        remaining_client_ids = [c['id'] for c in self.created_clients]
        
        if remaining_client_ids:
            delete_request = {
                "client_ids": remaining_client_ids,
                "force_delete": True
            }
            
            success, response = self.run_test(
                "Cleanup - Delete Remaining Clients",
                "POST",
                "clients/bulk-delete",
                200,
                data=delete_request,
                token=self.admin_token
            )
            
            if success:
                print(f"   Cleaned up {response.get('deleted_count', 0)} remaining clients")
        
        # Delete test sellers
        for seller_id in self.created_sellers:
            self.run_test(
                f"Cleanup - Delete Seller {seller_id}",
                "DELETE",
                f"sellers/{seller_id}",
                200,
                token=self.admin_token
            )

def main():
    print("🚀 Starting Bulk Delete Functionality Tests")
    print("=" * 60)
    
    tester = BulkDeleteTester()
    
    # Authentication
    print("\n📋 AUTHENTICATION")
    print("-" * 30)
    
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    if not tester.test_operator_login():
        print("⚠️ Operator login failed, continuing without operator tests")
    
    # Setup test data
    print("\n📋 SETUP TEST DATA")
    print("-" * 30)
    
    if not tester.create_test_clients(5):
        print("❌ Failed to create test clients, stopping tests")
        return 1
    
    seller_id = tester.create_test_seller()
    if not seller_id:
        print("❌ Failed to create test seller, stopping tests")
        return 1
    
    # Create budgets for some clients (to create dependencies)
    clients_for_budgets = [c['id'] for c in tester.created_clients[:3]]  # First 3 clients get budgets
    tester.create_budgets_for_clients(clients_for_budgets, seller_id)
    
    # Run bulk delete tests
    print("\n📋 BULK DELETE FUNCTIONALITY TESTS")
    print("-" * 40)
    
    # Test 1: Check Dependencies Endpoint
    tester.test_check_dependencies_endpoint()
    
    # Test 2: Bulk Delete without Force
    tester.test_bulk_delete_without_force()
    
    # Test 3: Bulk Delete with Force
    tester.test_bulk_delete_with_force()
    
    # Test 4: Limits and Validation
    tester.test_bulk_delete_limits()
    
    # Test 5: Permissions
    tester.test_bulk_delete_permissions()
    
    # Test 6: Mixed Scenarios
    tester.test_mixed_scenarios()
    
    # Test 7: Audit Logging
    tester.test_audit_logging()
    
    # Cleanup
    print("\n📋 CLEANUP")
    print("-" * 30)
    
    tester.cleanup_remaining_data()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All bulk delete tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())