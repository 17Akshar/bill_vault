#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://account-central-15.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class Phase3Tester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.test_data_ids = {
            "accounts": [],
            "investments": [],
            "income": [],
            "expenses": []
        }
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def authenticate(self):
        """Get authentication token via single-user mode"""
        self.log("🔐 Authenticating via single-user mode...")
        
        try:
            response = requests.post(f"{BASE_URL}/auth/single-user", headers=HEADERS)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.user_id = data["user"]["user_id"]
                self.log(f"✅ Authentication successful. User ID: {self.user_id}")
                return True
            else:
                self.log(f"❌ Authentication failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Authentication error: {str(e)}", "ERROR")
            return False
    
    def get_auth_headers(self):
        """Get headers with authentication token"""
        return {
            **HEADERS,
            "Authorization": f"Bearer {self.token}"
        }
    
    def setup_test_data(self):
        """Setup test data as specified in the review request"""
        self.log("📊 Setting up test data...")
        
        # First, create an account for transactions
        account_data = {
            "name": "Test Account",
            "account_type": "bank",
            "initial_balance": 50000
        }
        
        try:
            response = requests.post(f"{BASE_URL}/accounts", 
                                   headers=self.get_auth_headers(), 
                                   json=account_data)
            if response.status_code == 200:
                account = response.json()
                account_id = account["account_id"]
                self.test_data_ids["accounts"].append(account_id)
                self.log(f"✅ Created test account: {account_id}")
            else:
                self.log(f"❌ Failed to create account: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Account creation error: {str(e)}", "ERROR")
            return False
        
        # Create 2 investments as specified
        investments = [
            {
                "name": "HDFC Flexicap",
                "investment_type": "mutual_fund",
                "invested_amount": 100000,
                "current_value": 125000,
                "purchase_date": "2024-06-01T00:00:00Z"
            },
            {
                "name": "TCS Shares",
                "investment_type": "stocks",
                "invested_amount": 200000,
                "current_value": 180000,
                "purchase_date": "2024-01-01T00:00:00Z"
            }
        ]
        
        for inv_data in investments:
            try:
                response = requests.post(f"{BASE_URL}/investments", 
                                       headers=self.get_auth_headers(), 
                                       json=inv_data)
                if response.status_code == 200:
                    investment = response.json()
                    self.test_data_ids["investments"].append(investment["investment_id"])
                    self.log(f"✅ Created investment: {inv_data['name']}")
                else:
                    self.log(f"❌ Failed to create investment {inv_data['name']}: {response.status_code} - {response.text}", "ERROR")
                    return False
            except Exception as e:
                self.log(f"❌ Investment creation error: {str(e)}", "ERROR")
                return False
        
        # Create income
        income_data = {
            "account_id": account_id,
            "amount": 80000,
            "category": "salary",
            "source": "My Company",
            "date": "2026-04-01T00:00:00Z"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/income", 
                                   headers=self.get_auth_headers(), 
                                   json=income_data)
            if response.status_code == 200:
                income = response.json()
                self.test_data_ids["income"].append(income["income_id"])
                self.log(f"✅ Created income entry")
            else:
                self.log(f"❌ Failed to create income: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Income creation error: {str(e)}", "ERROR")
            return False
        
        # Create 2 expenses
        expenses = [
            {
                "account_id": account_id,
                "amount": 5000,
                "category": "food",
                "description": "Groceries",
                "payment_type": "upi",
                "date": "2026-04-02T00:00:00Z"
            },
            {
                "account_id": account_id,
                "amount": 3000,
                "category": "transport",
                "description": "Fuel",
                "payment_type": "cash",
                "date": "2026-04-03T00:00:00Z"
            }
        ]
        
        for exp_data in expenses:
            try:
                response = requests.post(f"{BASE_URL}/expenses", 
                                       headers=self.get_auth_headers(), 
                                       json=exp_data)
                if response.status_code == 200:
                    expense = response.json()
                    self.test_data_ids["expenses"].append(expense["expense_id"])
                    self.log(f"✅ Created expense: {exp_data['description']}")
                else:
                    self.log(f"❌ Failed to create expense {exp_data['description']}: {response.status_code} - {response.text}", "ERROR")
                    return False
            except Exception as e:
                self.log(f"❌ Expense creation error: {str(e)}", "ERROR")
                return False
        
        self.log("✅ Test data setup completed successfully")
        return True
    
    def test_investment_analytics(self):
        """Test GET /api/analytics/investment"""
        self.log("📈 Testing Investment Analytics endpoint...")
        
        try:
            response = requests.get(f"{BASE_URL}/analytics/investment", 
                                  headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["summary", "allocation", "top_performers", "all_performers"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log(f"❌ Missing required fields: {missing_fields}", "ERROR")
                    return False
                
                # Verify summary structure
                summary = data["summary"]
                summary_fields = ["total_invested", "total_current", "total_returns", "total_returns_pct", "total_investments"]
                missing_summary = [field for field in summary_fields if field not in summary]
                
                if missing_summary:
                    self.log(f"❌ Missing summary fields: {missing_summary}", "ERROR")
                    return False
                
                # Verify allocation has percentages
                allocation = data["allocation"]
                if not isinstance(allocation, list) or len(allocation) == 0:
                    self.log("❌ Allocation should be a non-empty list", "ERROR")
                    return False
                
                for alloc in allocation:
                    if "percentage" not in alloc or "type" not in alloc:
                        self.log("❌ Allocation items missing required fields", "ERROR")
                        return False
                
                # Verify top performers have returns% and CAGR
                top_performers = data["top_performers"]
                if not isinstance(top_performers, list):
                    self.log("❌ Top performers should be a list", "ERROR")
                    return False
                
                for performer in top_performers:
                    if "returns_pct" not in performer or "cagr" not in performer:
                        self.log("❌ Performers missing returns_pct or cagr", "ERROR")
                        return False
                
                self.log(f"✅ Investment Analytics: {summary['total_investments']} investments, Total: ₹{summary['total_current']}, Returns: {summary['total_returns_pct']:.2f}%")
                return True
                
            else:
                self.log(f"❌ Investment analytics failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Investment analytics error: {str(e)}", "ERROR")
            return False
    
    def test_cashflow_analytics(self):
        """Test GET /api/analytics/cashflow?months=6"""
        self.log("💰 Testing Cashflow Analytics endpoint...")
        
        try:
            response = requests.get(f"{BASE_URL}/analytics/cashflow?months=6", 
                                  headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                if "monthly" not in data or "summary" not in data:
                    self.log("❌ Missing required fields: monthly or summary", "ERROR")
                    return False
                
                # Verify monthly array has 6 entries
                monthly = data["monthly"]
                if not isinstance(monthly, list) or len(monthly) != 6:
                    self.log(f"❌ Monthly should be array of 6 entries, got {len(monthly) if isinstance(monthly, list) else 'not array'}", "ERROR")
                    return False
                
                # Verify each monthly entry has required fields
                required_monthly_fields = ["income", "expense", "savings", "savings_rate"]
                for i, month_data in enumerate(monthly):
                    missing = [field for field in required_monthly_fields if field not in month_data]
                    if missing:
                        self.log(f"❌ Month {i} missing fields: {missing}", "ERROR")
                        return False
                
                # Verify summary totals
                summary = data["summary"]
                summary_fields = ["total_income", "total_expense", "total_savings", "avg_savings_rate"]
                missing_summary = [field for field in summary_fields if field not in summary]
                
                if missing_summary:
                    self.log(f"❌ Summary missing fields: {missing_summary}", "ERROR")
                    return False
                
                self.log(f"✅ Cashflow Analytics: 6 months data, Avg Savings Rate: {summary['avg_savings_rate']}%")
                return True
                
            else:
                self.log(f"❌ Cashflow analytics failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Cashflow analytics error: {str(e)}", "ERROR")
            return False
    
    def test_expense_breakdown(self):
        """Test GET /api/analytics/expense-breakdown?month=4&year=2026"""
        self.log("🛒 Testing Expense Breakdown endpoint...")
        
        try:
            response = requests.get(f"{BASE_URL}/analytics/expense-breakdown?month=4&year=2026", 
                                  headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["total", "categories"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log(f"❌ Missing required fields: {missing_fields}", "ERROR")
                    return False
                
                # Verify categories structure
                categories = data["categories"]
                if not isinstance(categories, list):
                    self.log("❌ Categories should be a list", "ERROR")
                    return False
                
                # Should have food and transport categories from our test data
                category_names = [cat.get("category") for cat in categories]
                expected_categories = ["food", "transport"]
                
                for expected in expected_categories:
                    if expected not in category_names:
                        self.log(f"❌ Expected category '{expected}' not found in {category_names}", "ERROR")
                        return False
                
                # Verify each category has amount and percentage
                for cat in categories:
                    if "amount" not in cat or "percentage" not in cat:
                        self.log("❌ Category missing amount or percentage", "ERROR")
                        return False
                
                self.log(f"✅ Expense Breakdown: Total ₹{data['total']}, {len(categories)} categories")
                return True
                
            else:
                self.log(f"❌ Expense breakdown failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Expense breakdown error: {str(e)}", "ERROR")
            return False
    
    def test_income_breakdown(self):
        """Test GET /api/analytics/income-breakdown?month=4&year=2026"""
        self.log("💵 Testing Income Breakdown endpoint...")
        
        try:
            response = requests.get(f"{BASE_URL}/analytics/income-breakdown?month=4&year=2026", 
                                  headers=self.get_auth_headers())
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields
                required_fields = ["total", "categories"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log(f"❌ Missing required fields: {missing_fields}", "ERROR")
                    return False
                
                # Verify categories structure
                categories = data["categories"]
                if not isinstance(categories, list):
                    self.log("❌ Categories should be a list", "ERROR")
                    return False
                
                # Should have salary category from our test data
                category_names = [cat.get("category") for cat in categories]
                if "salary" not in category_names:
                    self.log(f"❌ Expected 'salary' category not found in {category_names}", "ERROR")
                    return False
                
                # Verify each category has amount and percentage
                for cat in categories:
                    if "amount" not in cat or "percentage" not in cat:
                        self.log("❌ Category missing amount or percentage", "ERROR")
                        return False
                
                self.log(f"✅ Income Breakdown: Total ₹{data['total']}, {len(categories)} categories")
                return True
                
            else:
                self.log(f"❌ Income breakdown failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Income breakdown error: {str(e)}", "ERROR")
            return False
    
    def test_transactions_csv_export(self):
        """Test GET /api/export/transactions-csv"""
        self.log("📄 Testing Transactions CSV Export...")
        
        try:
            response = requests.get(f"{BASE_URL}/export/transactions-csv", 
                                  headers=self.get_auth_headers())
            
            if response.status_code == 200:
                content = response.text
                
                # Verify it's CSV content
                if not content.startswith("Date,Type,Category,Description,Amount,Account,Payment Type,Notes"):
                    self.log("❌ CSV doesn't have expected headers", "ERROR")
                    return False
                
                # Verify content has our test data
                lines = content.strip().split('\n')
                if len(lines) < 2:  # Header + at least one data row
                    self.log("❌ CSV should have header + data rows", "ERROR")
                    return False
                
                # Check for our test data
                csv_content = content.lower()
                if "groceries" not in csv_content or "fuel" not in csv_content or "my company" not in csv_content:
                    self.log("❌ CSV missing expected test data", "ERROR")
                    return False
                
                self.log(f"✅ Transactions CSV Export: {len(lines)-1} transactions exported")
                return True
                
            else:
                self.log(f"❌ Transactions CSV export failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Transactions CSV export error: {str(e)}", "ERROR")
            return False
    
    def test_investments_csv_export(self):
        """Test GET /api/export/investments-csv"""
        self.log("📊 Testing Investments CSV Export...")
        
        try:
            response = requests.get(f"{BASE_URL}/export/investments-csv", 
                                  headers=self.get_auth_headers())
            
            if response.status_code == 200:
                content = response.text
                
                # Verify it's CSV content with expected headers
                expected_headers = "Name,Type,Invested Amount,Current Value,Returns,Returns %,Purchase Date,Maturity Date,Notes"
                if not content.startswith(expected_headers):
                    self.log("❌ CSV doesn't have expected headers", "ERROR")
                    return False
                
                # Verify content has our test data
                lines = content.strip().split('\n')
                if len(lines) < 3:  # Header + 2 investment rows
                    self.log(f"❌ CSV should have header + 2 investment rows, got {len(lines)} lines", "ERROR")
                    return False
                
                # Check for our test investments
                csv_content = content.lower()
                if "hdfc flexicap" not in csv_content or "tcs shares" not in csv_content:
                    self.log("❌ CSV missing expected investment data", "ERROR")
                    return False
                
                self.log(f"✅ Investments CSV Export: {len(lines)-1} investments exported")
                return True
                
            else:
                self.log(f"❌ Investments CSV export failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Investments CSV export error: {str(e)}", "ERROR")
            return False
    
    def test_networth_csv_export(self):
        """Test GET /api/export/networth-csv"""
        self.log("💎 Testing Net Worth CSV Export...")
        
        try:
            response = requests.get(f"{BASE_URL}/export/networth-csv", 
                                  headers=self.get_auth_headers())
            
            if response.status_code == 200:
                content = response.text
                
                # Verify it's CSV content with expected headers
                expected_headers = "Category,Item,Type,Amount"
                if not content.startswith(expected_headers):
                    self.log("❌ CSV doesn't have expected headers", "ERROR")
                    return False
                
                # Verify content has assets and liabilities
                lines = content.strip().split('\n')
                if len(lines) < 2:  # Header + at least one data row
                    self.log("❌ CSV should have header + data rows", "ERROR")
                    return False
                
                # Check for asset/liability categories
                csv_content = content.lower()
                if "asset" not in csv_content:
                    self.log("❌ CSV should contain asset entries", "ERROR")
                    return False
                
                self.log(f"✅ Net Worth CSV Export: {len(lines)-1} items exported")
                return True
                
            else:
                self.log(f"❌ Net Worth CSV export failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Net Worth CSV export error: {str(e)}", "ERROR")
            return False
    
    def cleanup_test_data(self):
        """Clean up test data after testing"""
        self.log("🧹 Cleaning up test data...")
        
        cleanup_success = True
        
        # Delete expenses
        for expense_id in self.test_data_ids["expenses"]:
            try:
                response = requests.delete(f"{BASE_URL}/expenses/{expense_id}", 
                                         headers=self.get_auth_headers())
                if response.status_code == 200:
                    self.log(f"✅ Deleted expense: {expense_id}")
                else:
                    self.log(f"⚠️ Failed to delete expense {expense_id}: {response.status_code}", "WARN")
                    cleanup_success = False
            except Exception as e:
                self.log(f"⚠️ Error deleting expense {expense_id}: {str(e)}", "WARN")
                cleanup_success = False
        
        # Delete income
        for income_id in self.test_data_ids["income"]:
            try:
                response = requests.delete(f"{BASE_URL}/income/{income_id}", 
                                         headers=self.get_auth_headers())
                if response.status_code == 200:
                    self.log(f"✅ Deleted income: {income_id}")
                else:
                    self.log(f"⚠️ Failed to delete income {income_id}: {response.status_code}", "WARN")
                    cleanup_success = False
            except Exception as e:
                self.log(f"⚠️ Error deleting income {income_id}: {str(e)}", "WARN")
                cleanup_success = False
        
        # Delete investments
        for investment_id in self.test_data_ids["investments"]:
            try:
                response = requests.delete(f"{BASE_URL}/investments/{investment_id}", 
                                         headers=self.get_auth_headers())
                if response.status_code == 200:
                    self.log(f"✅ Deleted investment: {investment_id}")
                else:
                    self.log(f"⚠️ Failed to delete investment {investment_id}: {response.status_code}", "WARN")
                    cleanup_success = False
            except Exception as e:
                self.log(f"⚠️ Error deleting investment {investment_id}: {str(e)}", "WARN")
                cleanup_success = False
        
        # Delete accounts
        for account_id in self.test_data_ids["accounts"]:
            try:
                response = requests.delete(f"{BASE_URL}/accounts/{account_id}", 
                                         headers=self.get_auth_headers())
                if response.status_code == 200:
                    self.log(f"✅ Deleted account: {account_id}")
                else:
                    self.log(f"⚠️ Failed to delete account {account_id}: {response.status_code}", "WARN")
                    cleanup_success = False
            except Exception as e:
                self.log(f"⚠️ Error deleting account {account_id}: {str(e)}", "WARN")
                cleanup_success = False
        
        if cleanup_success:
            self.log("✅ Test data cleanup completed successfully")
        else:
            self.log("⚠️ Test data cleanup completed with some warnings", "WARN")
        
        return cleanup_success
    
    def run_all_tests(self):
        """Run all Phase 3 tests"""
        self.log("🚀 Starting Phase 3 Analytics and Export Testing...")
        
        # Step 1: Authentication
        if not self.authenticate():
            return False
        
        # Step 2: Setup test data
        if not self.setup_test_data():
            return False
        
        # Step 3: Test Analytics endpoints
        analytics_tests = [
            ("Investment Analytics", self.test_investment_analytics),
            ("Cashflow Analytics", self.test_cashflow_analytics),
            ("Expense Breakdown", self.test_expense_breakdown),
            ("Income Breakdown", self.test_income_breakdown)
        ]
        
        analytics_passed = 0
        for test_name, test_func in analytics_tests:
            if test_func():
                analytics_passed += 1
            else:
                self.log(f"❌ {test_name} test failed", "ERROR")
        
        # Step 4: Test CSV Export endpoints
        export_tests = [
            ("Transactions CSV Export", self.test_transactions_csv_export),
            ("Investments CSV Export", self.test_investments_csv_export),
            ("Net Worth CSV Export", self.test_networth_csv_export)
        ]
        
        export_passed = 0
        for test_name, test_func in export_tests:
            if test_func():
                export_passed += 1
            else:
                self.log(f"❌ {test_name} test failed", "ERROR")
        
        # Step 5: Cleanup
        self.cleanup_test_data()
        
        # Summary
        total_tests = len(analytics_tests) + len(export_tests)
        total_passed = analytics_passed + export_passed
        
        self.log("=" * 60)
        self.log("📊 PHASE 3 TEST SUMMARY")
        self.log("=" * 60)
        self.log(f"Analytics Tests: {analytics_passed}/{len(analytics_tests)} passed")
        self.log(f"Export Tests: {export_passed}/{len(export_tests)} passed")
        self.log(f"Total Tests: {total_passed}/{total_tests} passed")
        
        if total_passed == total_tests:
            self.log("🎉 ALL PHASE 3 TESTS PASSED!", "SUCCESS")
            return True
        else:
            self.log(f"❌ {total_tests - total_passed} tests failed", "ERROR")
            return False

def main():
    """Main function to run Phase 3 tests"""
    tester = Phase3Tester()
    success = tester.run_all_tests()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()