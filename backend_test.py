#!/usr/bin/env python3
"""
Backend API Testing for Personal Financial Management System
Tests all Phase 1 backend endpoints in the specified order.
"""

import requests
import json
import sys
from datetime import datetime, timezone
import time

# Backend URL from frontend .env
BASE_URL = "https://bill-tracker-mobile.preview.emergentagent.com/api"

class FinancialAPITester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.family_members = []
        self.accounts = []
        self.incomes = []
        self.expenses = []
        self.bills = []
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def make_request(self, method, endpoint, data=None, params=None):
        """Make authenticated API request"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n=== TESTING AUTHENTICATION ===")
        
        # Test single-user mode authentication
        response = self.make_request("POST", "/auth/single-user")
        if response and response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.user_id = data.get("user", {}).get("user_id")
            self.log_test("Single-user authentication", True, f"Token obtained, user_id: {self.user_id}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Single-user authentication", False, error_msg)
            return False
            
        # Test /auth/me endpoint
        response = self.make_request("GET", "/auth/me")
        if response and response.status_code == 200:
            user_data = response.json()
            self.log_test("Get current user (/auth/me)", True, f"User: {user_data.get('name', 'Unknown')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get current user (/auth/me)", False, error_msg)
            
        return True
    
    def test_family_members_crud(self):
        """Test family members CRUD operations"""
        print("\n=== TESTING FAMILY MEMBERS CRUD ===")
        
        # Create family member 1 - Self
        response = self.make_request("POST", "/family-members", {
            "name": "Self",
            "role": "self"
        })
        if response and response.status_code == 200:
            member = response.json()
            self.family_members.append(member)
            self.log_test("Create family member (Self)", True, f"ID: {member.get('family_member_id')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Create family member (Self)", False, error_msg)
            
        # Create family member 2 - Spouse
        response = self.make_request("POST", "/family-members", {
            "name": "Spouse",
            "role": "spouse"
        })
        if response and response.status_code == 200:
            member = response.json()
            self.family_members.append(member)
            self.log_test("Create family member (Spouse)", True, f"ID: {member.get('family_member_id')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Create family member (Spouse)", False, error_msg)
            
        # Get all family members
        response = self.make_request("GET", "/family-members")
        if response and response.status_code == 200:
            members = response.json()
            expected_count = len(self.family_members)
            actual_count = len(members)
            if actual_count >= expected_count:
                self.log_test("Get family members", True, f"Found {actual_count} members")
            else:
                self.log_test("Get family members", False, f"Expected {expected_count}, got {actual_count}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get family members", False, error_msg)
            
        # Update family member
        if self.family_members:
            member_id = self.family_members[0]["family_member_id"]
            response = self.make_request("PUT", f"/family-members/{member_id}", {
                "name": "Self Updated",
                "role": "self"
            })
            if response and response.status_code == 200:
                updated_member = response.json()
                self.log_test("Update family member", True, f"Name updated to: {updated_member.get('name')}")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Update family member", False, error_msg)
                
        # Delete family member (delete the second one if exists)
        if len(self.family_members) > 1:
            member_id = self.family_members[1]["family_member_id"]
            response = self.make_request("DELETE", f"/family-members/{member_id}")
            if response and response.status_code == 200:
                self.log_test("Delete family member", True, "Member deleted successfully")
                self.family_members.pop(1)  # Remove from our list
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Delete family member", False, error_msg)
    
    def test_accounts_crud(self):
        """Test accounts CRUD operations"""
        print("\n=== TESTING ACCOUNTS CRUD ===")
        
        # Create HDFC Savings account
        response = self.make_request("POST", "/accounts", {
            "name": "HDFC Savings",
            "account_type": "bank",
            "initial_balance": 50000
        })
        if response and response.status_code == 200:
            account = response.json()
            self.accounts.append(account)
            self.log_test("Create HDFC Savings account", True, f"ID: {account.get('account_id')}, Balance: {account.get('balance')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Create HDFC Savings account", False, error_msg)
            
        # Create Cash Wallet account
        response = self.make_request("POST", "/accounts", {
            "name": "Cash Wallet",
            "account_type": "cash",
            "initial_balance": 5000
        })
        if response and response.status_code == 200:
            account = response.json()
            self.accounts.append(account)
            self.log_test("Create Cash Wallet account", True, f"ID: {account.get('account_id')}, Balance: {account.get('balance')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Create Cash Wallet account", False, error_msg)
            
        # Create PhonePe UPI account
        response = self.make_request("POST", "/accounts", {
            "name": "PhonePe",
            "account_type": "upi",
            "initial_balance": 2000
        })
        if response and response.status_code == 200:
            account = response.json()
            self.accounts.append(account)
            self.log_test("Create PhonePe UPI account", True, f"ID: {account.get('account_id')}, Balance: {account.get('balance')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Create PhonePe UPI account", False, error_msg)
            
        # Get all accounts
        response = self.make_request("GET", "/accounts")
        if response and response.status_code == 200:
            accounts = response.json()
            expected_count = len(self.accounts)
            actual_count = len(accounts)
            if actual_count >= expected_count:
                self.log_test("Get all accounts", True, f"Found {actual_count} accounts")
            else:
                self.log_test("Get all accounts", False, f"Expected {expected_count}, got {actual_count}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get all accounts", False, error_msg)
            
        # Test account type filter
        response = self.make_request("GET", "/accounts", params={"account_type": "bank"})
        if response and response.status_code == 200:
            bank_accounts = response.json()
            bank_count = len([a for a in self.accounts if a.get("account_type") == "bank"])
            if len(bank_accounts) >= bank_count:
                self.log_test("Filter accounts by type (bank)", True, f"Found {len(bank_accounts)} bank accounts")
            else:
                self.log_test("Filter accounts by type (bank)", False, f"Expected {bank_count}, got {len(bank_accounts)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Filter accounts by type (bank)", False, error_msg)
            
        # Get single account
        if self.accounts:
            account_id = self.accounts[0]["account_id"]
            response = self.make_request("GET", f"/accounts/{account_id}")
            if response and response.status_code == 200:
                account = response.json()
                self.log_test("Get single account", True, f"Retrieved account: {account.get('name')}")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Get single account", False, error_msg)
                
        # Update account
        if self.accounts:
            account_id = self.accounts[0]["account_id"]
            response = self.make_request("PUT", f"/accounts/{account_id}", {
                "name": "HDFC Bank Savings"
            })
            if response and response.status_code == 200:
                updated_account = response.json()
                self.log_test("Update account", True, f"Name updated to: {updated_account.get('name')}")
                # Update our local copy
                self.accounts[0]["name"] = updated_account.get("name")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Update account", False, error_msg)
                
        # Soft delete account (delete the last one)
        if len(self.accounts) > 2:
            account_id = self.accounts[2]["account_id"]
            response = self.make_request("DELETE", f"/accounts/{account_id}")
            if response and response.status_code == 200:
                self.log_test("Soft delete account", True, "Account deactivated successfully")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Soft delete account", False, error_msg)
    
    def test_income_crud_with_balance_updates(self):
        """Test income CRUD with balance updates"""
        print("\n=== TESTING INCOME CRUD WITH BALANCE UPDATES ===")
        
        if not self.accounts:
            self.log_test("Income tests", False, "No accounts available for testing")
            return
            
        # Get HDFC account balance before creating income
        hdfc_account = next((a for a in self.accounts if "HDFC" in a.get("name", "")), None)
        if not hdfc_account:
            self.log_test("Income tests", False, "HDFC account not found")
            return
            
        hdfc_id = hdfc_account["account_id"]
        
        # Get current balance
        response = self.make_request("GET", f"/accounts/{hdfc_id}")
        if response and response.status_code == 200:
            account_before = response.json()
            balance_before = account_before.get("balance", 0)
            self.log_test("Get account balance before income", True, f"Balance: {balance_before}")
        else:
            self.log_test("Get account balance before income", False, "Failed to get account")
            return
            
        # Create income entry
        income_amount = 75000
        response = self.make_request("POST", "/income", {
            "account_id": hdfc_id,
            "amount": income_amount,
            "category": "salary",
            "source": "Company Ltd",
            "date": "2026-06-15T00:00:00+00:00"
        })
        if response and response.status_code == 200:
            income = response.json()
            self.incomes.append(income)
            self.log_test("Create income entry", True, f"ID: {income.get('income_id')}, Amount: {income.get('amount')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Create income entry", False, error_msg)
            return
            
        # Verify balance increased
        response = self.make_request("GET", f"/accounts/{hdfc_id}")
        if response and response.status_code == 200:
            account_after = response.json()
            balance_after = account_after.get("balance", 0)
            expected_balance = balance_before + income_amount
            if balance_after == expected_balance:
                self.log_test("Verify balance increased after income", True, f"Balance: {balance_before} → {balance_after}")
            else:
                self.log_test("Verify balance increased after income", False, f"Expected {expected_balance}, got {balance_after}")
        else:
            self.log_test("Verify balance increased after income", False, "Failed to get updated account")
            
        # Get all income entries
        response = self.make_request("GET", "/income")
        if response and response.status_code == 200:
            incomes = response.json()
            if len(incomes) >= len(self.incomes):
                self.log_test("Get income entries", True, f"Found {len(incomes)} income entries")
            else:
                self.log_test("Get income entries", False, f"Expected {len(self.incomes)}, got {len(incomes)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get income entries", False, error_msg)
            
        # Test income filter by category
        response = self.make_request("GET", "/income", params={"category": "salary"})
        if response and response.status_code == 200:
            salary_incomes = response.json()
            salary_count = len([i for i in self.incomes if i.get("category") == "salary"])
            if len(salary_incomes) >= salary_count:
                self.log_test("Filter income by category", True, f"Found {len(salary_incomes)} salary entries")
            else:
                self.log_test("Filter income by category", False, f"Expected {salary_count}, got {len(salary_incomes)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Filter income by category", False, error_msg)
            
        # Update income amount
        if self.incomes:
            income_id = self.incomes[0]["income_id"]
            new_amount = 80000
            response = self.make_request("PUT", f"/income/{income_id}", {
                "amount": new_amount
            })
            if response and response.status_code == 200:
                updated_income = response.json()
                self.log_test("Update income amount", True, f"Amount updated to: {updated_income.get('amount')}")
                
                # Verify balance adjustment
                response = self.make_request("GET", f"/accounts/{hdfc_id}")
                if response and response.status_code == 200:
                    account_updated = response.json()
                    balance_updated = account_updated.get("balance", 0)
                    # Balance should be: original + new_amount (since old amount was reversed)
                    expected_balance = balance_before + new_amount
                    if balance_updated == expected_balance:
                        self.log_test("Verify balance adjusted after income update", True, f"Balance correctly adjusted to {balance_updated}")
                    else:
                        self.log_test("Verify balance adjusted after income update", False, f"Expected {expected_balance}, got {balance_updated}")
                else:
                    self.log_test("Verify balance adjusted after income update", False, "Failed to get updated account")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Update income amount", False, error_msg)
                
        # Delete income entry
        if self.incomes:
            income_id = self.incomes[0]["income_id"]
            response = self.make_request("DELETE", f"/income/{income_id}")
            if response and response.status_code == 200:
                self.log_test("Delete income entry", True, "Income deleted successfully")
                
                # Verify balance reversed
                response = self.make_request("GET", f"/accounts/{hdfc_id}")
                if response and response.status_code == 200:
                    account_final = response.json()
                    balance_final = account_final.get("balance", 0)
                    if balance_final == balance_before:
                        self.log_test("Verify balance reversed after income delete", True, f"Balance restored to {balance_final}")
                    else:
                        self.log_test("Verify balance reversed after income delete", False, f"Expected {balance_before}, got {balance_final}")
                else:
                    self.log_test("Verify balance reversed after income delete", False, "Failed to get final account state")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Delete income entry", False, error_msg)
    
    def test_expenses_crud_with_balance_updates(self):
        """Test expenses CRUD with balance updates"""
        print("\n=== TESTING EXPENSES CRUD WITH BALANCE UPDATES ===")
        
        if not self.accounts:
            self.log_test("Expense tests", False, "No accounts available for testing")
            return
            
        # Get Cash account
        cash_account = next((a for a in self.accounts if "Cash" in a.get("name", "")), None)
        if not cash_account:
            self.log_test("Expense tests", False, "Cash account not found")
            return
            
        cash_id = cash_account["account_id"]
        
        # Get current balance
        response = self.make_request("GET", f"/accounts/{cash_id}")
        if response and response.status_code == 200:
            account_before = response.json()
            balance_before = account_before.get("balance", 0)
            self.log_test("Get account balance before expense", True, f"Balance: {balance_before}")
        else:
            self.log_test("Get account balance before expense", False, "Failed to get account")
            return
            
        # Create expense entry
        expense_amount = 500
        response = self.make_request("POST", "/expenses", {
            "account_id": cash_id,
            "amount": expense_amount,
            "category": "food",
            "payment_type": "cash",
            "description": "Lunch",
            "date": "2026-06-15T00:00:00+00:00"
        })
        if response and response.status_code == 200:
            expense = response.json()
            self.expenses.append(expense)
            self.log_test("Create expense entry", True, f"ID: {expense.get('expense_id')}, Amount: {expense.get('amount')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Create expense entry", False, error_msg)
            return
            
        # Verify balance decreased
        response = self.make_request("GET", f"/accounts/{cash_id}")
        if response and response.status_code == 200:
            account_after = response.json()
            balance_after = account_after.get("balance", 0)
            expected_balance = balance_before - expense_amount
            if balance_after == expected_balance:
                self.log_test("Verify balance decreased after expense", True, f"Balance: {balance_before} → {balance_after}")
            else:
                self.log_test("Verify balance decreased after expense", False, f"Expected {expected_balance}, got {balance_after}")
        else:
            self.log_test("Verify balance decreased after expense", False, "Failed to get updated account")
            
        # Get all expense entries
        response = self.make_request("GET", "/expenses")
        if response and response.status_code == 200:
            expenses = response.json()
            if len(expenses) >= len(self.expenses):
                self.log_test("Get expense entries", True, f"Found {len(expenses)} expense entries")
            else:
                self.log_test("Get expense entries", False, f"Expected {len(self.expenses)}, got {len(expenses)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get expense entries", False, error_msg)
            
        # Test expense filter by category
        response = self.make_request("GET", "/expenses", params={"category": "food"})
        if response and response.status_code == 200:
            food_expenses = response.json()
            food_count = len([e for e in self.expenses if e.get("category") == "food"])
            if len(food_expenses) >= food_count:
                self.log_test("Filter expenses by category", True, f"Found {len(food_expenses)} food expenses")
            else:
                self.log_test("Filter expenses by category", False, f"Expected {food_count}, got {len(food_expenses)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Filter expenses by category", False, error_msg)
            
        # Test expense filter by payment type
        response = self.make_request("GET", "/expenses", params={"payment_type": "cash"})
        if response and response.status_code == 200:
            cash_expenses = response.json()
            cash_count = len([e for e in self.expenses if e.get("payment_type") == "cash"])
            if len(cash_expenses) >= cash_count:
                self.log_test("Filter expenses by payment type", True, f"Found {len(cash_expenses)} cash expenses")
            else:
                self.log_test("Filter expenses by payment type", False, f"Expected {cash_count}, got {len(cash_expenses)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Filter expenses by payment type", False, error_msg)
            
        # Update expense amount
        if self.expenses:
            expense_id = self.expenses[0]["expense_id"]
            new_amount = 600
            response = self.make_request("PUT", f"/expenses/{expense_id}", {
                "amount": new_amount
            })
            if response and response.status_code == 200:
                updated_expense = response.json()
                self.log_test("Update expense amount", True, f"Amount updated to: {updated_expense.get('amount')}")
                
                # Verify balance adjustment
                response = self.make_request("GET", f"/accounts/{cash_id}")
                if response and response.status_code == 200:
                    account_updated = response.json()
                    balance_updated = account_updated.get("balance", 0)
                    # Balance should be: original - new_amount
                    expected_balance = balance_before - new_amount
                    if balance_updated == expected_balance:
                        self.log_test("Verify balance adjusted after expense update", True, f"Balance correctly adjusted to {balance_updated}")
                    else:
                        self.log_test("Verify balance adjusted after expense update", False, f"Expected {expected_balance}, got {balance_updated}")
                else:
                    self.log_test("Verify balance adjusted after expense update", False, "Failed to get updated account")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Update expense amount", False, error_msg)
                
        # Delete expense entry
        if self.expenses:
            expense_id = self.expenses[0]["expense_id"]
            response = self.make_request("DELETE", f"/expenses/{expense_id}")
            if response and response.status_code == 200:
                self.log_test("Delete expense entry", True, "Expense deleted successfully")
                
                # Verify balance reversed
                response = self.make_request("GET", f"/accounts/{cash_id}")
                if response and response.status_code == 200:
                    account_final = response.json()
                    balance_final = account_final.get("balance", 0)
                    if balance_final == balance_before:
                        self.log_test("Verify balance reversed after expense delete", True, f"Balance restored to {balance_final}")
                    else:
                        self.log_test("Verify balance reversed after expense delete", False, f"Expected {balance_before}, got {balance_final}")
                else:
                    self.log_test("Verify balance reversed after expense delete", False, "Failed to get final account state")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Delete expense entry", False, error_msg)
    
    def test_dashboard(self):
        """Test dashboard endpoint"""
        print("\n=== TESTING DASHBOARD ===")
        
        # First create some fresh income and expenses for current month
        if self.accounts:
            # Create income
            hdfc_account = next((a for a in self.accounts if "HDFC" in a.get("name", "")), None)
            if hdfc_account:
                response = self.make_request("POST", "/income", {
                    "account_id": hdfc_account["account_id"],
                    "amount": 50000,
                    "category": "salary",
                    "source": "Test Company",
                    "date": datetime.now(timezone.utc).isoformat()
                })
                if response and response.status_code == 200:
                    self.log_test("Create test income for dashboard", True, "Income created")
                else:
                    self.log_test("Create test income for dashboard", False, "Failed to create income")
                    
            # Create expense
            cash_account = next((a for a in self.accounts if "Cash" in a.get("name", "")), None)
            if cash_account:
                response = self.make_request("POST", "/expenses", {
                    "account_id": cash_account["account_id"],
                    "amount": 1500,
                    "category": "food",
                    "payment_type": "cash",
                    "description": "Groceries",
                    "date": datetime.now(timezone.utc).isoformat()
                })
                if response and response.status_code == 200:
                    self.log_test("Create test expense for dashboard", True, "Expense created")
                else:
                    self.log_test("Create test expense for dashboard", False, "Failed to create expense")
        
        # Test dashboard endpoint
        response = self.make_request("GET", "/dashboard")
        if response and response.status_code == 200:
            dashboard = response.json()
            
            # Check required fields
            required_fields = [
                "total_balance", "monthly_income", "monthly_expenses", "monthly_savings",
                "accounts", "recent_transactions", "income_by_category", "expense_by_category"
            ]
            
            missing_fields = [field for field in required_fields if field not in dashboard]
            if not missing_fields:
                self.log_test("Dashboard structure", True, "All required fields present")
            else:
                self.log_test("Dashboard structure", False, f"Missing fields: {missing_fields}")
                
            # Check formatted currency strings
            formatted_fields = [
                "total_balance_formatted", "monthly_income_formatted", 
                "monthly_expenses_formatted", "monthly_savings_formatted"
            ]
            
            missing_formatted = [field for field in formatted_fields if field not in dashboard]
            if not missing_formatted:
                self.log_test("Dashboard formatted currency", True, "All formatted fields present")
            else:
                self.log_test("Dashboard formatted currency", False, f"Missing formatted fields: {missing_formatted}")
                
            # Check accounts array
            if isinstance(dashboard.get("accounts"), list):
                self.log_test("Dashboard accounts array", True, f"Found {len(dashboard['accounts'])} accounts")
            else:
                self.log_test("Dashboard accounts array", False, "Accounts field is not an array")
                
            # Check recent transactions
            if isinstance(dashboard.get("recent_transactions"), list):
                self.log_test("Dashboard recent transactions", True, f"Found {len(dashboard['recent_transactions'])} transactions")
            else:
                self.log_test("Dashboard recent transactions", False, "Recent transactions field is not an array")
                
            # Check category breakdowns
            if isinstance(dashboard.get("income_by_category"), list) and isinstance(dashboard.get("expense_by_category"), list):
                self.log_test("Dashboard category breakdowns", True, "Income and expense category breakdowns present")
            else:
                self.log_test("Dashboard category breakdowns", False, "Category breakdowns missing or invalid")
                
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Dashboard endpoint", False, error_msg)
    
    def test_bills_crud(self):
        """Test bills CRUD operations"""
        print("\n=== TESTING BILLS CRUD ===")
        
        # Create bill
        response = self.make_request("POST", "/bills", {
            "name": "Electricity Bill",
            "amount": 2500,
            "currency": "INR",
            "due_date": "2026-07-15T00:00:00+00:00",
            "category": "utilities",
            "vendor": "Power Company",
            "notes": "Monthly electricity bill"
        })
        if response and response.status_code == 200:
            bill = response.json()
            self.bills.append(bill)
            self.log_test("Create bill", True, f"ID: {bill.get('bill_id')}, Amount: {bill.get('amount')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Create bill", False, error_msg)
            
        # Get all bills
        response = self.make_request("GET", "/bills")
        if response and response.status_code == 200:
            bills = response.json()
            if len(bills) >= len(self.bills):
                self.log_test("Get bills", True, f"Found {len(bills)} bills")
            else:
                self.log_test("Get bills", False, f"Expected {len(self.bills)}, got {len(bills)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get bills", False, error_msg)
            
        # Update bill
        if self.bills:
            bill_id = self.bills[0]["bill_id"]
            response = self.make_request("PUT", f"/bills/{bill_id}", {
                "name": "Electricity Bill Updated",
                "amount": 2800
            })
            if response and response.status_code == 200:
                updated_bill = response.json()
                self.log_test("Update bill", True, f"Name: {updated_bill.get('name')}, Amount: {updated_bill.get('amount')}")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Update bill", False, error_msg)
                
        # Delete bill
        if self.bills:
            bill_id = self.bills[0]["bill_id"]
            response = self.make_request("DELETE", f"/bills/{bill_id}")
            if response and response.status_code == 200:
                self.log_test("Delete bill", True, "Bill deleted successfully")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Delete bill", False, error_msg)
    
    def test_export(self):
        """Test export endpoint"""
        print("\n=== TESTING EXPORT ===")
        
        response = self.make_request("GET", "/export")
        if response and response.status_code == 200:
            export_data = response.json()
            
            # Check required sections
            required_sections = ["user", "accounts", "income", "expenses", "family_members"]
            missing_sections = [section for section in required_sections if section not in export_data]
            
            if not missing_sections:
                self.log_test("Export data structure", True, "All required sections present")
            else:
                self.log_test("Export data structure", False, f"Missing sections: {missing_sections}")
                
            # Check if data is present
            data_counts = {
                "accounts": len(export_data.get("accounts", [])),
                "income": len(export_data.get("income", [])),
                "expenses": len(export_data.get("expenses", [])),
                "family_members": len(export_data.get("family_members", []))
            }
            
            self.log_test("Export data content", True, f"Data counts: {data_counts}")
            
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Export endpoint", False, error_msg)
    
    def run_all_tests(self):
        """Run all tests in the specified order"""
        print("🚀 Starting Personal Financial Management System Backend API Tests")
        print(f"Testing against: {BASE_URL}")
        print("=" * 80)
        
        # Test in the specified order
        if not self.test_authentication():
            print("\n❌ Authentication failed - stopping tests")
            return
            
        self.test_family_members_crud()
        self.test_accounts_crud()
        self.test_income_crud_with_balance_updates()
        self.test_expenses_crud_with_balance_updates()
        self.test_dashboard()
        self.test_bills_crud()
        self.test_export()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"  • {test['test']}: {test['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = FinancialAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)