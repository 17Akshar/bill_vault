#!/usr/bin/env python3
"""
Comprehensive Backend API Testing Script
Tests all backend APIs as per the review request
"""

import requests
import json
import sys
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://bill-tracker-mobile.preview.emergentagent.com/api"
TEST_USER = {
    "email": "fulltest@test.com",
    "password": "FullTest123!",
    "name": "Full Tester",
    "mobile_number": "9999888877",
    "security_question": "Fav food?",
    "security_answer": "Pizza"
}

class BackendTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.test_data = {}
        self.results = []
        
    def log_result(self, step, status, details=""):
        """Log test result"""
        result = f"STEP {step}: {status}"
        if details:
            result += f" - {details}"
        self.results.append(result)
        print(result)
        
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with proper headers"""
        url = f"{BASE_URL}{endpoint}"
        
        if headers is None:
            headers = {}
        
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        headers["Content-Type"] = "application/json"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            print(f"DEBUG: {method} {url} -> {response.status_code}")
            return response
        except requests.exceptions.Timeout as e:
            print(f"Request timeout: {e}")
            return None
        except requests.exceptions.ConnectionError as e:
            print(f"Connection error: {e}")
            return None
        except Exception as e:
            print(f"Request failed: {e}")
            return None
    
    def test_step_1_auth_flow(self):
        """STEP 1: Auth Flow - Register and Login"""
        print("\n=== STEP 1: AUTH FLOW ===")
        
        # Try to register (might fail if user exists)
        response = self.make_request("POST", "/auth/register", TEST_USER)
        if response is None:
            self.log_result("1a", "FAIL", "Registration failed: No response")
            return False
        elif response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.log_result("1a", "PASS", "Registration successful")
                self.token = data["access_token"]
                self.user_id = data["user"]["user_id"]
            else:
                self.log_result("1a", "FAIL", f"Registration missing token/user: {data}")
                return False
        elif response.status_code == 400:
            # User already exists, proceed to login
            self.log_result("1a", "PASS", "User already exists, proceeding to login")
        else:
            self.log_result("1a", "FAIL", f"Registration failed: {response.status_code}")
            return False
        
        # Login
        login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.log_result("1b", "PASS", "Login successful")
                self.token = data["access_token"]  # Use login token
                return True
            else:
                self.log_result("1b", "FAIL", f"Login missing token: {data}")
                return False
        else:
            self.log_result("1b", "FAIL", f"Login failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_2_accounts_crud(self):
        """STEP 2: Accounts CRUD"""
        print("\n=== STEP 2: ACCOUNTS CRUD ===")
        
        # Create account
        account_data = {
            "name": "Test Bank",
            "account_type": "bank",
            "initial_balance": 100000
        }
        response = self.make_request("POST", "/accounts", account_data)
        if response and response.status_code == 200:
            data = response.json()
            if "account_id" in data and data["name"] == "Test Bank":
                self.test_data["account_id"] = data["account_id"]
                self.log_result("2a", "PASS", f"Account created: {data['account_id']}")
            else:
                self.log_result("2a", "FAIL", f"Account creation invalid response: {data}")
                return False
        else:
            self.log_result("2a", "FAIL", f"Account creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Get accounts
        response = self.make_request("GET", "/accounts")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("2b", "PASS", f"Retrieved {len(data)} accounts")
            else:
                self.log_result("2b", "FAIL", f"No accounts retrieved: {data}")
                return False
        else:
            self.log_result("2b", "FAIL", f"Get accounts failed: {response.status_code if response else 'No response'}")
            return False
        
        # Update account
        update_data = {"name": "Updated Bank"}
        response = self.make_request("PUT", f"/accounts/{self.test_data['account_id']}", update_data)
        if response and response.status_code == 200:
            data = response.json()
            if data["name"] == "Updated Bank":
                self.log_result("2c", "PASS", "Account updated successfully")
            else:
                self.log_result("2c", "FAIL", f"Account update failed: {data}")
                return False
        else:
            self.log_result("2c", "FAIL", f"Account update failed: {response.status_code if response else 'No response'}")
            return False
        
        # Verify update
        response = self.make_request("GET", "/accounts")
        if response and response.status_code == 200:
            data = response.json()
            account = next((acc for acc in data if acc["account_id"] == self.test_data["account_id"]), None)
            if account and account["name"] == "Updated Bank":
                self.log_result("2d", "PASS", "Account update verified")
                return True
            else:
                self.log_result("2d", "FAIL", f"Account update not verified: {account}")
                return False
        else:
            self.log_result("2d", "FAIL", f"Account verification failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_3_income_with_subcategory(self):
        """STEP 3: Income with sub_category"""
        print("\n=== STEP 3: INCOME WITH SUB_CATEGORY ===")
        
        income_data = {
            "account_id": self.test_data["account_id"],
            "amount": 50000,
            "category": "salary",
            "sub_category": "Base Salary",
            "source": "Company",
            "date": "2026-04-19T00:00:00Z"
        }
        response = self.make_request("POST", "/income", income_data)
        if response and response.status_code == 200:
            data = response.json()
            if "income_id" in data and data.get("sub_category") == "Base Salary":
                self.test_data["income_id"] = data["income_id"]
                self.log_result("3a", "PASS", f"Income created with sub_category: {data['income_id']}")
            else:
                self.log_result("3a", "FAIL", f"Income creation failed or missing sub_category: {data}")
                return False
        else:
            self.log_result("3a", "FAIL", f"Income creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Verify sub_category in GET
        response = self.make_request("GET", "/income")
        if response and response.status_code == 200:
            data = response.json()
            income = next((inc for inc in data if inc["income_id"] == self.test_data["income_id"]), None)
            if income and income.get("sub_category") == "Base Salary":
                self.log_result("3b", "PASS", "Income sub_category verified in GET")
                return True
            else:
                self.log_result("3b", "FAIL", f"Income sub_category not found in GET: {income}")
                return False
        else:
            self.log_result("3b", "FAIL", f"Income GET failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_4_expense_with_subcategory(self):
        """STEP 4: Expense with sub_category"""
        print("\n=== STEP 4: EXPENSE WITH SUB_CATEGORY ===")
        
        expense_data = {
            "account_id": self.test_data["account_id"],
            "amount": 5000,
            "category": "food",
            "sub_category": "Restaurant",
            "payment_type": "upi",
            "description": "Team dinner",
            "date": "2026-04-19T00:00:00Z"
        }
        response = self.make_request("POST", "/expenses", expense_data)
        if response and response.status_code == 200:
            data = response.json()
            if "expense_id" in data and data.get("sub_category") == "Restaurant":
                self.test_data["expense_id"] = data["expense_id"]
                self.log_result("4a", "PASS", f"Expense created with sub_category: {data['expense_id']}")
            else:
                self.log_result("4a", "FAIL", f"Expense creation failed or missing sub_category: {data}")
                return False
        else:
            self.log_result("4a", "FAIL", f"Expense creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Verify sub_category in GET
        response = self.make_request("GET", "/expenses")
        if response and response.status_code == 200:
            data = response.json()
            expense = next((exp for exp in data if exp["expense_id"] == self.test_data["expense_id"]), None)
            if expense and expense.get("sub_category") == "Restaurant":
                self.log_result("4b", "PASS", "Expense sub_category verified in GET")
                return True
            else:
                self.log_result("4b", "FAIL", f"Expense sub_category not found in GET: {expense}")
                return False
        else:
            self.log_result("4b", "FAIL", f"Expense GET failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_5_bills(self):
        """STEP 5: Bills"""
        print("\n=== STEP 5: BILLS ===")
        
        # Create bill
        bill_data = {
            "name": "Electricity",
            "amount": 2500,
            "due_date": "2026-04-25T00:00:00Z",
            "category": "utilities",
            "is_recurring": True,
            "recurrence_type": "monthly"
        }
        response = self.make_request("POST", "/bills", bill_data)
        if response and response.status_code == 200:
            data = response.json()
            if "bill_id" in data and data["name"] == "Electricity":
                self.test_data["bill_id"] = data["bill_id"]
                self.log_result("5a", "PASS", f"Bill created: {data['bill_id']}")
            else:
                self.log_result("5a", "FAIL", f"Bill creation failed: {data}")
                return False
        else:
            self.log_result("5a", "FAIL", f"Bill creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Get bills
        response = self.make_request("GET", "/bills")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("5b", "PASS", f"Retrieved {len(data)} bills")
            else:
                self.log_result("5b", "FAIL", f"No bills retrieved: {data}")
                return False
        else:
            self.log_result("5b", "FAIL", f"Get bills failed: {response.status_code if response else 'No response'}")
            return False
        
        # Get bills summary
        response = self.make_request("GET", "/bills/summary")
        if response and response.status_code == 200:
            data = response.json()
            if "overdue" in data and "upcoming" in data and "paid" in data:
                self.log_result("5c", "PASS", "Bills summary retrieved successfully")
                return True
            else:
                self.log_result("5c", "FAIL", f"Bills summary missing fields: {data}")
                return False
        else:
            self.log_result("5c", "FAIL", f"Bills summary failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_6_dashboard(self):
        """STEP 6: Dashboard"""
        print("\n=== STEP 6: DASHBOARD ===")
        
        response = self.make_request("GET", "/dashboard")
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ["total_balance", "monthly_income", "monthly_expenses"]
            if all(field in data for field in required_fields):
                self.log_result("6", "PASS", f"Dashboard data retrieved: balance={data.get('total_balance')}")
                return True
            else:
                self.log_result("6", "FAIL", f"Dashboard missing required fields: {data}")
                return False
        else:
            self.log_result("6", "FAIL", f"Dashboard failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_7_credit_cards(self):
        """STEP 7: Credit Cards"""
        print("\n=== STEP 7: CREDIT CARDS ===")
        
        # Create credit card
        card_data = {
            "name": "HDFC Regalia",
            "card_number_last4": "1234",
            "credit_limit": 200000,
            "current_outstanding": 45000,
            "due_date": 20,
            "billing_date": 5
        }
        response = self.make_request("POST", "/credit-cards", card_data)
        if response and response.status_code == 200:
            data = response.json()
            if "card_id" in data and data["name"] == "HDFC Regalia":
                self.test_data["card_id"] = data["card_id"]
                self.log_result("7a", "PASS", f"Credit card created: {data['card_id']}")
            else:
                self.log_result("7a", "FAIL", f"Credit card creation failed: {data}")
                return False
        else:
            self.log_result("7a", "FAIL", f"Credit card creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Get credit cards report
        response = self.make_request("GET", "/credit-cards/report")
        if response and response.status_code == 200:
            data = response.json()
            if "summary" in data and "cards" in data:
                self.log_result("7b", "PASS", "Credit cards report retrieved successfully")
                return True
            else:
                self.log_result("7b", "FAIL", f"Credit cards report missing fields: {data}")
                return False
        else:
            self.log_result("7b", "FAIL", f"Credit cards report failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_8_investments_headings(self):
        """STEP 8: Investments + Headings"""
        print("\n=== STEP 8: INVESTMENTS + HEADINGS ===")
        
        # Create investment heading
        heading_data = {
            "name": "Equity",
            "icon": "trending-up"
        }
        response = self.make_request("POST", "/investment-headings", heading_data)
        if response and response.status_code == 200:
            data = response.json()
            if "heading_id" in data and data["name"] == "Equity":
                self.test_data["heading_id"] = data["heading_id"]
                self.log_result("8a", "PASS", f"Investment heading created: {data['heading_id']}")
            else:
                self.log_result("8a", "FAIL", f"Investment heading creation failed: {data}")
                return False
        else:
            self.log_result("8a", "FAIL", f"Investment heading creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Create investment
        investment_data = {
            "name": "Reliance",
            "investment_type": "stocks",
            "invested_amount": 50000,
            "current_value": 55000,
            "purchase_date": "2025-01-01T00:00:00Z",
            "heading_id": self.test_data["heading_id"]
        }
        response = self.make_request("POST", "/investments", investment_data)
        if response and response.status_code == 200:
            data = response.json()
            if "investment_id" in data and data["name"] == "Reliance":
                self.test_data["investment_id"] = data["investment_id"]
                self.log_result("8b", "PASS", f"Investment created: {data['investment_id']}")
            else:
                self.log_result("8b", "FAIL", f"Investment creation failed: {data}")
                return False
        else:
            self.log_result("8b", "FAIL", f"Investment creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Get investments
        response = self.make_request("GET", "/investments")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("8c", "PASS", f"Retrieved {len(data)} investments")
            else:
                self.log_result("8c", "FAIL", f"No investments retrieved: {data}")
                return False
        else:
            self.log_result("8c", "FAIL", f"Get investments failed: {response.status_code if response else 'No response'}")
            return False
        
        # Get investment headings (should show nested investments)
        response = self.make_request("GET", "/investment-headings")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("8d", "PASS", f"Retrieved {len(data)} investment headings")
                return True
            else:
                self.log_result("8d", "FAIL", f"No investment headings retrieved: {data}")
                return False
        else:
            self.log_result("8d", "FAIL", f"Get investment headings failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_9_rentals(self):
        """STEP 9: Rentals"""
        print("\n=== STEP 9: RENTALS ===")
        
        rental_data = {
            "property_name": "Flat 101",
            "tenant_name": "Amit",
            "rent_amount": 20000,
            "due_day": 5
        }
        response = self.make_request("POST", "/rentals", rental_data)
        if response and response.status_code == 200:
            data = response.json()
            if "rental_id" in data and data["property_name"] == "Flat 101":
                self.test_data["rental_id"] = data["rental_id"]
                self.log_result("9a", "PASS", f"Rental created: {data['rental_id']}")
            else:
                self.log_result("9a", "FAIL", f"Rental creation failed: {data}")
                return False
        else:
            self.log_result("9a", "FAIL", f"Rental creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Get rentals
        response = self.make_request("GET", "/rentals")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("9b", "PASS", f"Retrieved {len(data)} rentals")
                return True
            else:
                self.log_result("9b", "FAIL", f"No rentals retrieved: {data}")
                return False
        else:
            self.log_result("9b", "FAIL", f"Get rentals failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_10_loans_lending(self):
        """STEP 10: Loans & Lending"""
        print("\n=== STEP 10: LOANS & LENDING ===")
        
        # Create loan
        loan_data = {
            "name": "Home Loan",
            "loan_type": "home",
            "principal_amount": 2000000,
            "outstanding_amount": 1950000,
            "interest_rate": 8.5,
            "emi_amount": 17400,
            "tenure_months": 240,
            "start_date": "2025-01-01T00:00:00Z"
        }
        response = self.make_request("POST", "/loans", loan_data)
        if response and response.status_code == 200:
            data = response.json()
            if "loan_id" in data and data["name"] == "Home Loan":
                self.test_data["loan_id"] = data["loan_id"]
                self.log_result("10a", "PASS", f"Loan created: {data['loan_id']}")
            else:
                self.log_result("10a", "FAIL", f"Loan creation failed: {data}")
                return False
        else:
            self.log_result("10a", "FAIL", f"Loan creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Create lending
        lending_data = {
            "person_name": "Ravi",
            "amount": 10000,
            "lending_type": "lent",
            "date": "2026-04-01T00:00:00Z"
        }
        response = self.make_request("POST", "/lending", lending_data)
        if response and response.status_code == 200:
            data = response.json()
            if "lending_id" in data and data["person_name"] == "Ravi":
                self.test_data["lending_id"] = data["lending_id"]
                self.log_result("10b", "PASS", f"Lending created: {data['lending_id']}")
            else:
                self.log_result("10b", "FAIL", f"Lending creation failed: {data}")
                return False
        else:
            self.log_result("10b", "FAIL", f"Lending creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Get loans
        response = self.make_request("GET", "/loans")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("10c", "PASS", f"Retrieved {len(data)} loans")
            else:
                self.log_result("10c", "FAIL", f"No loans retrieved: {data}")
                return False
        else:
            self.log_result("10c", "FAIL", f"Get loans failed: {response.status_code if response else 'No response'}")
            return False
        
        # Get lending
        response = self.make_request("GET", "/lending")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("10d", "PASS", f"Retrieved {len(data)} lending records")
                return True
            else:
                self.log_result("10d", "FAIL", f"No lending records retrieved: {data}")
                return False
        else:
            self.log_result("10d", "FAIL", f"Get lending failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_11_budgets(self):
        """STEP 11: Budgets"""
        print("\n=== STEP 11: BUDGETS ===")
        
        budget_data = {
            "category": "food",
            "monthly_limit": 10000
        }
        response = self.make_request("POST", "/budgets", budget_data)
        if response and response.status_code == 200:
            data = response.json()
            if "budget_id" in data and data["category"] == "food":
                self.test_data["budget_id"] = data["budget_id"]
                self.log_result("11a", "PASS", f"Budget created: {data['budget_id']}")
            else:
                self.log_result("11a", "FAIL", f"Budget creation failed: {data}")
                return False
        else:
            self.log_result("11a", "FAIL", f"Budget creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Get budget progress
        response = self.make_request("GET", "/budgets/progress")
        if response and response.status_code == 200:
            data = response.json()
            if "total_budgeted" in data and "total_spent" in data and "budgets" in data:
                self.log_result("11b", "PASS", "Budget progress retrieved successfully")
                return True
            else:
                self.log_result("11b", "FAIL", f"Budget progress missing fields: {data}")
                return False
        else:
            self.log_result("11b", "FAIL", f"Budget progress failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_12_net_worth_analytics(self):
        """STEP 12: Net Worth & Analytics"""
        print("\n=== STEP 12: NET WORTH & ANALYTICS ===")
        
        # Net Worth
        response = self.make_request("GET", "/net-worth")
        if response and response.status_code == 200:
            data = response.json()
            if "net_worth" in data and "total_assets" in data and "total_liabilities" in data:
                self.log_result("12a", "PASS", f"Net worth retrieved: {data.get('net_worth')}")
            else:
                self.log_result("12a", "FAIL", f"Net worth missing fields: {data}")
                return False
        else:
            self.log_result("12a", "FAIL", f"Net worth failed: {response.status_code if response else 'No response'}")
            return False
        
        # Investment Analytics (note: endpoint is singular "investment")
        response = self.make_request("GET", "/analytics/investment")
        if response and response.status_code == 200:
            data = response.json()
            if "portfolio_allocation" in data or "summary" in data:
                self.log_result("12b", "PASS", "Investment analytics retrieved")
            else:
                self.log_result("12b", "FAIL", f"Investment analytics missing fields: {data}")
                return False
        else:
            self.log_result("12b", "FAIL", f"Investment analytics failed: {response.status_code if response else 'No response'}")
            return False
        
        # Cashflow Analytics
        response = self.make_request("GET", "/analytics/cashflow")
        if response and response.status_code == 200:
            data = response.json()
            if "summary" in data or "monthly_data" in data:
                self.log_result("12c", "PASS", "Cashflow analytics retrieved")
                return True
            else:
                self.log_result("12c", "FAIL", f"Cashflow analytics missing fields: {data}")
                return False
        else:
            self.log_result("12c", "FAIL", f"Cashflow analytics failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_13_reminders(self):
        """STEP 13: Reminders"""
        print("\n=== STEP 13: REMINDERS ===")
        
        reminder_data = {
            "title": "Pay rent",
            "reminder_type": "bill",
            "reminder_date": "2026-04-25T00:00:00Z",
            "is_recurring": True,
            "recurrence": "monthly"
        }
        response = self.make_request("POST", "/reminders", reminder_data)
        if response and response.status_code == 200:
            data = response.json()
            if "reminder_id" in data and data["title"] == "Pay rent":
                self.test_data["reminder_id"] = data["reminder_id"]
                self.log_result("13a", "PASS", f"Reminder created: {data['reminder_id']}")
            else:
                self.log_result("13a", "FAIL", f"Reminder creation failed: {data}")
                return False
        else:
            self.log_result("13a", "FAIL", f"Reminder creation failed: {response.status_code if response else 'No response'}")
            return False
        
        # Get reminders
        response = self.make_request("GET", "/reminders")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("13b", "PASS", f"Retrieved {len(data)} reminders")
                return True
            else:
                self.log_result("13b", "FAIL", f"No reminders retrieved: {data}")
                return False
        else:
            self.log_result("13b", "FAIL", f"Get reminders failed: {response.status_code if response else 'No response'}")
            return False
    
    def test_step_14_cleanup(self):
        """STEP 14: Cleanup"""
        print("\n=== STEP 14: CLEANUP ===")
        
        cleanup_items = [
            ("reminder", "reminders", "reminder_id"),
            ("budget", "budgets", "budget_id"),
            ("lending", "lending", "lending_id"),
            ("loan", "loans", "loan_id"),
            ("rental", "rentals", "rental_id"),
            ("investment", "investments", "investment_id"),
            ("heading", "investment-headings", "heading_id"),
            ("card", "credit-cards", "card_id"),
            ("bill", "bills", "bill_id"),
            ("expense", "expenses", "expense_id"),
            ("income", "income", "income_id"),
            ("account", "accounts", "account_id")
        ]
        
        success_count = 0
        for item_name, endpoint, id_key in cleanup_items:
            if id_key in self.test_data:
                response = self.make_request("DELETE", f"/{endpoint}/{self.test_data[id_key]}")
                if response and response.status_code in [200, 204]:
                    success_count += 1
                    print(f"  ✓ Deleted {item_name}")
                else:
                    print(f"  ✗ Failed to delete {item_name}: {response.status_code if response else 'No response'}")
        
        self.log_result("14", "PASS", f"Cleanup completed: {success_count}/{len(cleanup_items)} items deleted")
        return True
    
    def run_all_tests(self):
        """Run all test steps"""
        print("Starting Comprehensive Backend API Testing...")
        print(f"Base URL: {BASE_URL}")
        print(f"Test User: {TEST_USER['email']}")
        
        test_steps = [
            self.test_step_1_auth_flow,
            self.test_step_2_accounts_crud,
            self.test_step_3_income_with_subcategory,
            self.test_step_4_expense_with_subcategory,
            self.test_step_5_bills,
            self.test_step_6_dashboard,
            self.test_step_7_credit_cards,
            self.test_step_8_investments_headings,
            self.test_step_9_rentals,
            self.test_step_10_loans_lending,
            self.test_step_11_budgets,
            self.test_step_12_net_worth_analytics,
            self.test_step_13_reminders,
            self.test_step_14_cleanup
        ]
        
        passed = 0
        failed = 0
        
        for i, test_func in enumerate(test_steps, 1):
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
                    if i <= 2:  # Critical early steps
                        print(f"\n❌ CRITICAL FAILURE in step {i}. Stopping tests.")
                        break
            except Exception as e:
                print(f"\n❌ EXCEPTION in step {i}: {e}")
                failed += 1
                if i <= 2:  # Critical early steps
                    break
        
        print(f"\n{'='*50}")
        print("COMPREHENSIVE BACKEND API TEST RESULTS")
        print(f"{'='*50}")
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📊 SUCCESS RATE: {passed/(passed+failed)*100:.1f}%")
        print(f"{'='*50}")
        
        print("\nDETAILED RESULTS:")
        for result in self.results:
            status_icon = "✅" if "PASS" in result else "❌"
            print(f"{status_icon} {result}")
        
        return passed, failed

if __name__ == "__main__":
    tester = BackendTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)