import requests
import sys
import json

class BudgetEdgeCaseTester:
    def __init__(self, base_url="https://budget-system-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_client_id = None
        self.created_seller_id = None
        self.created_price_item_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
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
        """Create minimal test data"""
        # Create test client
        client_data = {
            "name": "Cliente Edge Case",
            "contact_name": "Test User",
            "phone": "(11) 99999-0000"
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
            return False

        # Create test seller
        seller_data = {
            "name": "Vendedor Edge Case",
            "commission_percentage": 5.0
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
            return False

        # Create test price item
        import time
        timestamp = str(int(time.time()))[-6:]
        
        item_data = {
            "code": f"EDGE{timestamp}",
            "name": "Item Edge Case",
            "unit": "un",
            "unit_price": 100.00,
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
            return False

    def test_budget_edit_with_missing_final_price(self):
        """Test budget edit when items don't have final_price field"""
        # Create budget first
        budget_data = {
            "client_id": self.created_client_id,
            "budget_type": "REMOÇÃO",
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Sem Final Price",
                    "quantity": 5.0,
                    "unit_price": 100.00,
                    "subtotal": 500.00
                    # Note: no final_price field
                }
            ],
            "discount_type": "percentage",
            "discount_percentage": 0.0
        }
        
        success, response = self.run_test(
            "Create Budget Without Final Price",
            "POST",
            "budgets",
            200,
            data=budget_data,
            token=self.admin_token
        )
        
        if not success or 'id' not in response:
            return False
        
        budget_id = response['id']
        
        # Now try to edit it - this should handle missing final_price gracefully
        update_data = {
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Editado Sem Final Price",
                    "quantity": 7.0,
                    "unit_price": 120.00,
                    "subtotal": 840.00
                    # Still no final_price field
                }
            ]
        }
        
        success, edit_response = self.run_test(
            "Edit Budget Without Final Price",
            "PUT",
            f"budgets/{budget_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        
        # Cleanup
        self.run_test("Delete Test Budget", "DELETE", f"budgets/{budget_id}", 200, token=self.admin_token)
        
        if success:
            print(f"✅ Budget edit handled missing final_price correctly")
            print(f"   New subtotal: R$ {edit_response.get('subtotal', 0):.2f}")
            return True
        else:
            print(f"❌ Budget edit failed with missing final_price")
            return False

    def test_budget_edit_with_mixed_item_fields(self):
        """Test budget edit with items having different field combinations"""
        # Create budget first
        budget_data = {
            "client_id": self.created_client_id,
            "budget_type": "PLOTAGEM ADESIVO",
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Completo",
                    "quantity": 3.0,
                    "unit_price": 100.00,
                    "item_discount_percentage": 10.0,
                    "subtotal": 300.00,
                    "final_price": 270.00
                },
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Simples",
                    "quantity": 2.0,
                    "unit_price": 100.00,
                    "subtotal": 200.00
                    # No final_price or discount
                }
            ],
            "discount_type": "percentage",
            "discount_percentage": 5.0
        }
        
        success, response = self.run_test(
            "Create Budget with Mixed Items",
            "POST",
            "budgets",
            200,
            data=budget_data,
            token=self.admin_token
        )
        
        if not success or 'id' not in response:
            return False
        
        budget_id = response['id']
        print(f"   Original total: R$ {response.get('total', 0):.2f}")
        
        # Edit with different item configurations
        update_data = {
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Editado 1",
                    "quantity": 4.0,
                    "unit_price": 150.00,
                    "subtotal": 600.00,
                    "final_price": 600.00  # No item discount
                },
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Editado 2",
                    "quantity": 1.0,
                    "unit_price": 200.00,
                    "item_discount_percentage": 25.0,
                    "subtotal": 200.00,
                    "final_price": 150.00  # 25% discount
                }
            ],
            "discount_type": "fixed",
            "discount_percentage": 75.00  # R$ 75 fixed discount
        }
        
        success, edit_response = self.run_test(
            "Edit Budget with Mixed Item Fields",
            "PUT",
            f"budgets/{budget_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        
        # Cleanup
        self.run_test("Delete Test Budget", "DELETE", f"budgets/{budget_id}", 200, token=self.admin_token)
        
        if success:
            print(f"✅ Mixed item fields handled correctly")
            print(f"   New subtotal: R$ {edit_response.get('subtotal', 0):.2f}")
            print(f"   New total: R$ {edit_response.get('total', 0):.2f}")
            
            # Verify calculation: (600 + 150) - 75 = 675
            expected_subtotal = 750.00  # 600 + 150
            expected_total = 675.00     # 750 - 75
            
            actual_subtotal = edit_response.get('subtotal', 0)
            actual_total = edit_response.get('total', 0)
            
            if (abs(actual_subtotal - expected_subtotal) < 0.01 and 
                abs(actual_total - expected_total) < 0.01):
                print(f"✅ Calculations correct")
                return True
            else:
                print(f"❌ Calculations incorrect")
                return False
        else:
            return False

    def test_budget_edit_zero_discount(self):
        """Test budget edit with zero discounts"""
        # Create budget
        budget_data = {
            "client_id": self.created_client_id,
            "budget_type": "TROCA",
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Zero Discount",
                    "quantity": 1.0,
                    "unit_price": 500.00,
                    "subtotal": 500.00,
                    "final_price": 500.00
                }
            ],
            "discount_type": "percentage",
            "discount_percentage": 0.0
        }
        
        success, response = self.run_test(
            "Create Budget with Zero Discount",
            "POST",
            "budgets",
            200,
            data=budget_data,
            token=self.admin_token
        )
        
        if not success or 'id' not in response:
            return False
        
        budget_id = response['id']
        
        # Edit to different zero discount type
        update_data = {
            "discount_type": "fixed",
            "discount_percentage": 0.0  # R$ 0 fixed discount
        }
        
        success, edit_response = self.run_test(
            "Edit to Fixed Zero Discount",
            "PUT",
            f"budgets/{budget_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        
        # Cleanup
        self.run_test("Delete Test Budget", "DELETE", f"budgets/{budget_id}", 200, token=self.admin_token)
        
        if success:
            print(f"✅ Zero discount handling correct")
            print(f"   Discount type: {edit_response.get('discount_type')}")
            print(f"   Discount amount: R$ {edit_response.get('discount_amount', 0):.2f}")
            print(f"   Total: R$ {edit_response.get('total', 0):.2f}")
            return True
        else:
            return False

    def test_budget_edit_large_numbers(self):
        """Test budget edit with large numbers"""
        # Create budget with large values
        budget_data = {
            "client_id": self.created_client_id,
            "budget_type": "SIDER E UV",
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Grande",
                    "quantity": 1000.0,
                    "unit_price": 999.99,
                    "subtotal": 999990.00,
                    "final_price": 999990.00
                }
            ],
            "discount_type": "percentage",
            "discount_percentage": 15.0
        }
        
        success, response = self.run_test(
            "Create Budget with Large Numbers",
            "POST",
            "budgets",
            200,
            data=budget_data,
            token=self.admin_token
        )
        
        if not success or 'id' not in response:
            return False
        
        budget_id = response['id']
        print(f"   Large budget total: R$ {response.get('total', 0):.2f}")
        
        # Edit with even larger numbers
        update_data = {
            "items": [
                {
                    "item_id": self.created_price_item_id,
                    "item_name": "Item Muito Grande",
                    "quantity": 2000.0,
                    "unit_price": 1500.00,
                    "item_discount_percentage": 5.0,
                    "subtotal": 3000000.00,
                    "final_price": 2850000.00  # 5% item discount
                }
            ],
            "discount_type": "fixed",
            "discount_percentage": 50000.00  # R$ 50,000 fixed discount
        }
        
        success, edit_response = self.run_test(
            "Edit Budget with Very Large Numbers",
            "PUT",
            f"budgets/{budget_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        
        # Cleanup
        self.run_test("Delete Test Budget", "DELETE", f"budgets/{budget_id}", 200, token=self.admin_token)
        
        if success:
            print(f"✅ Large numbers handled correctly")
            print(f"   Final total: R$ {edit_response.get('total', 0):.2f}")
            
            # Verify: 2,850,000 - 50,000 = 2,800,000
            expected_total = 2800000.00
            actual_total = edit_response.get('total', 0)
            
            if abs(actual_total - expected_total) < 0.01:
                print(f"✅ Large number calculations correct")
                return True
            else:
                print(f"❌ Large number calculations incorrect")
                return False
        else:
            return False

    def cleanup_test_data(self):
        """Clean up test data"""
        if self.created_price_item_id:
            self.run_test("Delete Price Item", "DELETE", f"price-table/{self.created_price_item_id}", 200, token=self.admin_token)
        if self.created_seller_id:
            self.run_test("Delete Seller", "DELETE", f"sellers/{self.created_seller_id}", 200, token=self.admin_token)
        if self.created_client_id:
            self.run_test("Delete Client", "DELETE", f"clients/{self.created_client_id}", 200, token=self.admin_token)

def main():
    print("🚀 Starting Budget Edge Case Tests")
    print("=" * 50)
    print("Testing edge cases for budget edit functionality:")
    print("1. Items without final_price field")
    print("2. Mixed item field combinations")
    print("3. Zero discount scenarios")
    print("4. Large number handling")
    print("=" * 50)
    
    tester = BudgetEdgeCaseTester()
    
    # Login and setup
    if not tester.test_admin_login():
        print("❌ Admin login failed")
        return 1
    
    if not tester.setup_test_data():
        print("❌ Failed to setup test data")
        return 1
    
    # Run edge case tests
    print("\n📋 EDGE CASE TESTS")
    print("-" * 30)
    
    tester.test_budget_edit_with_missing_final_price()
    tester.test_budget_edit_with_mixed_item_fields()
    tester.test_budget_edit_zero_discount()
    tester.test_budget_edit_large_numbers()
    
    # Cleanup
    tester.cleanup_test_data()
    
    # Results
    print("\n" + "=" * 50)
    print(f"📊 EDGE CASE RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All edge case tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} edge case tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())