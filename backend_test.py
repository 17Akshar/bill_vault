#!/usr/bin/env python3
"""
Phase 5 Backend API Testing Script
Tests: Rental Income CRUD, Investment Headings CRUD, Credit Card Report, Bills Summary
"""

import requests
import json
import sys
from datetime import datetime, timezone

# Backend URL from frontend/.env
BASE_URL = "https://bill-tracker-mobile.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.test_data = {
            "rental_ids": [],
            "heading_ids": [],
            "account_ids": [],
            "bill_ids": []
        }

    def authenticate(self):
        """Get authentication token using single-user mode"""
        print("🔐 Testing Authentication...")
        
        try:
            response = requests.post(f"{BASE_URL}/auth/single-user")
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_id = data.get("user", {}).get("user_id")
                print(f"✅ Authentication successful. User ID: {self.user_id}")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False

    def get_headers(self):
        """Get headers with authentication token"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def test_rental_income_crud(self):
        """Test Rental Income CRUD operations"""
        print("\n🏠 Testing Rental Income CRUD...")
        
        # 1. CREATE Rental
        print("1️⃣ Testing POST /api/rentals (Create Rental)")
        rental_data = {
            "property_name": "Flat 302",
            "tenant_name": "Rahul",
            "rent_amount": 15000,
            "due_day": 5,
            "address": "Green Towers"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/rentals", 
                                   json=rental_data, 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                rental = response.json()
                rental_id = rental.get("rental_id")
                self.test_data["rental_ids"].append(rental_id)
                print(f"✅ Rental created successfully. ID: {rental_id}")
                print(f"   Property: {rental['property_name']}, Tenant: {rental['tenant_name']}, Rent: ₹{rental['rent_amount']}")
            else:
                print(f"❌ Create rental failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Create rental error: {str(e)}")
            return False

        # 2. GET Rentals (List all)
        print("2️⃣ Testing GET /api/rentals (List Rentals)")
        try:
            response = requests.get(f"{BASE_URL}/rentals", headers=self.get_headers())
            
            if response.status_code == 200:
                rentals = response.json()
                print(f"✅ Retrieved {len(rentals)} rentals")
                if rentals:
                    rental = rentals[0]
                    print(f"   First rental: {rental['property_name']} - ₹{rental['rent_amount']}")
                    print(f"   Current month paid: {rental.get('current_month_paid', False)}")
                    print(f"   Total collected: ₹{rental.get('total_collected', 0)}")
            else:
                print(f"❌ Get rentals failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get rentals error: {str(e)}")
            return False

        # 3. Record Payment
        if self.test_data["rental_ids"]:
            rental_id = self.test_data["rental_ids"][0]
            print(f"3️⃣ Testing POST /api/rentals/{rental_id}/payments (Record Payment)")
            
            payment_data = {
                "rental_id": rental_id,
                "amount": 15000,
                "payment_date": "2026-04-09T00:00:00Z"
            }
            
            try:
                response = requests.post(f"{BASE_URL}/rentals/{rental_id}/payments", 
                                       json=payment_data, 
                                       headers=self.get_headers())
                
                if response.status_code == 200:
                    payment = response.json()
                    print(f"✅ Payment recorded successfully. ID: {payment.get('payment_id')}")
                    print(f"   Amount: ₹{payment['amount']}, Date: {payment['payment_date']}")
                else:
                    print(f"❌ Record payment failed: {response.status_code} - {response.text}")
                    return False
                    
            except Exception as e:
                print(f"❌ Record payment error: {str(e)}")
                return False

        # 4. UPDATE Rental
        if self.test_data["rental_ids"]:
            rental_id = self.test_data["rental_ids"][0]
            print(f"4️⃣ Testing PUT /api/rentals/{rental_id} (Update Rental)")
            
            update_data = {
                "rent_amount": 16000
            }
            
            try:
                response = requests.put(f"{BASE_URL}/rentals/{rental_id}", 
                                      json=update_data, 
                                      headers=self.get_headers())
                
                if response.status_code == 200:
                    updated_rental = response.json()
                    print(f"✅ Rental updated successfully")
                    print(f"   New rent amount: ₹{updated_rental['rent_amount']}")
                else:
                    print(f"❌ Update rental failed: {response.status_code} - {response.text}")
                    return False
                    
            except Exception as e:
                print(f"❌ Update rental error: {str(e)}")
                return False

        # 5. DELETE Rental (cleanup)
        if self.test_data["rental_ids"]:
            rental_id = self.test_data["rental_ids"][0]
            print(f"5️⃣ Testing DELETE /api/rentals/{rental_id} (Delete Rental)")
            
            try:
                response = requests.delete(f"{BASE_URL}/rentals/{rental_id}", 
                                         headers=self.get_headers())
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Rental deleted successfully: {result.get('message')}")
                    self.test_data["rental_ids"].remove(rental_id)
                else:
                    print(f"❌ Delete rental failed: {response.status_code} - {response.text}")
                    return False
                    
            except Exception as e:
                print(f"❌ Delete rental error: {str(e)}")
                return False

        return True

    def test_investment_headings_crud(self):
        """Test Investment Headings CRUD operations"""
        print("\n📊 Testing Investment Headings CRUD...")
        
        # 1. CREATE Investment Heading
        print("1️⃣ Testing POST /api/investment-headings (Create Heading)")
        heading_data = {
            "name": "Mutual Funds",
            "icon": "pie-chart"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/investment-headings", 
                                   json=heading_data, 
                                   headers=self.get_headers())
            
            if response.status_code == 200:
                heading = response.json()
                heading_id = heading.get("heading_id")
                self.test_data["heading_ids"].append(heading_id)
                print(f"✅ Investment heading created successfully. ID: {heading_id}")
                print(f"   Name: {heading['name']}, Icon: {heading['icon']}")
            else:
                print(f"❌ Create heading failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Create heading error: {str(e)}")
            return False

        # 2. GET Investment Headings (List all with investments)
        print("2️⃣ Testing GET /api/investment-headings (List Headings)")
        try:
            response = requests.get(f"{BASE_URL}/investment-headings", headers=self.get_headers())
            
            if response.status_code == 200:
                headings = response.json()
                print(f"✅ Retrieved {len(headings)} investment headings")
                if headings:
                    heading = headings[0]
                    print(f"   First heading: {heading['name']} ({heading['icon']})")
                    print(f"   Investments count: {heading.get('count', 0)}")
                    print(f"   Total invested: ₹{heading.get('total_invested', 0)}")
                    print(f"   Total current: ₹{heading.get('total_current', 0)}")
            else:
                print(f"❌ Get headings failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get headings error: {str(e)}")
            return False

        # 3. UPDATE Investment Heading
        if self.test_data["heading_ids"]:
            heading_id = self.test_data["heading_ids"][0]
            print(f"3️⃣ Testing PUT /api/investment-headings/{heading_id} (Update Heading)")
            
            update_data = {
                "name": "MF Portfolio"
            }
            
            try:
                response = requests.put(f"{BASE_URL}/investment-headings/{heading_id}", 
                                      json=update_data, 
                                      headers=self.get_headers())
                
                if response.status_code == 200:
                    updated_heading = response.json()
                    print(f"✅ Investment heading updated successfully")
                    print(f"   New name: {updated_heading['name']}")
                else:
                    print(f"❌ Update heading failed: {response.status_code} - {response.text}")
                    return False
                    
            except Exception as e:
                print(f"❌ Update heading error: {str(e)}")
                return False

        # 4. DELETE Investment Heading (cleanup)
        if self.test_data["heading_ids"]:
            heading_id = self.test_data["heading_ids"][0]
            print(f"4️⃣ Testing DELETE /api/investment-headings/{heading_id} (Delete Heading)")
            
            try:
                response = requests.delete(f"{BASE_URL}/investment-headings/{heading_id}", 
                                         headers=self.get_headers())
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Investment heading deleted successfully: {result.get('message')}")
                    self.test_data["heading_ids"].remove(heading_id)
                else:
                    print(f"❌ Delete heading failed: {response.status_code} - {response.text}")
                    return False
                    
            except Exception as e:
                print(f"❌ Delete heading error: {str(e)}")
                return False

        return True

    def test_credit_card_report(self):
        """Test Credit Card Report endpoint"""
        print("\n💳 Testing Credit Card Report...")
        
        print("1️⃣ Testing GET /api/credit-cards/report")
        try:
            response = requests.get(f"{BASE_URL}/credit-cards/report", headers=self.get_headers())
            
            if response.status_code == 200:
                report = response.json()
                print("✅ Credit card report retrieved successfully")
                
                # Check required structure
                if "summary" in report:
                    summary = report["summary"]
                    print(f"   Summary - Total Cards: {summary.get('total_cards', 0)}")
                    print(f"   Total Limit: ₹{summary.get('total_limit', 0)}")
                    print(f"   Total Outstanding: ₹{summary.get('total_outstanding', 0)}")
                    print(f"   Total Available: ₹{summary.get('total_available', 0)}")
                    print(f"   Utilization: {summary.get('utilization', 0)}%")
                else:
                    print("❌ Missing 'summary' in report")
                    return False
                
                if "upcoming_dues" in report:
                    dues = report["upcoming_dues"]
                    print(f"   Upcoming dues: {len(dues)} items")
                else:
                    print("❌ Missing 'upcoming_dues' in report")
                    return False
                
                if "cards" in report:
                    cards = report["cards"]
                    print(f"   Cards array: {len(cards)} items")
                else:
                    print("❌ Missing 'cards' in report")
                    return False
                    
            else:
                print(f"❌ Credit card report failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Credit card report error: {str(e)}")
            return False

        return True

    def test_bills_summary(self):
        """Test Bills Summary endpoint"""
        print("\n📋 Testing Bills Summary...")
        
        print("1️⃣ Testing GET /api/bills/summary")
        try:
            response = requests.get(f"{BASE_URL}/bills/summary", headers=self.get_headers())
            
            if response.status_code == 200:
                summary = response.json()
                print("✅ Bills summary retrieved successfully")
                
                # Check required structure
                required_fields = ["overdue", "upcoming", "paid", "overdue_count", "upcoming_count", "paid_count"]
                for field in required_fields:
                    if field in summary:
                        if field.endswith("_count"):
                            print(f"   {field}: {summary[field]}")
                        else:
                            print(f"   {field}: {len(summary[field])} items")
                    else:
                        print(f"❌ Missing '{field}' in summary")
                        return False
                
                # Check optional amount fields
                if "total_overdue_amount" in summary:
                    print(f"   Total overdue amount: ₹{summary['total_overdue_amount']}")
                if "total_upcoming_amount" in summary:
                    print(f"   Total upcoming amount: ₹{summary['total_upcoming_amount']}")
                    
            else:
                print(f"❌ Bills summary failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Bills summary error: {str(e)}")
            return False

        return True

    def cleanup_test_data(self):
        """Clean up any remaining test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Clean up remaining rentals
        for rental_id in self.test_data["rental_ids"]:
            try:
                requests.delete(f"{BASE_URL}/rentals/{rental_id}", headers=self.get_headers())
                print(f"   Cleaned up rental: {rental_id}")
            except:
                pass
        
        # Clean up remaining headings
        for heading_id in self.test_data["heading_ids"]:
            try:
                requests.delete(f"{BASE_URL}/investment-headings/{heading_id}", headers=self.get_headers())
                print(f"   Cleaned up heading: {heading_id}")
            except:
                pass

    def run_all_tests(self):
        """Run all Phase 5 backend tests"""
        print("🚀 Starting Phase 5 Backend API Testing")
        print(f"Backend URL: {BASE_URL}")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        test_results = []
        
        # Test 1: Rental Income CRUD
        try:
            result = self.test_rental_income_crud()
            test_results.append(("Rental Income CRUD", result))
        except Exception as e:
            print(f"❌ Rental Income CRUD test failed with exception: {str(e)}")
            test_results.append(("Rental Income CRUD", False))
        
        # Test 2: Investment Headings CRUD
        try:
            result = self.test_investment_headings_crud()
            test_results.append(("Investment Headings CRUD", result))
        except Exception as e:
            print(f"❌ Investment Headings CRUD test failed with exception: {str(e)}")
            test_results.append(("Investment Headings CRUD", False))
        
        # Test 3: Credit Card Report
        try:
            result = self.test_credit_card_report()
            test_results.append(("Credit Card Report", result))
        except Exception as e:
            print(f"❌ Credit Card Report test failed with exception: {str(e)}")
            test_results.append(("Credit Card Report", False))
        
        # Test 4: Bills Summary
        try:
            result = self.test_bills_summary()
            test_results.append(("Bills Summary", result))
        except Exception as e:
            print(f"❌ Bills Summary test failed with exception: {str(e)}")
            test_results.append(("Bills Summary", False))
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 PHASE 5 BACKEND TESTING SUMMARY")
        print("=" * 60)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{test_name}: {status}")
            if result:
                passed += 1
        
        print(f"\nOverall Result: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 All Phase 5 backend tests PASSED!")
            return True
        else:
            print("⚠️  Some Phase 5 backend tests FAILED!")
            return False

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)