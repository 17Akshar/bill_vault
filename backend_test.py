#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Bill Tracker Application
Tests all authentication, bill management, payment, category, budget, analytics, settings, and export endpoints
"""

import requests
import json
import sys
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://bill-tracker-mobile.preview.emergentagent.com/api"

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123456"

class BillTrackerAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.access_token = None
        self.user_id = None
        self.test_bill_id = None
        self.test_category_id = None
        self.test_budget_id = None
        self.test_payment_id = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    auth_required: bool = True, params: Optional[Dict] = None) -> requests.Response:
        """Make HTTP request with optional authentication"""
        url = f"{self.base_url}{endpoint}"
        headers = {}
        
        if auth_required and self.access_token:
            headers['Authorization'] = f"Bearer {self.access_token}"
            
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == 'POST':
                response = self.session.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == 'PUT':
                response = self.session.put(url, headers=headers, json=data, timeout=30)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            self.log(f"{method} {endpoint} -> {response.status_code}")
            return response
            
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {e}", "ERROR")
            raise
            
    def test_auth_register(self) -> bool:
        """Test user registration"""
        self.log("Testing user registration...")
        
        data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Test User"
        }
        
        response = self.make_request('POST', '/auth/register', data, auth_required=False)
        
        if response.status_code == 200:
            result = response.json()
            self.access_token = result.get('access_token')
            self.user_id = result.get('user', {}).get('user_id')
            self.log(f"Registration successful. User ID: {self.user_id}")
            return True
        elif response.status_code == 400 and "already registered" in response.text:
            self.log("User already exists, proceeding to login...")
            return self.test_auth_login()
        else:
            self.log(f"Registration failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_auth_login(self) -> bool:
        """Test user login"""
        self.log("Testing user login...")
        
        data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = self.make_request('POST', '/auth/login', data, auth_required=False)
        
        if response.status_code == 200:
            result = response.json()
            self.access_token = result.get('access_token')
            self.user_id = result.get('user', {}).get('user_id')
            self.log(f"Login successful. User ID: {self.user_id}")
            return True
        else:
            self.log(f"Login failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_auth_single_user(self) -> bool:
        """Test single user mode"""
        self.log("Testing single user mode...")
        
        response = self.make_request('POST', '/auth/single-user', auth_required=False)
        
        if response.status_code == 200:
            result = response.json()
            single_user_token = result.get('access_token')
            single_user_id = result.get('user', {}).get('user_id')
            self.log(f"Single user mode successful. User ID: {single_user_id}")
            return True
        else:
            self.log(f"Single user mode failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_auth_me(self) -> bool:
        """Test get current user"""
        self.log("Testing get current user...")
        
        response = self.make_request('GET', '/auth/me')
        
        if response.status_code == 200:
            user = response.json()
            self.log(f"Get user successful. Email: {user.get('email')}")
            return True
        else:
            self.log(f"Get user failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_create_bill(self) -> bool:
        """Test creating a bill"""
        self.log("Testing bill creation...")
        
        due_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        data = {
            "name": "Electric Bill",
            "amount": 125.50,
            "due_date": due_date,
            "category": "Utilities",
            "vendor": "Electric Company",
            "notes": "Monthly electric bill",
            "is_recurring": True,
            "recurrence_type": "monthly",
            "recurrence_interval": 1
        }
        
        response = self.make_request('POST', '/bills', data)
        
        if response.status_code == 200:
            bill = response.json()
            self.test_bill_id = bill.get('bill_id')
            self.log(f"Bill created successfully. Bill ID: {self.test_bill_id}")
            return True
        else:
            self.log(f"Bill creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_get_bills(self) -> bool:
        """Test getting bills with various filters"""
        self.log("Testing get bills...")
        
        # Test get all bills
        response = self.make_request('GET', '/bills')
        if response.status_code != 200:
            self.log(f"Get all bills failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        bills = response.json()
        self.log(f"Retrieved {len(bills)} bills")
        
        # Test filter by month/year
        current_date = datetime.now(timezone.utc)
        params = {"month": current_date.month, "year": current_date.year}
        response = self.make_request('GET', '/bills', params=params)
        if response.status_code != 200:
            self.log(f"Get bills by month/year failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        # Test filter by status
        params = {"status": "unpaid"}
        response = self.make_request('GET', '/bills', params=params)
        if response.status_code != 200:
            self.log(f"Get bills by status failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
        self.log("Get bills with filters successful")
        return True
        
    def test_update_bill(self) -> bool:
        """Test updating a bill"""
        if not self.test_bill_id:
            self.log("No test bill ID available for update", "ERROR")
            return False
            
        self.log("Testing bill update...")
        
        data = {
            "payment_status": "paid",
            "notes": "Updated notes - bill paid"
        }
        
        response = self.make_request('PUT', f'/bills/{self.test_bill_id}', data)
        
        if response.status_code == 200:
            bill = response.json()
            self.log(f"Bill updated successfully. Status: {bill.get('payment_status')}")
            return True
        else:
            self.log(f"Bill update failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_create_payment(self) -> bool:
        """Test creating a payment"""
        if not self.test_bill_id:
            self.log("No test bill ID available for payment", "ERROR")
            return False
            
        self.log("Testing payment creation...")
        
        payment_date = datetime.now(timezone.utc).isoformat()
        data = {
            "bill_id": self.test_bill_id,
            "amount": 125.50,
            "payment_date": payment_date,
            "payment_method": "Credit Card",
            "confirmation_number": "CC123456789",
            "notes": "Paid online"
        }
        
        response = self.make_request('POST', '/payments', data)
        
        if response.status_code == 200:
            payment = response.json()
            self.test_payment_id = payment.get('payment_id')
            self.log(f"Payment created successfully. Payment ID: {self.test_payment_id}")
            return True
        else:
            self.log(f"Payment creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_get_payments(self) -> bool:
        """Test getting payment history"""
        self.log("Testing get payments...")
        
        response = self.make_request('GET', '/payments')
        
        if response.status_code == 200:
            payments = response.json()
            self.log(f"Retrieved {len(payments)} payments")
            return True
        else:
            self.log(f"Get payments failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_create_category(self) -> bool:
        """Test creating a category"""
        self.log("Testing category creation...")
        
        data = {
            "name": "Entertainment",
            "color": "#FF5722",
            "icon": "movie"
        }
        
        response = self.make_request('POST', '/categories', data)
        
        if response.status_code == 200:
            category = response.json()
            self.test_category_id = category.get('category_id')
            self.log(f"Category created successfully. Category ID: {self.test_category_id}")
            return True
        else:
            self.log(f"Category creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_get_categories(self) -> bool:
        """Test getting categories"""
        self.log("Testing get categories...")
        
        response = self.make_request('GET', '/categories')
        
        if response.status_code == 200:
            categories = response.json()
            self.log(f"Retrieved {len(categories)} categories")
            return True
        else:
            self.log(f"Get categories failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_create_budget(self) -> bool:
        """Test creating a budget"""
        self.log("Testing budget creation...")
        
        data = {
            "category": "Utilities",
            "monthly_limit": 200.00
        }
        
        response = self.make_request('POST', '/budgets', data)
        
        if response.status_code == 200:
            budget = response.json()
            self.test_budget_id = budget.get('budget_id')
            self.log(f"Budget created successfully. Budget ID: {self.test_budget_id}")
            return True
        else:
            self.log(f"Budget creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_get_budgets(self) -> bool:
        """Test getting budgets"""
        self.log("Testing get budgets...")
        
        response = self.make_request('GET', '/budgets')
        
        if response.status_code == 200:
            budgets = response.json()
            self.log(f"Retrieved {len(budgets)} budgets")
            return True
        else:
            self.log(f"Get budgets failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_analytics(self) -> bool:
        """Test analytics endpoint"""
        self.log("Testing analytics...")
        
        current_date = datetime.now(timezone.utc)
        params = {"month": current_date.month, "year": current_date.year}
        response = self.make_request('GET', '/analytics/spending', params=params)
        
        if response.status_code == 200:
            analytics = response.json()
            self.log(f"Analytics retrieved. Total amount: ${analytics.get('total_amount', 0)}")
            return True
        else:
            self.log(f"Analytics failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_get_settings(self) -> bool:
        """Test getting user settings"""
        self.log("Testing get settings...")
        
        response = self.make_request('GET', '/settings')
        
        if response.status_code == 200:
            settings = response.json()
            self.log(f"Settings retrieved. Dark mode: {settings.get('dark_mode')}")
            return True
        else:
            self.log(f"Get settings failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_update_settings(self) -> bool:
        """Test updating user settings"""
        self.log("Testing update settings...")
        
        data = {
            "dark_mode": True,
            "notifications_enabled": False,
            "notification_days_before": 5
        }
        
        response = self.make_request('PUT', '/settings', data)
        
        if response.status_code == 200:
            settings = response.json()
            self.log(f"Settings updated. Dark mode: {settings.get('dark_mode')}")
            return True
        else:
            self.log(f"Update settings failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_export_data(self) -> bool:
        """Test data export"""
        self.log("Testing data export...")
        
        response = self.make_request('GET', '/export')
        
        if response.status_code == 200:
            export_data = response.json()
            self.log(f"Data exported. Bills: {len(export_data.get('bills', []))}, Payments: {len(export_data.get('payments', []))}")
            return True
        else:
            self.log(f"Data export failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_delete_bill(self) -> bool:
        """Test deleting a bill"""
        if not self.test_bill_id:
            self.log("No test bill ID available for deletion", "ERROR")
            return False
            
        self.log("Testing bill deletion...")
        
        response = self.make_request('DELETE', f'/bills/{self.test_bill_id}')
        
        if response.status_code == 200:
            self.log("Bill deleted successfully")
            return True
        else:
            self.log(f"Bill deletion failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all tests in order"""
        results = {}
        
        self.log("=== Starting Bill Tracker Backend API Tests ===")
        self.log(f"Backend URL: {self.base_url}")
        
        # Authentication tests (high priority)
        results['auth_register'] = self.test_auth_register()
        results['auth_login'] = self.test_auth_login() if not results['auth_register'] else True
        results['auth_single_user'] = self.test_auth_single_user()
        results['auth_me'] = self.test_auth_me()
        
        # Bill CRUD operations (high priority)
        results['create_bill'] = self.test_create_bill()
        results['get_bills'] = self.test_get_bills()
        results['update_bill'] = self.test_update_bill()
        
        # Payment tracking (high priority)
        results['create_payment'] = self.test_create_payment()
        results['get_payments'] = self.test_get_payments()
        
        # Analytics (high priority)
        results['analytics'] = self.test_analytics()
        
        # Categories (medium priority)
        results['create_category'] = self.test_create_category()
        results['get_categories'] = self.test_get_categories()
        
        # Budgets (medium priority)
        results['create_budget'] = self.test_create_budget()
        results['get_budgets'] = self.test_get_budgets()
        
        # Settings (medium priority)
        results['get_settings'] = self.test_get_settings()
        results['update_settings'] = self.test_update_settings()
        
        # Export (low priority)
        results['export_data'] = self.test_export_data()
        
        # Cleanup
        results['delete_bill'] = self.test_delete_bill()
        
        return results
        
    def print_summary(self, results: Dict[str, bool]):
        """Print test summary"""
        self.log("\n=== Test Summary ===")
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        self.log(f"Total Tests: {total}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {total - passed}")
        self.log(f"Success Rate: {(passed/total)*100:.1f}%")
        
        self.log("\n=== Detailed Results ===")
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
            
        if passed == total:
            self.log("\n🎉 All tests passed!")
        else:
            self.log(f"\n⚠️  {total - passed} test(s) failed")
            
        return passed == total

def main():
    """Main test runner"""
    tester = BillTrackerAPITester()
    
    try:
        results = tester.run_all_tests()
        all_passed = tester.print_summary(results)
        
        # Exit with appropriate code
        sys.exit(0 if all_passed else 1)
        
    except Exception as e:
        tester.log(f"Test execution failed: {e}", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    main()