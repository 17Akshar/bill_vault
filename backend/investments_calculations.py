"""
Investments Calculations Module
================================

Provides calculation utilities for investment portfolio analytics:
- Total portfolio value
- Total invested amount
- Gain/loss calculations
- Profit percentage
- Asset allocation
- XIRR (Extended Internal Rate of Return)
"""

from typing import List, Dict, Any
from datetime import datetime
from decimal import Decimal


class InvestmentCalculations:
    """Portfolio calculation utilities"""
    
    @staticmethod
    def calculate_total_portfolio_value(investments: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Calculate total portfolio value from all investments
        
        Args:
            investments: List of investment documents
            
        Returns:
            Dict with total_invested, total_current_value, total_gain_loss, gain_loss_percentage
        """
        total_invested = 0.0
        total_current_value = 0.0
        
        for investment in investments:
            if investment.get('is_active', True) and investment.get('status') == 'active':
                total_invested += float(investment.get('invested_amount', 0))
                total_current_value += float(investment.get('current_value', 0))
        
        total_gain_loss = total_current_value - total_invested
        gain_loss_percentage = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0.0
        
        return {
            'total_invested': round(total_invested, 2),
            'total_current_value': round(total_current_value, 2),
            'total_gain_loss': round(total_gain_loss, 2),
            'gain_loss_percentage': round(gain_loss_percentage, 2)
        }
    
    @staticmethod
    def calculate_investment_gain_loss(invested_amount: float, current_value: float) -> Dict[str, float]:
        """
        Calculate gain/loss for a single investment
        
        Args:
            invested_amount: Total amount invested
            current_value: Current market value
            
        Returns:
            Dict with gain_loss, gain_loss_percentage
        """
        gain_loss = current_value - invested_amount
        gain_loss_percentage = (gain_loss / invested_amount * 100) if invested_amount > 0 else 0.0
        
        return {
            'gain_loss': round(gain_loss, 2),
            'gain_loss_percentage': round(gain_loss_percentage, 2)
        }
    
    @staticmethod
    def calculate_asset_allocation(investments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate asset allocation by investment type
        
        Args:
            investments: List of investment documents
            
        Returns:
            Dict with allocation by type and group
        """
        total_value = 0.0
        type_allocation = {}
        group_allocation = {
            'market': 0.0,
            'fixed_income': 0.0,
            'physical': 0.0,
            'insurance': 0.0,
            'vehicle': 0.0,
            'other': 0.0
        }
        
        # Type to group mapping
        type_to_group = {
            'stocks': 'market',
            'mutual_funds': 'market',
            'etf': 'market',
            'bonds': 'market',
            'reit': 'market',
            'fd': 'fixed_income',
            'corporate_deposit': 'fixed_income',
            'rd': 'fixed_income',
            'ppf': 'fixed_income',
            'nps': 'fixed_income',
            'epf': 'fixed_income',
            'gold': 'physical',
            'silver': 'physical',
            'lic': 'insurance',
            'term_insurance': 'insurance',
            'mediclaim': 'insurance',
            'motor_insurance': 'insurance',
            'vehicle_car': 'vehicle',
            'vehicle_two_wheeler': 'vehicle',
            'vehicle_other': 'vehicle',
            'esop': 'other',
            'private_equity': 'other',
            'arts_artifacts': 'other',
            'aif': 'other',
            'crypto': 'other',
            'others': 'other'
        }
        
        # Calculate totals
        for investment in investments:
            if investment.get('is_active', True) and investment.get('status') == 'active':
                current_value = float(investment.get('current_value', 0))
                investment_type = investment.get('investment_type', 'others')
                
                total_value += current_value
                
                # By type
                if investment_type not in type_allocation:
                    type_allocation[investment_type] = 0.0
                type_allocation[investment_type] += current_value
                
                # By group
                group = type_to_group.get(investment_type, 'other')
                group_allocation[group] += current_value
        
        # Calculate percentages
        allocation_by_type = []
        for inv_type, value in type_allocation.items():
            percentage = (value / total_value * 100) if total_value > 0 else 0.0
            allocation_by_type.append({
                'type': inv_type,
                'value': round(value, 2),
                'percentage': round(percentage, 2)
            })
        
        # Sort by value descending
        allocation_by_type.sort(key=lambda x: x['value'], reverse=True)
        
        allocation_by_group = []
        for group, value in group_allocation.items():
            percentage = (value / total_value * 100) if total_value > 0 else 0.0
            if value > 0:  # Only include non-zero groups
                allocation_by_group.append({
                    'group': group,
                    'value': round(value, 2),
                    'percentage': round(percentage, 2)
                })
        
        # Sort by value descending
        allocation_by_group.sort(key=lambda x: x['value'], reverse=True)
        
        return {
            'total_portfolio_value': round(total_value, 2),
            'by_type': allocation_by_type,
            'by_group': allocation_by_group
        }
    
    @staticmethod
    def calculate_average_buy_price(transactions: List[Dict[str, Any]]) -> float:
        """
        Calculate weighted average buy price from transactions
        
        Args:
            transactions: List of buy transactions
            
        Returns:
            Average buy price
        """
        total_quantity = 0.0
        total_amount = 0.0
        
        for txn in transactions:
            if txn.get('transaction_type') == 'buy':
                quantity = float(txn.get('quantity', 0))
                price = float(txn.get('price_per_unit', 0))
                total_quantity += quantity
                total_amount += quantity * price
        
        return round(total_amount / total_quantity, 2) if total_quantity > 0 else 0.0
    
    @staticmethod
    def calculate_realized_unrealized_gains(
        investment: Dict[str, Any],
        transactions: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """
        Calculate realized and unrealized gains/losses
        
        Args:
            investment: Investment document
            transactions: List of all transactions for this investment
            
        Returns:
            Dict with realized_gain_loss and unrealized_gain_loss
        """
        realized_gain_loss = 0.0
        
        # Calculate realized gains from sell transactions
        for txn in transactions:
            if txn.get('transaction_type') == 'sell':
                sell_price = float(txn.get('price_per_unit', 0))
                quantity = float(txn.get('quantity', 0))
                # Assuming FIFO method
                avg_buy_price = float(investment.get('average_buy_price', 0))
                realized_gain_loss += (sell_price - avg_buy_price) * quantity
        
        # Unrealized gains = current holdings value - invested value
        current_value = float(investment.get('current_value', 0))
        invested_amount = float(investment.get('invested_amount', 0))
        total_gain_loss = current_value - invested_amount
        unrealized_gain_loss = total_gain_loss - realized_gain_loss
        
        return {
            'realized_gain_loss': round(realized_gain_loss, 2),
            'unrealized_gain_loss': round(unrealized_gain_loss, 2)
        }
    
    @staticmethod
    def calculate_investment_summary(
        investments: List[Dict[str, Any]],
        transactions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive investment summary
        
        Args:
            investments: List of all investments
            transactions: List of all transactions
            
        Returns:
            Comprehensive summary with all metrics
        """
        # Portfolio totals
        portfolio = InvestmentCalculations.calculate_total_portfolio_value(investments)
        
        # Asset allocation
        allocation = InvestmentCalculations.calculate_asset_allocation(investments)
        
        # Investment counts by status
        counts = {
            'total': len(investments),
            'active': len([i for i in investments if i.get('status') == 'active' and i.get('is_active', True)]),
            'closed': len([i for i in investments if i.get('status') == 'closed']),
            'matured': len([i for i in investments if i.get('status') == 'matured']),
            'partially_sold': len([i for i in investments if i.get('status') == 'partially_sold'])
        }
        
        # Transaction counts
        transaction_counts = {
            'total': len(transactions),
            'buy': len([t for t in transactions if t.get('transaction_type') == 'buy']),
            'sell': len([t for t in transactions if t.get('transaction_type') == 'sell']),
            'dividend': len([t for t in transactions if t.get('transaction_type') == 'dividend']),
            'charges': len([t for t in transactions if t.get('transaction_type') == 'charges'])
        }
        
        # Calculate total dividends received
        total_dividends = sum(
            float(t.get('total_amount', 0)) 
            for t in transactions 
            if t.get('transaction_type') == 'dividend'
        )
        
        # Calculate total charges paid
        total_charges = sum(
            float(t.get('brokerage_charges', 0)) 
            for t in transactions
        )
        
        return {
            'portfolio': portfolio,
            'allocation': allocation,
            'counts': counts,
            'transaction_counts': transaction_counts,
            'total_dividends_received': round(total_dividends, 2),
            'total_charges_paid': round(total_charges, 2),
            'net_gain_loss': round(portfolio['total_gain_loss'] + total_dividends - total_charges, 2)
        }
    
    @staticmethod
    def calculate_top_performers(
        investments: List[Dict[str, Any]],
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get top performing investments by gain percentage
        
        Args:
            investments: List of investments
            limit: Number of top performers to return
            
        Returns:
            List of top performing investments
        """
        active_investments = [
            i for i in investments 
            if i.get('is_active', True) and i.get('status') == 'active'
        ]
        
        # Sort by gain/loss percentage
        sorted_investments = sorted(
            active_investments,
            key=lambda x: float(x.get('gain_loss_percentage', 0)),
            reverse=True
        )
        
        return sorted_investments[:limit]
    
    @staticmethod
    def calculate_top_losers(
        investments: List[Dict[str, Any]],
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get worst performing investments by loss percentage
        
        Args:
            investments: List of investments
            limit: Number of top losers to return
            
        Returns:
            List of worst performing investments
        """
        active_investments = [
            i for i in investments 
            if i.get('is_active', True) and i.get('status') == 'active'
        ]
        
        # Sort by gain/loss percentage ascending
        sorted_investments = sorted(
            active_investments,
            key=lambda x: float(x.get('gain_loss_percentage', 0))
        )
        
        return sorted_investments[:limit]
    
    @staticmethod
    def calculate_xirr(transactions: List[Dict[str, Any]], current_value: float) -> float:
        """
        Calculate XIRR (Extended Internal Rate of Return)
        Simple approximation using average return
        
        Args:
            transactions: List of transactions with dates and amounts
            current_value: Current portfolio value
            
        Returns:
            XIRR as percentage
        """
        if not transactions:
            return 0.0
        
        # Get all cash flows
        cash_flows = []
        for txn in transactions:
            if txn.get('transaction_type') in ['buy', 'sell', 'dividend']:
                date = txn.get('transaction_date')
                if isinstance(date, str):
                    date = datetime.fromisoformat(date.replace('Z', '+00:00'))
                
                amount = float(txn.get('total_amount', 0))
                # Outflow for buy, inflow for sell/dividend
                if txn.get('transaction_type') == 'buy':
                    amount = -amount
                
                cash_flows.append({
                    'date': date,
                    'amount': amount
                })
        
        if not cash_flows:
            return 0.0
        
        # Add current value as final inflow
        cash_flows.append({
            'date': datetime.now(),
            'amount': current_value
        })
        
        # Sort by date
        cash_flows.sort(key=lambda x: x['date'])
        
        # Simple approximation: (final_value - total_invested) / total_invested / years
        total_invested = sum(abs(cf['amount']) for cf in cash_flows if cf['amount'] < 0)
        total_returned = sum(cf['amount'] for cf in cash_flows if cf['amount'] > 0)
        
        if total_invested == 0:
            return 0.0
        
        # Calculate time period in years
        first_date = cash_flows[0]['date']
        last_date = cash_flows[-1]['date']
        years = (last_date - first_date).days / 365.25
        
        if years <= 0:
            return 0.0
        
        # Annualized return
        total_return = (total_returned - total_invested) / total_invested
        xirr = (pow(1 + total_return, 1/years) - 1) * 100
        
        return round(xirr, 2)
    
    @staticmethod
    def calculate_portfolio_diversity_score(investments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate portfolio diversity score (0-100)
        Based on number of investment types and distribution
        
        Args:
            investments: List of investments
            
        Returns:
            Dict with diversity score and analysis
        """
        active_investments = [
            i for i in investments 
            if i.get('is_active', True) and i.get('status') == 'active'
        ]
        
        if not active_investments:
            return {
                'score': 0,
                'level': 'None',
                'recommendation': 'Start building your portfolio'
            }
        
        # Count unique types
        unique_types = len(set(i.get('investment_type') for i in active_investments))
        
        # Calculate value distribution (Herfindahl index)
        total_value = sum(float(i.get('current_value', 0)) for i in active_investments)
        if total_value > 0:
            shares = [float(i.get('current_value', 0)) / total_value for i in active_investments]
            herfindahl = sum(s * s for s in shares)
            distribution_score = (1 - herfindahl) * 100
        else:
            distribution_score = 0
        
        # Calculate diversity score (weighted average)
        type_score = min(unique_types * 10, 50)  # Max 50 points for types
        dist_score = min(distribution_score, 50)  # Max 50 points for distribution
        
        diversity_score = round(type_score + dist_score)
        
        # Determine level
        if diversity_score >= 80:
            level = 'Excellent'
            recommendation = 'Well-diversified portfolio'
        elif diversity_score >= 60:
            level = 'Good'
            recommendation = 'Consider adding more investment types'
        elif diversity_score >= 40:
            level = 'Moderate'
            recommendation = 'Increase diversification across types'
        elif diversity_score >= 20:
            level = 'Low'
            recommendation = 'Portfolio needs more diversification'
        else:
            level = 'Very Low'
            recommendation = 'Highly concentrated - consider diversifying'
        
        return {
            'score': diversity_score,
            'level': level,
            'unique_types': unique_types,
            'total_investments': len(active_investments),
            'recommendation': recommendation
        }


# Utility functions for easy access
def get_portfolio_summary(investments: List[Dict], transactions: List[Dict]) -> Dict:
    """Quick access to portfolio summary"""
    calc = InvestmentCalculations()
    return calc.calculate_investment_summary(investments, transactions)


def get_asset_allocation(investments: List[Dict]) -> Dict:
    """Quick access to asset allocation"""
    calc = InvestmentCalculations()
    return calc.calculate_asset_allocation(investments)


def get_gain_loss(invested: float, current: float) -> Dict:
    """Quick access to gain/loss calculation"""
    calc = InvestmentCalculations()
    return calc.calculate_investment_gain_loss(invested, current)
