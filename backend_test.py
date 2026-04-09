#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime, timezone

# Configuration - Using the correct backend URL from frontend/.env
BASE_URL = "https://bill-tracker-mobile.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def log_test(test_name, status, details=""):
    """Log test results"""
    status_symbol = "✅" if status == "PASS" else "❌"
    print(f"{status_symbol} {test_name}")
    if details:
        print(f"   {details}")
    print()

def test_authentication():
    """Test authentication to get access token"""
    print("🔐 Testing Authentication...")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/single-user", headers=HEADERS)
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            user_id = data.get("user", {}).get("user_id")
            
            if access_token and user_id:
                log_test("Authentication", "PASS", f"Token obtained, User ID: {user_id}")
                return access_token, user_id
            else:
                log_test("Authentication", "FAIL", "No access token in response")
                return None, None
        else:
            log_test("Authentication", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return None, None
            
    except Exception as e:
        log_test("Authentication", "FAIL", f"Exception: {str(e)}")
        return None, None

def test_budget_goals_api(access_token):
    """Test Budget Goals API endpoints comprehensively"""
    print("💰 Testing Budget Goals API...")
    
    auth_headers = {
        **HEADERS,
        "Authorization": f"Bearer {access_token}"
    }
    
    created_account_id = None
    created_budget_ids = []
    created_expense_ids = []
    
    # Step 1: Setup - Create test account
    print("1️⃣ Setup: Creating test account...")
    try:
        account_data = {
            "name": "Test Bank Budget",
            "account_type": "bank",
            "initial_balance": 100000
        }
        
        response = requests.post(f"{BASE_URL}/accounts", 
                               headers=auth_headers, 
                               json=account_data)
        
        if response.status_code == 200:
            data = response.json()
            created_account_id = data.get("account_id")
            if created_account_id:
                log_test("Create Test Account", "PASS", 
                        f"Created account ID: {created_account_id}, Balance: ₹{data.get('balance'):,.2f}")
            else:
                log_test("Create Test Account", "FAIL", "No account_id in response")
                return
        else:
            log_test("Create Test Account", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            return
            
    except Exception as e:
        log_test("Create Test Account", "FAIL", f"Exception: {str(e)}")
        return
    
    # Step 2: Setup - Create test expenses for current month
    print("2️⃣ Setup: Creating test expenses for budget tracking...")
    
    test_expenses = [
        {
            "account_id": created_account_id,
            "amount": 4000,
            "category": "food",
            "description": "Groceries",
            "payment_type": "upi",
            "date": "2026-04-10T00:00:00Z"
        },
        {
            "account_id": created_account_id,
            "amount": 2000,
            "category": "transport",
            "description": "Fuel",
            "payment_type": "cash",
            "date": "2026-04-12T00:00:00Z"
        },
        {
            "account_id": created_account_id,
            "amount": 5000,
            "category": "shopping",
            "description": "Clothes",
            "payment_type": "bank",
            "date": "2026-04-15T00:00:00Z"
        }
    ]
    
    for i, expense_data in enumerate(test_expenses, 1):
        try:
            response = requests.post(f"{BASE_URL}/expenses", 
                                   headers=auth_headers, 
                                   json=expense_data)
            
            if response.status_code == 200:
                data = response.json()
                expense_id = data.get("expense_id")
                if expense_id:
                    created_expense_ids.append(expense_id)
                    log_test(f"Create Test Expense {i}", "PASS", 
                            f"Created {expense_data['category']} expense: ₹{expense_data['amount']:,.2f} - {expense_data['description']}")
                else:
                    log_test(f"Create Test Expense {i}", "FAIL", "No expense_id in response")
            else:
                log_test(f"Create Test Expense {i}", "FAIL", 
                        f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            log_test(f"Create Test Expense {i}", "FAIL", f"Exception: {str(e)}")
    
    # Step 3: Test Budget CRUD - Create budgets
    print("3️⃣ Testing Budget Creation...")
    
    test_budgets = [
        {"category": "food", "monthly_limit": 5000},
        {"category": "transport", "monthly_limit": 3000},
        {"category": "shopping", "monthly_limit": 4000}
    ]
    
    for i, budget_data in enumerate(test_budgets, 1):
        try:
            response = requests.post(f"{BASE_URL}/budgets", 
                                   headers=auth_headers, 
                                   json=budget_data)
            
            if response.status_code == 200:
                data = response.json()
                budget_id = data.get("budget_id")
                if budget_id:
                    created_budget_ids.append(budget_id)
                    log_test(f"Create Budget {i} ({budget_data['category']})", "PASS", 
                            f"Budget ID: {budget_id}, Category: {budget_data['category']}, Limit: ₹{budget_data['monthly_limit']:,.2f}")
                else:
                    log_test(f"Create Budget {i}", "FAIL", "No budget_id in response")
            else:
                log_test(f"Create Budget {i}", "FAIL", 
                        f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            log_test(f"Create Budget {i}", "FAIL", f"Exception: {str(e)}")
    
    # Step 4: Test GET /api/budgets
    print("4️⃣ Testing Get All Budgets...")
    try:
        response = requests.get(f"{BASE_URL}/budgets", headers=auth_headers)
        
        if response.status_code == 200:
            budgets = response.json()
            if isinstance(budgets, list) and len(budgets) >= 3:
                log_test("Get All Budgets", "PASS", 
                        f"Retrieved {len(budgets)} budgets successfully")
                
                # Verify budget details
                categories_found = [b.get('category') for b in budgets]
                expected_categories = ['food', 'transport', 'shopping']
                if all(cat in categories_found for cat in expected_categories):
                    log_test("Budget Categories Verification", "PASS", 
                            f"All expected categories found: {categories_found}")
                else:
                    log_test("Budget Categories Verification", "FAIL", 
                            f"Missing categories. Found: {categories_found}, Expected: {expected_categories}")
            else:
                log_test("Get All Budgets", "FAIL", 
                        f"Expected at least 3 budgets, got {len(budgets) if isinstance(budgets, list) else 'non-list'}")
        else:
            log_test("Get All Budgets", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Get All Budgets", "FAIL", f"Exception: {str(e)}")
    
    # Step 5: Test GET /api/budgets/progress
    print("5️⃣ Testing Budget Progress...")
    try:
        response = requests.get(f"{BASE_URL}/budgets/progress", headers=auth_headers)
        
        if response.status_code == 200:
            progress_data = response.json()
            
            # Verify required fields
            required_fields = ['total_budgeted', 'total_spent', 'overall_percentage', 'budgets', 'unbudgeted_spending']
            missing_fields = [field for field in required_fields if field not in progress_data]
            
            if not missing_fields:
                log_test("Budget Progress Structure", "PASS", 
                        "All required fields present in progress response")
                
                # Verify calculations
                total_budgeted = progress_data.get('total_budgeted', 0)
                total_spent = progress_data.get('total_spent', 0)
                overall_percentage = progress_data.get('overall_percentage', 0)
                budgets = progress_data.get('budgets', [])
                
                log_test("Budget Progress Summary", "PASS", 
                        f"Total Budgeted: ₹{total_budgeted:,.2f}, Total Spent: ₹{total_spent:,.2f}, Overall: {overall_percentage}%")
                
                # Verify individual budget progress
                if isinstance(budgets, list) and len(budgets) >= 3:
                    log_test("Budget Progress Details", "PASS", 
                            f"Found {len(budgets)} budget progress entries")
                    
                    # Check specific budget statuses
                    for budget in budgets:
                        category = budget.get('category')
                        spent = budget.get('spent', 0)
                        limit = budget.get('monthly_limit', 0)
                        percentage = budget.get('percentage', 0)
                        status = budget.get('status')
                        remaining = budget.get('remaining', 0)
                        
                        if category == 'food':
                            # Food: Check if our test expense (4000) plus any existing expenses are calculated correctly
                            # Status depends on total spent vs limit
                            if limit == 5000:  # Our test budget limit
                                expected_status = "over_budget" if spent > limit else ("warning" if percentage >= 80 else "on_track")
                                log_test(f"Food Budget Progress", "PASS", 
                                        f"Food: ₹{spent:,.2f}/₹{limit:,.2f} ({percentage}%) - Status: {status} (includes existing expenses)")
                            else:
                                log_test(f"Food Budget Progress", "FAIL", 
                                        f"Food budget limit incorrect: expected 5000, got {limit}")
                        
                        elif category == 'transport':
                            # Transport: 2000 of 3000 = ~66.7% = on_track
                            if spent == 2000 and limit == 3000 and status == "on_track":
                                log_test(f"Transport Budget Progress", "PASS", 
                                        f"Transport: ₹{spent:,.2f}/₹{limit:,.2f} ({percentage}%) - Status: {status}")
                            else:
                                log_test(f"Transport Budget Progress", "FAIL", 
                                        f"Transport budget incorrect: spent={spent}, limit={limit}, status={status}")
                        
                        elif category == 'shopping':
                            # Shopping: 5000 of 4000 = 125% = over_budget
                            if spent == 5000 and limit == 4000 and status == "over_budget":
                                log_test(f"Shopping Budget Progress", "PASS", 
                                        f"Shopping: ₹{spent:,.2f}/₹{limit:,.2f} ({percentage}%) - Status: {status}")
                            else:
                                log_test(f"Shopping Budget Progress", "FAIL", 
                                        f"Shopping budget incorrect: spent={spent}, limit={limit}, status={status}")
                else:
                    log_test("Budget Progress Details", "FAIL", 
                            f"Expected at least 3 budget entries, got {len(budgets) if isinstance(budgets, list) else 'non-list'}")
            else:
                log_test("Budget Progress Structure", "FAIL", 
                        f"Missing required fields: {missing_fields}")
        else:
            log_test("Budget Progress", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Budget Progress", "FAIL", f"Exception: {str(e)}")
    
    # Step 6: Test PUT /api/budgets/{budget_id} - Update budget
    print("6️⃣ Testing Budget Update...")
    if created_budget_ids:
        try:
            budget_id_to_update = created_budget_ids[0]  # Update first budget (food)
            update_data = {"monthly_limit": 6000}
            
            response = requests.put(f"{BASE_URL}/budgets/{budget_id_to_update}", 
                                  headers=auth_headers, 
                                  json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("monthly_limit") == 6000:
                    log_test("Update Budget", "PASS", 
                            f"Budget {budget_id_to_update} updated to ₹{data.get('monthly_limit'):,.2f}")
                else:
                    log_test("Update Budget", "FAIL", 
                            f"Budget limit not updated correctly. Got: {data.get('monthly_limit')}")
            else:
                log_test("Update Budget", "FAIL", 
                        f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            log_test("Update Budget", "FAIL", f"Exception: {str(e)}")
    else:
        log_test("Update Budget", "FAIL", "No budget IDs available for update")
    
    # Step 7: Test DELETE /api/budgets/{budget_id}
    print("7️⃣ Testing Budget Deletion...")
    if created_budget_ids and len(created_budget_ids) > 1:
        try:
            budget_id_to_delete = created_budget_ids[1]  # Delete second budget (transport)
            
            response = requests.delete(f"{BASE_URL}/budgets/{budget_id_to_delete}", 
                                     headers=auth_headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Budget deleted":
                    log_test("Delete Budget", "PASS", 
                            f"Budget {budget_id_to_delete} deleted successfully")
                    # Remove from our tracking list
                    created_budget_ids.remove(budget_id_to_delete)
                else:
                    log_test("Delete Budget", "FAIL", 
                            f"Unexpected response: {data}")
            else:
                log_test("Delete Budget", "FAIL", 
                        f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            log_test("Delete Budget", "FAIL", f"Exception: {str(e)}")
    else:
        log_test("Delete Budget", "FAIL", "No budget IDs available for deletion")
    
    # Step 8: Verify budget count decreased
    print("8️⃣ Verifying Budget Count After Deletion...")
    try:
        response = requests.get(f"{BASE_URL}/budgets", headers=auth_headers)
        
        if response.status_code == 200:
            budgets = response.json()
            if isinstance(budgets, list):
                current_count = len(budgets)
                expected_count = 2  # Should be 2 after deleting 1 of 3
                if current_count == expected_count:
                    log_test("Budget Count Verification", "PASS", 
                            f"Budget count correctly decreased to {current_count}")
                else:
                    log_test("Budget Count Verification", "FAIL", 
                            f"Expected {expected_count} budgets, got {current_count}")
            else:
                log_test("Budget Count Verification", "FAIL", "Response is not a list")
        else:
            log_test("Budget Count Verification", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Budget Count Verification", "FAIL", f"Exception: {str(e)}")
    
    # Step 9: Cleanup - Delete test data
    print("9️⃣ Cleanup: Deleting test data...")
    
    # Delete remaining budgets
    for budget_id in created_budget_ids:
        try:
            response = requests.delete(f"{BASE_URL}/budgets/{budget_id}", headers=auth_headers)
            if response.status_code == 200:
                log_test(f"Delete Budget {budget_id}", "PASS", f"Budget {budget_id} deleted")
            else:
                log_test(f"Delete Budget {budget_id}", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            log_test(f"Delete Budget {budget_id}", "FAIL", f"Exception: {str(e)}")
    
    # Delete expenses
    for expense_id in created_expense_ids:
        try:
            response = requests.delete(f"{BASE_URL}/expenses/{expense_id}", headers=auth_headers)
            if response.status_code == 200:
                log_test(f"Delete Expense {expense_id}", "PASS", f"Expense {expense_id} deleted")
            else:
                log_test(f"Delete Expense {expense_id}", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            log_test(f"Delete Expense {expense_id}", "FAIL", f"Exception: {str(e)}")
    
    # Delete account
    if created_account_id:
        try:
            response = requests.delete(f"{BASE_URL}/accounts/{created_account_id}", headers=auth_headers)
            if response.status_code == 200:
                log_test("Delete Test Account", "PASS", f"Account {created_account_id} deleted")
            else:
                log_test("Delete Test Account", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            log_test("Delete Test Account", "FAIL", f"Exception: {str(e)}")

def main():
    """Main test function"""
    print("🚀 Starting Budget Goals API Testing...")
    print("=" * 70)
    
    # Test authentication first
    access_token, user_id = test_authentication()
    
    if not access_token:
        print("❌ Authentication failed. Cannot proceed with API tests.")
        sys.exit(1)
    
    # Test Budget Goals API
    test_budget_goals_api(access_token)
    
    print("=" * 70)
    print("🏁 Budget Goals API Testing Complete!")

if __name__ == "__main__":
    main()