import requests
import sys
import json
from datetime import datetime

class BudgetEditTester:
    def __init__(self, base_url="https://budget-system-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_client_id = None
        self.created_seller_id = None
        self.created_budget_id = None
        self.created_price_item_id = None

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
            return True
        return False

    def setup_test_data(self):
        """Create test client, seller, and price item for budget tests"""
        print("\n📋 SETTING UP TEST DATA")
        print("-" * 30)
        
        # Create test client
        client_data = {
            "name": "Cliente Teste Edição",
            "contact_name": "João da Silva",
            "phone": "(11) 98765-4321",
            "email": "joao@clienteteste.com"
        }
        
        success, response = self.run_test(
            "Create Test Client",
            "POST",
            "clients",
            200,
            data=client_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.created_client_id = response['id']
        else:
            print("❌ Failed to create test client")
            return False

        # Create test seller
        seller_data = {
            "name": "Vendedor Teste Edição",
            "email": "vendedor@teste.com",
            "phone": "(11) 91234-5678",
            "commission_percentage": 10.0,
            "registration_number": "REG123"
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
            self.created_seller_id = response['id']
        else:
            print("❌ Failed to create test seller")
            return False

        # Create test price item
        import time
        timestamp = str(int(time.time()))[-6:]
        
        item_data = {
            "code": f"EDIT{timestamp}",
            "name": "Item Teste Edição",
            "unit": "m²",
            "unit_price": 50.00,
            "category": "TESTE"
        }
        
        success, response = self.run_test(
            "Create Test Price Item",
            "POST",
            "price-table",
            200,
            data=item_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.created_price_item_id = response['id']
            return True
        else:
            print("❌ Failed to create test price item")
            return False

    def test_create_budget_with_fixed_discount(self):
        """Test budget creation with fixed discount (R$ 100,00)"""
        budget_data = {
            "client_id": self.created_client_id,
            "seller_id": self.created_seller_id,
            "budget_type": "REMOÇÃO",
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Teste",
                    "quantity": 10.0,
                    "unit_price": 50.00,
                    "subtotal": 500.00,
                    "final_price": 500.00
                }
            ],
            "discount_type": "fixed",
            "discount_percentage": 100.00,  # R$ 100,00 fixed discount
            "observations": "Orçamento com desconto fixo de R$ 100,00"
        }
        
        success, response = self.run_test(
            "Create Budget with Fixed Discount (R$ 100,00)",
            "POST",
            "budgets",
            200,
            data=budget_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            self.created_budget_id = response['id']
            print(f"   Subtotal: R$ {response.get('subtotal', 0):.2f}")
            print(f"   Discount Type: {response.get('discount_type')}")
            print(f"   Discount Amount: R$ {response.get('discount_amount', 0):.2f}")
            print(f"   Total: R$ {response.get('total', 0):.2f}")
            
            # Verify calculations
            expected_total = 500.00 - 100.00  # 400.00
            actual_total = response.get('total', 0)
            if abs(actual_total - expected_total) < 0.01:
                print(f"✅ Fixed discount calculation correct: R$ {actual_total:.2f}")
                return True
            else:
                print(f"❌ Fixed discount calculation wrong: expected R$ {expected_total:.2f}, got R$ {actual_total:.2f}")
                return False
        return False

    def test_create_budget_with_percentage_discount(self):
        """Test budget creation with percentage discount (10%)"""
        budget_data = {
            "client_id": self.created_client_id,
            "seller_id": self.created_seller_id,
            "budget_type": "PLOTAGEM ADESIVO",
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Teste Percentual",
                    "quantity": 8.0,
                    "unit_price": 50.00,
                    "subtotal": 400.00,
                    "final_price": 400.00
                }
            ],
            "discount_type": "percentage",
            "discount_percentage": 10.0,  # 10% discount
            "observations": "Orçamento com desconto percentual de 10%"
        }
        
        success, response = self.run_test(
            "Create Budget with Percentage Discount (10%)",
            "POST",
            "budgets",
            200,
            data=budget_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            print(f"   Subtotal: R$ {response.get('subtotal', 0):.2f}")
            print(f"   Discount Type: {response.get('discount_type')}")
            print(f"   Discount Amount: R$ {response.get('discount_amount', 0):.2f}")
            print(f"   Total: R$ {response.get('total', 0):.2f}")
            
            # Verify calculations
            expected_discount = 400.00 * 0.10  # 40.00
            expected_total = 400.00 - 40.00  # 360.00
            actual_discount = response.get('discount_amount', 0)
            actual_total = response.get('total', 0)
            
            if (abs(actual_discount - expected_discount) < 0.01 and 
                abs(actual_total - expected_total) < 0.01):
                print(f"✅ Percentage discount calculation correct")
                return True
            else:
                print(f"❌ Percentage discount calculation wrong")
                return False
        return False

    def test_create_budget_with_item_discount(self):
        """Test budget creation with item discount (15%)"""
        # Calculate item with discount
        subtotal = 6.0 * 75.00  # 450.00
        item_discount = 15.0
        final_price = subtotal * (1 - item_discount/100)  # 450.00 * 0.85 = 382.50
        
        budget_data = {
            "client_id": self.created_client_id,
            "seller_id": self.created_seller_id,
            "budget_type": "TROCA",
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item com Desconto 15%",
                    "quantity": 6.0,
                    "unit_price": 75.00,
                    "item_discount_percentage": 15.0,
                    "subtotal": subtotal,
                    "final_price": final_price
                }
            ],
            "discount_type": "percentage",
            "discount_percentage": 0.0,  # No budget-level discount
            "observations": "Orçamento com desconto de 15% no item"
        }
        
        success, response = self.run_test(
            "Create Budget with Item Discount (15%)",
            "POST",
            "budgets",
            200,
            data=budget_data,
            token=self.admin_token
        )
        
        if success and 'id' in response:
            print(f"   Budget Subtotal: R$ {response.get('subtotal', 0):.2f}")
            print(f"   Budget Total: R$ {response.get('total', 0):.2f}")
            
            # Check item calculations
            if response.get('items') and len(response['items']) > 0:
                item = response['items'][0]
                print(f"   Item Subtotal: R$ {item.get('subtotal', 0):.2f}")
                print(f"   Item Discount: {item.get('item_discount_percentage', 0)}%")
                print(f"   Item Final Price: R$ {item.get('final_price', 0):.2f}")
                
                # Verify item discount calculation
                expected_final_price = 382.50
                actual_final_price = item.get('final_price', 0)
                
                if abs(actual_final_price - expected_final_price) < 0.01:
                    print(f"✅ Item discount calculation correct")
                    return True
                else:
                    print(f"❌ Item discount calculation wrong: expected R$ {expected_final_price:.2f}, got R$ {actual_final_price:.2f}")
                    return False
        return False

    def test_budget_edit_error_fix(self):
        """Test the specific budget edit error that was reported"""
        if not self.created_budget_id:
            print("❌ No budget ID available for edit test")
            return False
        
        print(f"\n🔧 Testing Budget Edit Error Fix (Budget ID: {self.created_budget_id})")
        
        # First, get the current budget to see its structure
        success, current_budget = self.run_test(
            "Get Current Budget for Edit",
            "GET",
            f"budgets/{self.created_budget_id}",
            200,
            token=self.admin_token
        )
        
        if not success:
            print("❌ Failed to get current budget")
            return False
        
        print(f"   Current budget items: {len(current_budget.get('items', []))}")
        
        # Now try to edit the budget - this was causing the 'dict' object has no attribute 'final_price' error
        updated_items = [
            {
                "item_id": self.created_price_item_id,
                "item_name": "Item Editado",
                "quantity": 12.0,  # Changed quantity
                "unit_price": 55.00,  # Changed price
                "item_discount_percentage": 10.0,  # Added item discount
                "subtotal": 660.00,  # 12 * 55
                "final_price": 594.00  # 660 * 0.9 (10% discount)
            }
        ]
        
        update_data = {
            "items": updated_items,
            "discount_type": "percentage",
            "discount_percentage": 5.0,  # Changed budget discount
            "observations": "Orçamento editado - teste do erro corrigido"
        }
        
        success, response = self.run_test(
            "Edit Budget (Test Error Fix)",
            "PUT",
            f"budgets/{self.created_budget_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        
        if success:
            print(f"✅ Budget edit successful - no 'dict' object error!")
            print(f"   New Subtotal: R$ {response.get('subtotal', 0):.2f}")
            print(f"   New Discount Amount: R$ {response.get('discount_amount', 0):.2f}")
            print(f"   New Total: R$ {response.get('total', 0):.2f}")
            
            # Verify the calculations are correct
            expected_subtotal = 594.00  # Item final price after item discount
            expected_discount = expected_subtotal * 0.05  # 5% budget discount
            expected_total = expected_subtotal - expected_discount
            
            actual_subtotal = response.get('subtotal', 0)
            actual_total = response.get('total', 0)
            
            if (abs(actual_subtotal - expected_subtotal) < 0.01 and 
                abs(actual_total - expected_total) < 0.01):
                print(f"✅ Edit calculations correct")
                return True
            else:
                print(f"❌ Edit calculations wrong")
                print(f"   Expected subtotal: R$ {expected_subtotal:.2f}, got R$ {actual_subtotal:.2f}")
                print(f"   Expected total: R$ {expected_total:.2f}, got R$ {actual_total:.2f}")
                return False
        else:
            print(f"❌ Budget edit failed - error may still exist")
            return False

    def test_multiple_budget_edits(self):
        """Test multiple consecutive budget edits to ensure stability"""
        if not self.created_budget_id:
            print("❌ No budget ID available for multiple edit test")
            return False
        
        print(f"\n🔄 Testing Multiple Budget Edits")
        
        # Edit 1: Change discount type to fixed
        update_data_1 = {
            "discount_type": "fixed",
            "discount_percentage": 50.00,  # R$ 50 fixed discount
            "observations": "Primeira edição - desconto fixo"
        }
        
        success1, response1 = self.run_test(
            "Budget Edit #1 (Fixed Discount)",
            "PUT",
            f"budgets/{self.created_budget_id}",
            200,
            data=update_data_1,
            token=self.admin_token
        )
        
        if not success1:
            return False
        
        # Edit 2: Change back to percentage and modify items
        update_data_2 = {
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Final",
                    "quantity": 15.0,
                    "unit_price": 60.00,
                    "item_discount_percentage": 20.0,
                    "subtotal": 900.00,
                    "final_price": 720.00  # 900 * 0.8 (20% discount)
                }
            ],
            "discount_type": "percentage",
            "discount_percentage": 12.0,
            "observations": "Segunda edição - volta para percentual com novos itens"
        }
        
        success2, response2 = self.run_test(
            "Budget Edit #2 (Percentage + New Items)",
            "PUT",
            f"budgets/{self.created_budget_id}",
            200,
            data=update_data_2,
            token=self.admin_token
        )
        
        if success2:
            print(f"✅ Multiple edits successful")
            print(f"   Final Total: R$ {response2.get('total', 0):.2f}")
            return True
        
        return False

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 CLEANING UP TEST DATA")
        print("-" * 30)
        
        # Delete budget
        if self.created_budget_id:
            self.run_test(
                "Delete Test Budget",
                "DELETE",
                f"budgets/{self.created_budget_id}",
                200,
                token=self.admin_token
            )
        
        # Delete price item
        if self.created_price_item_id:
            self.run_test(
                "Delete Test Price Item",
                "DELETE",
                f"price-table/{self.created_price_item_id}",
                200,
                token=self.admin_token
            )
        
        # Delete seller (soft delete)
        if self.created_seller_id:
            self.run_test(
                "Delete Test Seller",
                "DELETE",
                f"sellers/{self.created_seller_id}",
                200,
                token=self.admin_token
            )
        
        # Delete client
        if self.created_client_id:
            self.run_test(
                "Delete Test Client",
                "DELETE",
                f"clients/{self.created_client_id}",
                200,
                token=self.admin_token
            )

def main():
    print("🚀 Starting Budget Edit Error Tests")
    print("=" * 50)
    print("Testing specific scenarios:")
    print("1. Budget edit error fix ('dict' object has no attribute 'final_price')")
    print("2. Fixed discount functionality (R$ 100,00)")
    print("3. Percentage discount functionality (10%)")
    print("4. Item discount calculation (15%)")
    print("=" * 50)
    
    tester = BudgetEditTester()
    
    # Login
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    # Setup test data
    if not tester.setup_test_data():
        print("❌ Failed to setup test data, stopping tests")
        return 1
    
    # Run specific tests
    print("\n📋 DISCOUNT FUNCTIONALITY TESTS")
    print("-" * 40)
    
    tester.test_create_budget_with_fixed_discount()
    tester.test_create_budget_with_percentage_discount()
    tester.test_create_budget_with_item_discount()
    
    print("\n📋 BUDGET EDIT ERROR TESTS")
    print("-" * 40)
    
    tester.test_budget_edit_error_fix()
    tester.test_multiple_budget_edits()
    
    # Cleanup
    tester.cleanup_test_data()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All budget edit tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())