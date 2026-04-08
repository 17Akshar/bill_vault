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

def test_income_expense_accounts_edit(access_token):
    """Test Income/Expense EDIT (PUT) and Accounts EDIT (PUT) endpoints"""
    print("📝 Testing Income/Expense/Accounts EDIT (PUT) endpoints...")
    
    auth_headers = {
        **HEADERS,
        "Authorization": f"Bearer {access_token}"
    }
    
    created_account_id = None
    created_income_id = None
    created_expense_id = None
    
    # Step 1: Create test account
    print("1️⃣ Creating test account...")
    try:
        account_data = {
            "name": "Test Bank SBI",
            "account_type": "bank",
            "initial_balance": 50000
        }
        
        response = requests.post(f"{BASE_URL}/accounts", 
                               headers=auth_headers, 
                               json=account_data)
        
        if response.status_code == 200:
            data = response.json()
            created_account_id = data.get("account_id")
            if created_account_id:
                log_test("Create Test Account", "PASS", 
                        f"Created account ID: {created_account_id}, Name: {data.get('name')}, Balance: {data.get('balance')}")
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
    
    # Step 2: Create test income
    print("2️⃣ Creating test income...")
    try:
        income_data = {
            "account_id": created_account_id,
            "amount": 25000,
            "category": "salary",
            "source": "My Company",
            "date": "2026-04-01T00:00:00Z",
            "notes": "April salary"
        }
        
        response = requests.post(f"{BASE_URL}/income", 
                               headers=auth_headers, 
                               json=income_data)
        
        if response.status_code == 200:
            data = response.json()
            created_income_id = data.get("income_id")
            if created_income_id:
                log_test("Create Test Income", "PASS", 
                        f"Created income ID: {created_income_id}, Amount: {data.get('amount')}, Source: {data.get('source')}")
            else:
                log_test("Create Test Income", "FAIL", "No income_id in response")
                return
        else:
            log_test("Create Test Income", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            return
            
    except Exception as e:
        log_test("Create Test Income", "FAIL", f"Exception: {str(e)}")
        return
    
    # Step 3: Create test expense
    print("3️⃣ Creating test expense...")
    try:
        expense_data = {
            "account_id": created_account_id,
            "amount": 3000,
            "category": "food",
            "description": "Big Bazaar Groceries",
            "payment_type": "bank",
            "date": "2026-04-05T00:00:00Z"
        }
        
        response = requests.post(f"{BASE_URL}/expenses", 
                               headers=auth_headers, 
                               json=expense_data)
        
        if response.status_code == 200:
            data = response.json()
            created_expense_id = data.get("expense_id")
            if created_expense_id:
                log_test("Create Test Expense", "PASS", 
                        f"Created expense ID: {created_expense_id}, Amount: {data.get('amount')}, Description: {data.get('description')}")
            else:
                log_test("Create Test Expense", "FAIL", "No expense_id in response")
                return
        else:
            log_test("Create Test Expense", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            return
            
    except Exception as e:
        log_test("Create Test Expense", "FAIL", f"Exception: {str(e)}")
        return
    
    # Step 4: Test Edit Income - PUT /api/income/{income_id}
    print("4️⃣ Testing Edit Income (PUT)...")
    try:
        income_update_data = {
            "amount": 30000,
            "source": "Updated Company Name",
            "category": "business",
            "notes": "Updated note"
        }
        
        response = requests.put(f"{BASE_URL}/income/{created_income_id}", 
                              headers=auth_headers, 
                              json=income_update_data)
        
        if response.status_code == 200:
            data = response.json()
            # Verify updated values
            if (data.get("amount") == 30000 and 
                data.get("source") == "Updated Company Name" and 
                data.get("category") == "business" and 
                data.get("notes") == "Updated note"):
                log_test("Edit Income (PUT)", "PASS", 
                        f"Income updated successfully - Amount: {data.get('amount')}, Source: {data.get('source')}, Category: {data.get('category')}")
            else:
                log_test("Edit Income (PUT)", "FAIL", 
                        f"Updated values don't match. Got: Amount={data.get('amount')}, Source={data.get('source')}, Category={data.get('category')}")
        else:
            log_test("Edit Income (PUT)", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Edit Income (PUT)", "FAIL", f"Exception: {str(e)}")
    
    # Step 5: Verify income update with GET
    print("5️⃣ Verifying income update with GET...")
    try:
        response = requests.get(f"{BASE_URL}/income", headers=auth_headers)
        
        if response.status_code == 200:
            incomes = response.json()
            updated_income = next((inc for inc in incomes if inc.get('income_id') == created_income_id), None)
            
            if updated_income:
                if (updated_income.get("amount") == 30000 and 
                    updated_income.get("source") == "Updated Company Name" and 
                    updated_income.get("category") == "business"):
                    log_test("Verify Income Update", "PASS", 
                            f"Income update verified in GET response")
                else:
                    log_test("Verify Income Update", "FAIL", 
                            f"Income values not updated in GET response")
            else:
                log_test("Verify Income Update", "FAIL", "Updated income not found in GET response")
        else:
            log_test("Verify Income Update", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Verify Income Update", "FAIL", f"Exception: {str(e)}")
    
    # Step 6: Test Edit Expense - PUT /api/expenses/{expense_id}
    print("6️⃣ Testing Edit Expense (PUT)...")
    try:
        expense_update_data = {
            "amount": 5000,
            "description": "Updated Description",
            "category": "shopping",
            "payment_type": "upi",
            "notes": "Updated expense note"
        }
        
        response = requests.put(f"{BASE_URL}/expenses/{created_expense_id}", 
                              headers=auth_headers, 
                              json=expense_update_data)
        
        if response.status_code == 200:
            data = response.json()
            # Verify updated values
            if (data.get("amount") == 5000 and 
                data.get("description") == "Updated Description" and 
                data.get("category") == "shopping" and 
                data.get("payment_type") == "upi" and
                data.get("notes") == "Updated expense note"):
                log_test("Edit Expense (PUT)", "PASS", 
                        f"Expense updated successfully - Amount: {data.get('amount')}, Description: {data.get('description')}, Category: {data.get('category')}")
            else:
                log_test("Edit Expense (PUT)", "FAIL", 
                        f"Updated values don't match. Got: Amount={data.get('amount')}, Description={data.get('description')}, Category={data.get('category')}")
        else:
            log_test("Edit Expense (PUT)", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Edit Expense (PUT)", "FAIL", f"Exception: {str(e)}")
    
    # Step 7: Verify expense update with GET
    print("7️⃣ Verifying expense update with GET...")
    try:
        response = requests.get(f"{BASE_URL}/expenses", headers=auth_headers)
        
        if response.status_code == 200:
            expenses = response.json()
            updated_expense = next((exp for exp in expenses if exp.get('expense_id') == created_expense_id), None)
            
            if updated_expense:
                if (updated_expense.get("amount") == 5000 and 
                    updated_expense.get("description") == "Updated Description" and 
                    updated_expense.get("category") == "shopping"):
                    log_test("Verify Expense Update", "PASS", 
                            f"Expense update verified in GET response")
                else:
                    log_test("Verify Expense Update", "FAIL", 
                            f"Expense values not updated in GET response")
            else:
                log_test("Verify Expense Update", "FAIL", "Updated expense not found in GET response")
        else:
            log_test("Verify Expense Update", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Verify Expense Update", "FAIL", f"Exception: {str(e)}")
    
    # Step 8: Test Edit Account - PUT /api/accounts/{account_id}
    print("8️⃣ Testing Edit Account (PUT)...")
    try:
        account_update_data = {
            "name": "SBI Salary Account",
            "account_number": "9876543210"
        }
        
        response = requests.put(f"{BASE_URL}/accounts/{created_account_id}", 
                              headers=auth_headers, 
                              json=account_update_data)
        
        if response.status_code == 200:
            data = response.json()
            # Verify updated values
            if (data.get("name") == "SBI Salary Account" and 
                data.get("account_number") == "9876543210"):
                log_test("Edit Account (PUT)", "PASS", 
                        f"Account updated successfully - Name: {data.get('name')}, Account Number: {data.get('account_number')}")
            else:
                log_test("Edit Account (PUT)", "FAIL", 
                        f"Updated values don't match. Got: Name={data.get('name')}, Account Number={data.get('account_number')}")
        else:
            log_test("Edit Account (PUT)", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Edit Account (PUT)", "FAIL", f"Exception: {str(e)}")
    
    # Step 9: Test Income with account_id filter - GET /api/income?account_id={account_id}
    print("9️⃣ Testing Income with account_id filter...")
    try:
        response = requests.get(f"{BASE_URL}/income?account_id={created_account_id}", 
                              headers=auth_headers)
        
        if response.status_code == 200:
            incomes = response.json()
            if isinstance(incomes, list):
                # Filter should return only incomes for this account
                account_incomes = [inc for inc in incomes if inc.get('account_id') == created_account_id]
                if len(account_incomes) >= 1:
                    log_test("Income Account Filter", "PASS", 
                            f"Found {len(account_incomes)} income(s) for account {created_account_id}")
                    
                    # Verify our updated income is in the results
                    our_income = next((inc for inc in account_incomes if inc.get('income_id') == created_income_id), None)
                    if our_income and our_income.get("amount") == 30000:
                        log_test("Filtered Income Verification", "PASS", 
                                f"Updated income found in filtered results with correct amount: {our_income.get('amount')}")
                    else:
                        log_test("Filtered Income Verification", "FAIL", 
                                "Updated income not found or incorrect amount in filtered results")
                else:
                    log_test("Income Account Filter", "FAIL", 
                            f"Expected at least 1 income for account, got {len(account_incomes)}")
            else:
                log_test("Income Account Filter", "FAIL", "Response is not a list")
        else:
            log_test("Income Account Filter", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Income Account Filter", "FAIL", f"Exception: {str(e)}")
    
    # Step 10: Cleanup - Delete created test data
    print("🔟 Cleanup - Deleting test data...")
    
    # Delete income
    if created_income_id:
        try:
            response = requests.delete(f"{BASE_URL}/income/{created_income_id}", headers=auth_headers)
            if response.status_code == 200:
                log_test("Delete Test Income", "PASS", f"Income {created_income_id} deleted")
            else:
                log_test("Delete Test Income", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            log_test("Delete Test Income", "FAIL", f"Exception: {str(e)}")
    
    # Delete expense
    if created_expense_id:
        try:
            response = requests.delete(f"{BASE_URL}/expenses/{created_expense_id}", headers=auth_headers)
            if response.status_code == 200:
                log_test("Delete Test Expense", "PASS", f"Expense {created_expense_id} deleted")
            else:
                log_test("Delete Test Expense", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            log_test("Delete Test Expense", "FAIL", f"Exception: {str(e)}")
    
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
    print("🚀 Starting Income/Expense/Accounts EDIT (PUT) Testing...")
    print("=" * 70)
    
    # Test authentication first
    access_token, user_id = test_authentication()
    
    if not access_token:
        print("❌ Authentication failed. Cannot proceed with API tests.")
        sys.exit(1)
    
    # Test Income/Expense/Accounts EDIT endpoints
    test_income_expense_accounts_edit(access_token)
    
    print("=" * 70)
    print("🏁 Income/Expense/Accounts EDIT (PUT) Testing Complete!")

if __name__ == "__main__":
    main()