#!/usr/bin/env python3
"""
Phase 5 Backend API Testing Script
Tests the following endpoints:
1. Rental Income CRUD API
2. Investment Headings CRUD API  
3. Credit Card Report API
4. Bills Summary API
5. Income with sub_category field
6. Expenses with sub_category field
"""

import requests
import json
import sys
from datetime import datetime, timezone

# Backend URL from environment
BACKEND_URL = "https://bill-tracker-mobile.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.test_data = {}
        
    def authenticate(self):
        """Get authentication token using single-user mode"""
        print("🔐 Authenticating with single-user mode...")
        
        response = requests.post(f"{BACKEND_URL}/auth/single-user")
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.user_id = data.get("user", {}).get("user_id")
            print(f"✅ Authentication successful. User ID: {self.user_id}")
            return True
        else:
            print(f"❌ Authentication failed: {response.status_code} - {response.text}")
            return False
    
    def get_headers(self):
        """Get headers with authorization token"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_rental_income_crud(self):
        """Test Rental Income CRUD operations"""
        print("\n🏠 Testing Rental Income CRUD API...")
        
        # 1. CREATE Rental
        print("1️⃣ Testing POST /api/rentals")
        rental_data = {
            "property_name": "Test Flat",
            "tenant_name": "Test Tenant", 
            "rent_amount": 25000,
            "due_day": 5
        }
        
        response = requests.post(
            f"{BACKEND_URL}/rentals",
            headers=self.get_headers(),
            json=rental_data
        )
        
        if response.status_code == 200:
            rental = response.json()
            self.test_data['rental_id'] = rental.get('rental_id')
            print(f"✅ Rental created successfully: {rental.get('property_name')} - ₹{rental.get('rent_amount')}")
        else:
            print(f"❌ Failed to create rental: {response.status_code} - {response.text}")
            return False
        
        # 2. READ Rentals
        print("2️⃣ Testing GET /api/rentals")
        response = requests.get(f"{BACKEND_URL}/rentals", headers=self.get_headers())
        
        if response.status_code == 200:
            rentals = response.json()
            print(f"✅ Retrieved {len(rentals)} rentals")
            if rentals:
                print(f"   First rental: {rentals[0].get('property_name')} - ₹{rentals[0].get('rent_amount')}")
        else:
            print(f"❌ Failed to get rentals: {response.status_code} - {response.text}")
            return False
        
        # 3. UPDATE Rental
        print("3️⃣ Testing PUT /api/rentals/{rental_id}")
        update_data = {"rent_amount": 27000}
        
        response = requests.put(
            f"{BACKEND_URL}/rentals/{self.test_data['rental_id']}",
            headers=self.get_headers(),
            json=update_data
        )
        
        if response.status_code == 200:
            updated_rental = response.json()
            print(f"✅ Rental updated successfully: ₹{updated_rental.get('rent_amount')}")
        else:
            print(f"❌ Failed to update rental: {response.status_code} - {response.text}")
            return False
        
        # 4. DELETE Rental
        print("4️⃣ Testing DELETE /api/rentals/{rental_id}")
        response = requests.delete(
            f"{BACKEND_URL}/rentals/{self.test_data['rental_id']}",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            print("✅ Rental deleted successfully")
        else:
            print(f"❌ Failed to delete rental: {response.status_code} - {response.text}")
            return False
        
        return True
    
    def test_investment_headings_crud(self):
        """Test Investment Headings CRUD operations"""
        print("\n📈 Testing Investment Headings CRUD API...")
        
        # 1. CREATE Investment Heading
        print("1️⃣ Testing POST /api/investment-headings")
        heading_data = {
            "name": "Test Stocks",
            "icon": "trending-up"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/investment-headings",
            headers=self.get_headers(),
            json=heading_data
        )
        
        if response.status_code == 200:
            heading = response.json()
            self.test_data['heading_id'] = heading.get('heading_id')
            print(f"✅ Investment heading created: {heading.get('name')} ({heading.get('icon')})")
        else:
            print(f"❌ Failed to create investment heading: {response.status_code} - {response.text}")
            return False
        
        # 2. READ Investment Headings
        print("2️⃣ Testing GET /api/investment-headings")
        response = requests.get(f"{BACKEND_URL}/investment-headings", headers=self.get_headers())
        
        if response.status_code == 200:
            headings = response.json()
            print(f"✅ Retrieved {len(headings)} investment headings")
            if headings:
                print(f"   First heading: {headings[0].get('name')} - {headings[0].get('count', 0)} investments")
        else:
            print(f"❌ Failed to get investment headings: {response.status_code} - {response.text}")
            return False
        
        # 3. UPDATE Investment Heading
        print("3️⃣ Testing PUT /api/investment-headings/{heading_id}")
        update_data = {"name": "Updated Stocks"}
        
        response = requests.put(
            f"{BACKEND_URL}/investment-headings/{self.test_data['heading_id']}",
            headers=self.get_headers(),
            json=update_data
        )
        
        if response.status_code == 200:
            updated_heading = response.json()
            print(f"✅ Investment heading updated: {updated_heading.get('name')}")
        else:
            print(f"❌ Failed to update investment heading: {response.status_code} - {response.text}")
            return False
        
        # 4. DELETE Investment Heading
        print("4️⃣ Testing DELETE /api/investment-headings/{heading_id}")
        response = requests.delete(
            f"{BACKEND_URL}/investment-headings/{self.test_data['heading_id']}",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            print("✅ Investment heading deleted successfully")
        else:
            print(f"❌ Failed to delete investment heading: {response.status_code} - {response.text}")
            return False
        
        return True
    
    def test_credit_cards_report(self):
        """Test Credit Cards Report API"""
        print("\n💳 Testing Credit Cards Report API...")
        
        print("1️⃣ Testing GET /api/credit-cards/report")
        response = requests.get(f"{BACKEND_URL}/credit-cards/report", headers=self.get_headers())
        
        if response.status_code == 200:
            report = response.json()
            
            # Verify required structure
            required_keys = ["summary", "upcoming_dues", "cards"]
            missing_keys = [key for key in required_keys if key not in report]
            
            if missing_keys:
                print(f"❌ Missing required keys in report: {missing_keys}")
                return False
            
            summary = report.get("summary", {})
            print(f"✅ Credit Cards Report retrieved successfully")
            print(f"   Total Cards: {summary.get('total_cards', 0)}")
            print(f"   Total Limit: ₹{summary.get('total_limit', 0):,.2f}")
            print(f"   Total Outstanding: ₹{summary.get('total_outstanding', 0):,.2f}")
            print(f"   Utilization: {summary.get('utilization', 0)}%")
            print(f"   Upcoming Dues: {len(report.get('upcoming_dues', []))}")
            
        else:
            print(f"❌ Failed to get credit cards report: {response.status_code} - {response.text}")
            return False
        
        return True
    
    def test_bills_summary(self):
        """Test Bills Summary API"""
        print("\n📋 Testing Bills Summary API...")
        
        print("1️⃣ Testing GET /api/bills/summary")
        response = requests.get(f"{BACKEND_URL}/bills/summary", headers=self.get_headers())
        
        if response.status_code == 200:
            summary = response.json()
            
            # Verify required structure
            required_keys = ["overdue", "overdue_count", "upcoming", "upcoming_count", "paid", "paid_count"]
            missing_keys = [key for key in required_keys if key not in summary]
            
            if missing_keys:
                print(f"❌ Missing required keys in summary: {missing_keys}")
                return False
            
            print(f"✅ Bills Summary retrieved successfully")
            print(f"   Overdue Bills: {summary.get('overdue_count', 0)}")
            print(f"   Upcoming Bills: {summary.get('upcoming_count', 0)}")
            print(f"   Paid Bills: {summary.get('paid_count', 0)}")
            print(f"   Total Overdue Amount: ₹{summary.get('total_overdue_amount', 0):,.2f}")
            print(f"   Total Upcoming Amount: ₹{summary.get('total_upcoming_amount', 0):,.2f}")
            
        else:
            print(f"❌ Failed to get bills summary: {response.status_code} - {response.text}")
            return False
        
        return True
    
    def test_income_with_subcategory(self):
        """Test Income with sub_category field"""
        print("\n💰 Testing Income with sub_category...")
        
        # First get an account_id
        print("1️⃣ Getting account for income test...")
        response = requests.get(f"{BACKEND_URL}/accounts", headers=self.get_headers())
        
        if response.status_code != 200:
            print(f"❌ Failed to get accounts: {response.status_code} - {response.text}")
            return False
        
        accounts = response.json()
        if not accounts:
            print("❌ No accounts found. Creating a test account...")
            # Create a test account
            account_data = {
                "name": "Test Account for Income",
                "account_type": "bank",
                "initial_balance": 50000
            }
            response = requests.post(f"{BACKEND_URL}/accounts", headers=self.get_headers(), json=account_data)
            if response.status_code == 200:
                account = response.json()
                account_id = account.get('account_id')
                print(f"✅ Test account created: {account_id}")
            else:
                print(f"❌ Failed to create test account: {response.status_code} - {response.text}")
                return False
        else:
            account_id = accounts[0].get('account_id')
            print(f"✅ Using existing account: {account_id}")
        
        # 2. CREATE Income with sub_category
        print("2️⃣ Testing POST /api/income with sub_category")
        income_data = {
            "account_id": account_id,
            "amount": 15000,
            "category": "salary",
            "sub_category": "Bonus",
            "source": "Company Bonus",
            "date": datetime.now(timezone.utc).isoformat(),
            "notes": "Year-end bonus"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/income",
            headers=self.get_headers(),
            json=income_data
        )
        
        if response.status_code == 200:
            income = response.json()
            self.test_data['income_id'] = income.get('income_id')
            print(f"✅ Income created with sub_category: {income.get('category')} > {income.get('sub_category')}")
            print(f"   Amount: ₹{income.get('amount'):,.2f}")
            
            # Verify sub_category is returned
            if income.get('sub_category') == "Bonus":
                print("✅ sub_category field verified in response")
            else:
                print(f"❌ sub_category mismatch. Expected: Bonus, Got: {income.get('sub_category')}")
                return False
                
        else:
            print(f"❌ Failed to create income: {response.status_code} - {response.text}")
            return False
        
        # 3. Verify sub_category in GET request
        print("3️⃣ Verifying sub_category in GET /api/income")
        response = requests.get(f"{BACKEND_URL}/income", headers=self.get_headers())
        
        if response.status_code == 200:
            incomes = response.json()
            test_income = next((i for i in incomes if i.get('income_id') == self.test_data['income_id']), None)
            
            if test_income and test_income.get('sub_category') == "Bonus":
                print("✅ sub_category persisted correctly in database")
            else:
                print(f"❌ sub_category not found in GET response")
                return False
        else:
            print(f"❌ Failed to get income: {response.status_code} - {response.text}")
            return False
        
        return True
    
    def test_expense_with_subcategory(self):
        """Test Expense with sub_category field"""
        print("\n💸 Testing Expense with sub_category...")
        
        # First get an account_id
        print("1️⃣ Getting account for expense test...")
        response = requests.get(f"{BACKEND_URL}/accounts", headers=self.get_headers())
        
        if response.status_code != 200:
            print(f"❌ Failed to get accounts: {response.status_code} - {response.text}")
            return False
        
        accounts = response.json()
        if not accounts:
            print("❌ No accounts found for expense test")
            return False
        
        account_id = accounts[0].get('account_id')
        print(f"✅ Using account: {account_id}")
        
        # 2. CREATE Expense with sub_category
        print("2️⃣ Testing POST /api/expenses with sub_category")
        expense_data = {
            "account_id": account_id,
            "amount": 2500,
            "category": "food",
            "sub_category": "Restaurant",
            "payment_type": "upi",
            "description": "Dinner at Italian Restaurant",
            "date": datetime.now(timezone.utc).isoformat(),
            "notes": "Team dinner"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/expenses",
            headers=self.get_headers(),
            json=expense_data
        )
        
        if response.status_code == 200:
            expense = response.json()
            self.test_data['expense_id'] = expense.get('expense_id')
            print(f"✅ Expense created with sub_category: {expense.get('category')} > {expense.get('sub_category')}")
            print(f"   Amount: ₹{expense.get('amount'):,.2f}")
            
            # Verify sub_category is returned
            if expense.get('sub_category') == "Restaurant":
                print("✅ sub_category field verified in response")
            else:
                print(f"❌ sub_category mismatch. Expected: Restaurant, Got: {expense.get('sub_category')}")
                return False
                
        else:
            print(f"❌ Failed to create expense: {response.status_code} - {response.text}")
            return False
        
        # 3. Verify sub_category in GET request
        print("3️⃣ Verifying sub_category in GET /api/expenses")
        response = requests.get(f"{BACKEND_URL}/expenses", headers=self.get_headers())
        
        if response.status_code == 200:
            expenses = response.json()
            test_expense = next((e for e in expenses if e.get('expense_id') == self.test_data['expense_id']), None)
            
            if test_expense and test_expense.get('sub_category') == "Restaurant":
                print("✅ sub_category persisted correctly in database")
            else:
                print(f"❌ sub_category not found in GET response")
                return False
        else:
            print(f"❌ Failed to get expenses: {response.status_code} - {response.text}")
            return False
        
        return True
    
    def cleanup_test_data(self):
        """Clean up test data created during testing"""
        print("\n🧹 Cleaning up test data...")
        
        # Clean up income
        if 'income_id' in self.test_data:
            response = requests.delete(
                f"{BACKEND_URL}/income/{self.test_data['income_id']}",
                headers=self.get_headers()
            )
            if response.status_code == 200:
                print("✅ Test income cleaned up")
        
        # Clean up expense  
        if 'expense_id' in self.test_data:
            response = requests.delete(
                f"{BACKEND_URL}/expenses/{self.test_data['expense_id']}",
                headers=self.get_headers()
            )
            if response.status_code == 200:
                print("✅ Test expense cleaned up")
        
        print("✅ Cleanup completed")
    
    def run_all_tests(self):
        """Run all Phase 5 backend tests"""
        print("🚀 Starting Phase 5 Backend API Testing...")
        print(f"Backend URL: {BACKEND_URL}")
        
        # Authenticate first
        if not self.authenticate():
            return False
        
        test_results = []
        
        # Run all tests
        tests = [
            ("Rental Income CRUD", self.test_rental_income_crud),
            ("Investment Headings CRUD", self.test_investment_headings_crud),
            ("Credit Cards Report", self.test_credit_cards_report),
            ("Bills Summary", self.test_bills_summary),
            ("Income with sub_category", self.test_income_with_subcategory),
            ("Expense with sub_category", self.test_expense_with_subcategory),
        ]
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                test_results.append((test_name, result))
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
                test_results.append((test_name, False))
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("\n" + "="*60)
        print("📊 PHASE 5 BACKEND TESTING SUMMARY")
        print("="*60)
        
        passed = sum(1 for _, result in test_results if result)
        total = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
        
        print(f"\nOverall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 All Phase 5 backend tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Please check the details above.")
            return False

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)