#!/usr/bin/env python3
"""
Backend API Testing for Personal Financial Management System - Phase 2
Tests all Phase 2 backend endpoints: Credit Cards, Loans, Lending, Investments, Net Worth
"""

import requests
import json
import sys
from datetime import datetime, timezone
import time

# Backend URL from frontend .env
BASE_URL = "https://bill-tracker-mobile.preview.emergentagent.com/api"

class Phase2APITester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.credit_cards = []
        self.loans = []
        self.lending_records = []
        self.investments = []
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
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Single-user authentication", False, error_msg)
            return False
    
    def test_credit_cards_crud(self):
        """Test Credit Cards CRUD operations"""
        print("\n=== TESTING CREDIT CARDS CRUD ===")
        
        # CREATE Credit Card
        card_data = {
            "name": "HDFC Regalia",
            "card_number_last4": "4567",
            "credit_limit": 200000,
            "current_outstanding": 15000,
            "billing_date": 1,
            "due_date": 20,
            "interest_rate": 42
        }
        
        response = self.make_request("POST", "/credit-cards", card_data)
        if response and response.status_code == 200:
            card = response.json()
            self.credit_cards.append(card)
            self.log_test("Create credit card", True, f"ID: {card.get('card_id')}, Name: {card.get('name')}, Limit: {card.get('credit_limit')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Create credit card", False, error_msg)
            
        # GET all Credit Cards
        response = self.make_request("GET", "/credit-cards")
        if response and response.status_code == 200:
            cards = response.json()
            if len(cards) >= len(self.credit_cards):
                self.log_test("Get all credit cards", True, f"Found {len(cards)} credit cards")
            else:
                self.log_test("Get all credit cards", False, f"Expected {len(self.credit_cards)}, got {len(cards)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get all credit cards", False, error_msg)
            
        # UPDATE Credit Card
        if self.credit_cards:
            card_id = self.credit_cards[0]["card_id"]
            update_data = {"current_outstanding": 20000}
            
            response = self.make_request("PUT", f"/credit-cards/{card_id}", update_data)
            if response and response.status_code == 200:
                updated_card = response.json()
                self.log_test("Update credit card outstanding", True, f"Outstanding updated to: {updated_card.get('current_outstanding')}")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Update credit card outstanding", False, error_msg)
                
        # DELETE Credit Card
        if self.credit_cards:
            card_id = self.credit_cards[0]["card_id"]
            response = self.make_request("DELETE", f"/credit-cards/{card_id}")
            if response and response.status_code == 200:
                self.log_test("Delete credit card", True, "Credit card deactivated successfully")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Delete credit card", False, error_msg)
    
    def test_loans_crud(self):
        """Test Loans CRUD operations"""
        print("\n=== TESTING LOANS CRUD ===")
        
        # CREATE Loan
        loan_data = {
            "name": "SBI Home Loan",
            "loan_type": "home",
            "principal_amount": 5000000,
            "outstanding_amount": 4500000,
            "interest_rate": 8.5,
            "emi_amount": 45000,
            "tenure_months": 240,
            "start_date": "2024-01-15T00:00:00Z"
        }
        
        response = self.make_request("POST", "/loans", loan_data)
        if response and response.status_code == 200:
            loan = response.json()
            self.loans.append(loan)
            self.log_test("Create loan", True, f"ID: {loan.get('loan_id')}, Name: {loan.get('name')}, Outstanding: {loan.get('outstanding_amount')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Create loan", False, error_msg)
            
        # GET all Loans
        response = self.make_request("GET", "/loans")
        if response and response.status_code == 200:
            loans = response.json()
            if len(loans) >= len(self.loans):
                self.log_test("Get all loans", True, f"Found {len(loans)} loans")
            else:
                self.log_test("Get all loans", False, f"Expected {len(self.loans)}, got {len(loans)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get all loans", False, error_msg)
            
        # UPDATE Loan
        if self.loans:
            loan_id = self.loans[0]["loan_id"]
            update_data = {"outstanding_amount": 4400000}
            
            response = self.make_request("PUT", f"/loans/{loan_id}", update_data)
            if response and response.status_code == 200:
                updated_loan = response.json()
                self.log_test("Update loan outstanding", True, f"Outstanding updated to: {updated_loan.get('outstanding_amount')}")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Update loan outstanding", False, error_msg)
                
        # DELETE Loan
        if self.loans:
            loan_id = self.loans[0]["loan_id"]
            response = self.make_request("DELETE", f"/loans/{loan_id}")
            if response and response.status_code == 200:
                self.log_test("Delete loan", True, "Loan deactivated successfully")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Delete loan", False, error_msg)
    
    def test_lending_crud(self):
        """Test Lending (Lent/Borrowed) CRUD operations"""
        print("\n=== TESTING LENDING CRUD ===")
        
        # CREATE Lending Record 1 - Lent
        lent_data = {
            "lending_type": "lent",
            "person_name": "Rahul",
            "amount": 50000,
            "date": "2025-03-01T00:00:00Z",
            "notes": "For car repair"
        }
        
        response = self.make_request("POST", "/lending", lent_data)
        if response and response.status_code == 200:
            lending = response.json()
            self.lending_records.append(lending)
            self.log_test("Create lending record (lent)", True, f"ID: {lending.get('lending_id')}, Person: {lending.get('person_name')}, Amount: {lending.get('amount')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Create lending record (lent)", False, error_msg)
            
        # CREATE Lending Record 2 - Borrowed
        borrowed_data = {
            "lending_type": "borrowed",
            "person_name": "Priya",
            "amount": 20000,
            "date": "2025-02-15T00:00:00Z"
        }
        
        response = self.make_request("POST", "/lending", borrowed_data)
        if response and response.status_code == 200:
            lending = response.json()
            self.lending_records.append(lending)
            self.log_test("Create lending record (borrowed)", True, f"ID: {lending.get('lending_id')}, Person: {lending.get('person_name')}, Amount: {lending.get('amount')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Create lending record (borrowed)", False, error_msg)
            
        # GET all Lending Records (no filters)
        response = self.make_request("GET", "/lending")
        if response and response.status_code == 200:
            records = response.json()
            if len(records) >= len(self.lending_records):
                self.log_test("Get all lending records", True, f"Found {len(records)} lending records")
            else:
                self.log_test("Get all lending records", False, f"Expected {len(self.lending_records)}, got {len(records)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get all lending records", False, error_msg)
            
        # GET Lending Records filtered by lending_type=lent
        response = self.make_request("GET", "/lending", params={"lending_type": "lent"})
        if response and response.status_code == 200:
            lent_records = response.json()
            expected_lent = len([r for r in self.lending_records if r.get("lending_type") == "lent"])
            if len(lent_records) >= expected_lent:
                self.log_test("Filter lending by type (lent)", True, f"Found {len(lent_records)} lent records")
            else:
                self.log_test("Filter lending by type (lent)", False, f"Expected {expected_lent}, got {len(lent_records)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Filter lending by type (lent)", False, error_msg)
            
        # GET Lending Records filtered by is_settled=false
        response = self.make_request("GET", "/lending", params={"is_settled": "false"})
        if response and response.status_code == 200:
            unsettled_records = response.json()
            expected_unsettled = len([r for r in self.lending_records if not r.get("is_settled", False)])
            if len(unsettled_records) >= expected_unsettled:
                self.log_test("Filter lending by settlement status", True, f"Found {len(unsettled_records)} unsettled records")
            else:
                self.log_test("Filter lending by settlement status", False, f"Expected {expected_unsettled}, got {len(unsettled_records)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Filter lending by settlement status", False, error_msg)
            
        # UPDATE Lending Record - Settle
        if self.lending_records:
            lending_id = self.lending_records[0]["lending_id"]
            update_data = {
                "is_settled": True,
                "remaining_amount": 0
            }
            
            response = self.make_request("PUT", f"/lending/{lending_id}", update_data)
            if response and response.status_code == 200:
                updated_lending = response.json()
                self.log_test("Settle lending record", True, f"Record settled: {updated_lending.get('is_settled')}")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Settle lending record", False, error_msg)
                
        # DELETE Lending Record
        if len(self.lending_records) > 1:
            lending_id = self.lending_records[1]["lending_id"]
            response = self.make_request("DELETE", f"/lending/{lending_id}")
            if response and response.status_code == 200:
                self.log_test("Delete lending record", True, "Lending record deleted successfully")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Delete lending record", False, error_msg)
    
    def test_investments_crud(self):
        """Test Investments CRUD operations"""
        print("\n=== TESTING INVESTMENTS CRUD ===")
        
        # CREATE Investment 1 - Mutual Fund
        mf_data = {
            "name": "HDFC Flexicap",
            "investment_type": "mutual_fund",
            "invested_amount": 100000,
            "current_value": 125000,
            "purchase_date": "2024-06-01T00:00:00Z",
            "notes": "SIP"
        }
        
        response = self.make_request("POST", "/investments", mf_data)
        if response and response.status_code == 200:
            investment = response.json()
            self.investments.append(investment)
            self.log_test("Create investment (mutual fund)", True, f"ID: {investment.get('investment_id')}, Name: {investment.get('name')}, Value: {investment.get('current_value')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Create investment (mutual fund)", False, error_msg)
            
        # CREATE Investment 2 - Stocks
        stock_data = {
            "name": "TCS Shares",
            "investment_type": "stocks",
            "invested_amount": 200000,
            "current_value": 220000,
            "purchase_date": "2024-03-01T00:00:00Z"
        }
        
        response = self.make_request("POST", "/investments", stock_data)
        if response and response.status_code == 200:
            investment = response.json()
            self.investments.append(investment)
            self.log_test("Create investment (stocks)", True, f"ID: {investment.get('investment_id')}, Name: {investment.get('name')}, Value: {investment.get('current_value')}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Create investment (stocks)", False, error_msg)
            
        # GET all Investments
        response = self.make_request("GET", "/investments")
        if response and response.status_code == 200:
            investments = response.json()
            if len(investments) >= len(self.investments):
                self.log_test("Get all investments", True, f"Found {len(investments)} investments")
            else:
                self.log_test("Get all investments", False, f"Expected {len(self.investments)}, got {len(investments)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get all investments", False, error_msg)
            
        # GET Investments filtered by investment_type=stocks
        response = self.make_request("GET", "/investments", params={"investment_type": "stocks"})
        if response and response.status_code == 200:
            stock_investments = response.json()
            expected_stocks = len([i for i in self.investments if i.get("investment_type") == "stocks"])
            if len(stock_investments) >= expected_stocks:
                self.log_test("Filter investments by type (stocks)", True, f"Found {len(stock_investments)} stock investments")
            else:
                self.log_test("Filter investments by type (stocks)", False, f"Expected {expected_stocks}, got {len(stock_investments)}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Filter investments by type (stocks)", False, error_msg)
            
        # UPDATE Investment
        if self.investments:
            investment_id = self.investments[0]["investment_id"]
            update_data = {"current_value": 135000}
            
            response = self.make_request("PUT", f"/investments/{investment_id}", update_data)
            if response and response.status_code == 200:
                updated_investment = response.json()
                self.log_test("Update investment value", True, f"Value updated to: {updated_investment.get('current_value')}")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Update investment value", False, error_msg)
                
        # DELETE Investment
        if len(self.investments) > 1:
            investment_id = self.investments[1]["investment_id"]
            response = self.make_request("DELETE", f"/investments/{investment_id}")
            if response and response.status_code == 200:
                self.log_test("Delete investment", True, "Investment removed successfully")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Delete investment", False, error_msg)
    
    def test_net_worth(self):
        """Test Net Worth calculation endpoint"""
        print("\n=== TESTING NET WORTH ===")
        
        response = self.make_request("GET", "/net-worth")
        if response and response.status_code == 200:
            net_worth_data = response.json()
            
            # Check required top-level fields
            required_fields = ["net_worth", "total_assets", "total_liabilities"]
            missing_fields = [field for field in required_fields if field not in net_worth_data]
            
            if not missing_fields:
                self.log_test("Net worth structure - main fields", True, "All main fields present")
            else:
                self.log_test("Net worth structure - main fields", False, f"Missing fields: {missing_fields}")
                
            # Check formatted fields
            formatted_fields = ["net_worth_formatted", "total_assets_formatted", "total_liabilities_formatted"]
            missing_formatted = [field for field in formatted_fields if field not in net_worth_data]
            
            if not missing_formatted:
                self.log_test("Net worth formatted fields", True, "All formatted fields present")
            else:
                self.log_test("Net worth formatted fields", False, f"Missing formatted fields: {missing_formatted}")
                
            # Check assets breakdown
            assets = net_worth_data.get("assets", {})
            required_asset_sections = ["accounts", "investments", "money_lent"]
            missing_asset_sections = [section for section in required_asset_sections if section not in assets]
            
            if not missing_asset_sections:
                self.log_test("Net worth assets breakdown", True, "All asset sections present")
            else:
                self.log_test("Net worth assets breakdown", False, f"Missing asset sections: {missing_asset_sections}")
                
            # Check liabilities breakdown
            liabilities = net_worth_data.get("liabilities", {})
            required_liability_sections = ["credit_cards", "loans", "money_borrowed"]
            missing_liability_sections = [section for section in required_liability_sections if section not in liabilities]
            
            if not missing_liability_sections:
                self.log_test("Net worth liabilities breakdown", True, "All liability sections present")
            else:
                self.log_test("Net worth liabilities breakdown", False, f"Missing liability sections: {missing_liability_sections}")
                
            # Check that each section has total, formatted, and items
            all_sections_valid = True
            section_details = []
            
            for section_name, section_data in {**assets, **liabilities}.items():
                if isinstance(section_data, dict):
                    has_total = "total" in section_data
                    has_formatted = "formatted" in section_data
                    has_items = "items" in section_data and isinstance(section_data["items"], list)
                    
                    if has_total and has_formatted and has_items:
                        section_details.append(f"{section_name}: {len(section_data['items'])} items")
                    else:
                        all_sections_valid = False
                        missing = []
                        if not has_total: missing.append("total")
                        if not has_formatted: missing.append("formatted")
                        if not has_items: missing.append("items")
                        section_details.append(f"{section_name}: missing {missing}")
                        
            if all_sections_valid:
                self.log_test("Net worth section structure", True, f"All sections valid: {', '.join(section_details)}")
            else:
                self.log_test("Net worth section structure", False, f"Issues found: {', '.join(section_details)}")
                
            # Log the actual values for verification
            net_worth = net_worth_data.get("net_worth", 0)
            total_assets = net_worth_data.get("total_assets", 0)
            total_liabilities = net_worth_data.get("total_liabilities", 0)
            
            self.log_test("Net worth calculation", True, f"Net Worth: {net_worth}, Assets: {total_assets}, Liabilities: {total_liabilities}")
            
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                error_msg += f", Body: {response.text}"
            self.log_test("Net worth endpoint", False, error_msg)
    
    def run_all_tests(self):
        """Run all Phase 2 tests in the specified order"""
        print("🚀 Starting Personal Financial Management System - Phase 2 Backend API Tests")
        print(f"Testing against: {BASE_URL}")
        print("=" * 80)
        
        # Test authentication first
        if not self.test_authentication():
            print("\n❌ Authentication failed - stopping tests")
            return False
            
        # Test all Phase 2 modules
        self.test_credit_cards_crud()
        self.test_loans_crud()
        self.test_lending_crud()
        self.test_investments_crud()
        self.test_net_worth()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 PHASE 2 TEST SUMMARY")
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
    tester = Phase2APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)