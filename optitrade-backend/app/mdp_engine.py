import numpy as np
from typing import List, Tuple, Dict
from app.models import Venue, OrderRequest, VenueSplit, ExecutionStep, OptimalExecution
import math


class MDPExecutionEngine:
    def __init__(self, risk_aversion: float = 1e-10, terminal_penalty: float = 0.5):
        self.lambda_risk = risk_aversion
        self.phi_penalty = terminal_penalty
        
    def estimate_fill_probability(self, venue: Venue, order_size: int) -> float:
        depth_ratio = order_size / venue.depth if venue.depth > 0 else 1.0
        spread_factor = math.log(max(venue.spread, 0.1))
        
        logit_p = -0.1 - 0.6 * math.log(max(depth_ratio, 0.01)) - 0.3 * spread_factor
        probability = 1.0 / (1.0 + math.exp(-logit_p))
        
        return min(max(probability, 0.1), 0.95)
    
    def estimate_temporary_impact(self, venue: Venue, order_size: int, current_price: float) -> float:
        if venue.depth <= 0:
            return 0.0
        
        alpha = 1.2
        delta = 0.5
        fill_ratio = order_size / venue.depth
        
        impact_ticks = alpha * (fill_ratio ** delta)
        impact_price = impact_ticks * 0.01 * current_price
        
        return impact_price
    
    def estimate_permanent_impact(self, total_volume: int, current_price: float) -> float:
        gamma = 0.1
        permanent_impact = gamma * math.sqrt(total_volume) * 0.01 * current_price
        return permanent_impact
    
    def compute_venue_split(
        self, 
        inventory: int, 
        venues: List[Venue], 
        current_price: float,
        time_remaining: int
    ) -> List[VenueSplit]:
        if inventory <= 0 or not venues:
            return []
        
        venue_splits = []
        total_allocation = 0
        
        venue_scores = []
        for venue in venues:
            fill_prob = self.estimate_fill_probability(venue, inventory // len(venues))
            impact = self.estimate_temporary_impact(venue, inventory // len(venues), current_price)
            
            cost_per_share = venue.fee_rate - venue.rebate_rate + impact / max(inventory // len(venues), 1)
            
            score = fill_prob / (1.0 + cost_per_share)
            venue_scores.append((venue, score, fill_prob))
        
        venue_scores.sort(key=lambda x: x[1], reverse=True)
        
        remaining_inventory = inventory
        for i, (venue, score, fill_prob) in enumerate(venue_scores):
            if remaining_inventory <= 0:
                break
            
            if i == len(venue_scores) - 1:
                allocation = remaining_inventory
            else:
                base_allocation = inventory // len(venues)
                allocation = min(base_allocation, remaining_inventory)
            
            expected_fill = int(allocation * fill_prob)
            slippage = self.estimate_temporary_impact(venue, allocation, current_price) / current_price * 10000
            
            expected_cost = allocation * (venue.fee_rate - venue.rebate_rate) + \
                          self.estimate_temporary_impact(venue, allocation, current_price)
            
            venue_splits.append(VenueSplit(
                venue_id=venue.id,
                venue_name=venue.name,
                shares=allocation,
                expected_fill_probability=fill_prob,
                expected_slippage_ticks=slippage,
                expected_cost=expected_cost
            ))
            
            total_allocation += allocation
            remaining_inventory -= allocation
        
        return venue_splits
    
    def optimize_execution(
        self,
        order: OrderRequest,
        venues: List[Venue],
        current_price: float,
        volatility: float
    ) -> OptimalExecution:
        total_shares = order.total_shares
        time_horizon = order.time_horizon_minutes
        
        num_steps = min(time_horizon, 10)
        step_duration = time_horizon / num_steps
        
        execution_steps = []
        remaining_inventory = total_shares
        total_proceeds = 0.0
        total_risk = 0.0
        total_slippage = 0.0
        
        for step in range(num_steps):
            time_remaining = time_horizon - int(step * step_duration)
            
            if step == num_steps - 1:
                step_inventory = remaining_inventory
            else:
                urgency_factor = 1.0 + (step / num_steps) * 0.5
                step_inventory = int(remaining_inventory * urgency_factor / (num_steps - step))
                step_inventory = min(step_inventory, remaining_inventory)
            
            venue_splits = self.compute_venue_split(
                step_inventory,
                venues,
                current_price,
                time_remaining
            )
            
            step_proceeds = 0.0
            step_slippage = 0.0
            for split in venue_splits:
                expected_fill = int(split.shares * split.expected_fill_probability)
                step_proceeds += expected_fill * current_price - split.expected_cost
                step_slippage += split.expected_slippage_ticks
            
            variance_penalty = self.lambda_risk * (volatility ** 2) * (current_price ** 2) * (step_inventory ** 2) * (step_duration / 252 / 390)
            
            execution_steps.append(ExecutionStep(
                step=step + 1,
                time_remaining_minutes=time_remaining,
                inventory_remaining=remaining_inventory,
                venue_splits=venue_splits,
                expected_proceeds=step_proceeds,
                risk_penalty=variance_penalty
            ))
            
            total_proceeds += step_proceeds
            total_risk += variance_penalty
            total_slippage += step_slippage
            
            expected_executed = sum(int(s.shares * s.expected_fill_probability) for s in venue_splits)
            remaining_inventory -= expected_executed
            remaining_inventory = max(0, remaining_inventory)
        
        terminal_cost = self.phi_penalty * (remaining_inventory ** 2)
        total_risk += terminal_cost
        
        completion_prob = 1.0 - (remaining_inventory / total_shares)
        
        return OptimalExecution(
            total_shares=total_shares,
            time_horizon_minutes=time_horizon,
            execution_steps=execution_steps,
            total_expected_proceeds=total_proceeds,
            total_risk_penalty=total_risk,
            total_expected_slippage=total_slippage / max(num_steps, 1),
            completion_probability=completion_prob
        )
