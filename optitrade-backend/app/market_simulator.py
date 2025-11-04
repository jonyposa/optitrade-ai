import numpy as np
from typing import List, Tuple
from app.models import (
    Venue, OrderRequest, MarketState, SimulationResult, 
    BacktestResult, TCAMetrics
)
from app.mdp_engine import MDPExecutionEngine
import random


class MarketSimulator:
    def __init__(self, seed: int = 42):
        self.rng = np.random.RandomState(seed)
        self.engine = MDPExecutionEngine()
    
    def simulate_price_path(
        self, 
        initial_price: float, 
        volatility: float, 
        num_steps: int,
        dt: float = 1.0/252/390
    ) -> List[float]:
        prices = [initial_price]
        
        for _ in range(num_steps - 1):
            drift = 0.0
            shock = self.rng.normal(0, volatility * np.sqrt(dt))
            
            new_price = prices[-1] * (1 + drift * dt + shock)
            new_price = max(new_price, initial_price * 0.5)
            prices.append(new_price)
        
        return prices
    
    def simulate_fill(
        self, 
        venue: Venue, 
        order_size: int, 
        fill_probability: float
    ) -> int:
        if random.random() < fill_probability:
            fill_rate = self.rng.uniform(0.8, 1.0)
            filled = int(order_size * fill_rate)
            return filled
        else:
            partial_fill_rate = self.rng.uniform(0.3, 0.7)
            return int(order_size * partial_fill_rate)
    
    def simulate_execution_scenario(
        self,
        order: OrderRequest,
        market_state: MarketState,
        scenario_id: int
    ) -> SimulationResult:
        self.engine.lambda_risk = order.risk_aversion
        self.engine.phi_penalty = order.terminal_penalty
        
        optimal_plan = self.engine.optimize_execution(
            order,
            market_state.venues,
            market_state.price,
            market_state.volatility
        )
        
        num_steps = len(optimal_plan.execution_steps)
        price_path = self.simulate_price_path(
            market_state.price,
            market_state.volatility,
            num_steps + 1
        )
        
        total_proceeds = 0.0
        total_slippage = 0.0
        remaining_inventory = order.total_shares
        steps_taken = 0
        
        for step_idx, execution_step in enumerate(optimal_plan.execution_steps):
            if remaining_inventory <= 0:
                break
            
            current_price = price_path[step_idx]
            
            for venue_split in execution_step.venue_splits:
                venue = next((v for v in market_state.venues if v.id == venue_split.venue_id), None)
                if not venue:
                    continue
                
                actual_fill = self.simulate_fill(
                    venue,
                    venue_split.shares,
                    venue_split.expected_fill_probability
                )
                
                actual_fill = min(actual_fill, remaining_inventory)
                
                impact = self.engine.estimate_temporary_impact(venue, actual_fill, current_price)
                execution_price = current_price - impact if order.side == "sell" else current_price + impact
                
                fees = actual_fill * venue.fee_rate
                rebates = actual_fill * venue.rebate_rate
                
                proceeds = actual_fill * execution_price - fees + rebates
                total_proceeds += proceeds
                
                slippage_ticks = abs(execution_price - current_price) / current_price * 10000
                total_slippage += slippage_ticks * actual_fill
                
                remaining_inventory -= actual_fill
            
            steps_taken += 1
        
        completion_time = int(steps_taken * (order.time_horizon_minutes / num_steps))
        
        return SimulationResult(
            scenario_id=scenario_id,
            final_proceeds=total_proceeds,
            total_slippage=total_slippage / max(order.total_shares - remaining_inventory, 1),
            completion_time_minutes=completion_time,
            leftover_shares=remaining_inventory
        )
    
    def run_backtest(
        self,
        order: OrderRequest,
        market_state: MarketState,
        num_scenarios: int = 100
    ) -> BacktestResult:
        scenarios = []
        
        for i in range(num_scenarios):
            scenario = self.simulate_execution_scenario(order, market_state, i)
            scenarios.append(scenario)
        
        avg_proceeds = np.mean([s.final_proceeds for s in scenarios])
        avg_slippage = np.mean([s.total_slippage for s in scenarios])
        avg_completion_time = np.mean([s.completion_time_minutes for s in scenarios])
        
        completed_scenarios = sum(1 for s in scenarios if s.leftover_shares == 0)
        completion_rate = completed_scenarios / num_scenarios
        
        return BacktestResult(
            total_scenarios=num_scenarios,
            avg_proceeds=avg_proceeds,
            avg_slippage=avg_slippage,
            avg_completion_time=avg_completion_time,
            completion_rate=completion_rate,
            scenarios=scenarios[:10]
        )
    
    def compute_tca_metrics(
        self,
        decision_price: float,
        execution_results: List[SimulationResult],
        total_shares: int
    ) -> TCAMetrics:
        avg_proceeds = np.mean([r.final_proceeds for r in execution_results])
        avg_execution_price = avg_proceeds / total_shares if total_shares > 0 else 0
        
        implementation_shortfall = (decision_price - avg_execution_price) * total_shares
        arrival_cost = implementation_shortfall / (decision_price * total_shares) * 10000 if total_shares > 0 else 0
        
        avg_slippage = np.mean([r.total_slippage for r in execution_results])
        
        market_impact = avg_slippage * 0.6
        timing_cost = avg_slippage * 0.4
        
        venue_efficiency = {
            "Exchange_A": 0.85 + self.rng.uniform(-0.1, 0.1),
            "Exchange_B": 0.80 + self.rng.uniform(-0.1, 0.1),
            "Dark_Pool": 0.75 + self.rng.uniform(-0.1, 0.1),
            "Broker_Dealer": 0.90 + self.rng.uniform(-0.1, 0.1)
        }
        
        return TCAMetrics(
            implementation_shortfall=implementation_shortfall,
            arrival_cost=arrival_cost,
            slippage_bps=avg_slippage,
            market_impact_bps=market_impact,
            timing_cost_bps=timing_cost,
            venue_efficiency=venue_efficiency
        )
