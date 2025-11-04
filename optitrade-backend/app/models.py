from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum


class VenueType(str, Enum):
    EXCHANGE_A = "Exchange_A"
    EXCHANGE_B = "Exchange_B"
    DARK_POOL = "Dark_Pool"
    BROKER_DEALER = "Broker_Dealer"


class Venue(BaseModel):
    id: str
    name: str
    type: VenueType
    depth: float = Field(description="Market depth in shares")
    spread: float = Field(description="Bid-ask spread in ticks")
    fee_rate: float = Field(description="Fee rate per share")
    rebate_rate: float = Field(description="Rebate rate per share")
    latency_ms: float = Field(description="Average latency in milliseconds")


class MarketState(BaseModel):
    price: float = Field(description="Current market price")
    volatility: float = Field(description="Annualized volatility")
    timestamp: int = Field(description="Unix timestamp")
    venues: List[Venue]


class OrderRequest(BaseModel):
    total_shares: int = Field(description="Total shares to execute")
    side: str = Field(description="buy or sell")
    time_horizon_minutes: int = Field(description="Execution time horizon in minutes")
    risk_aversion: float = Field(default=1e-10, description="Lambda parameter for risk aversion")
    terminal_penalty: float = Field(default=0.5, description="Phi parameter for leftover inventory penalty")


class VenueSplit(BaseModel):
    venue_id: str
    venue_name: str
    shares: int
    expected_fill_probability: float
    expected_slippage_ticks: float
    expected_cost: float


class ExecutionStep(BaseModel):
    step: int
    time_remaining_minutes: int
    inventory_remaining: int
    venue_splits: List[VenueSplit]
    expected_proceeds: float
    risk_penalty: float


class OptimalExecution(BaseModel):
    total_shares: int
    time_horizon_minutes: int
    execution_steps: List[ExecutionStep]
    total_expected_proceeds: float
    total_risk_penalty: float
    total_expected_slippage: float
    completion_probability: float


class SimulationRequest(BaseModel):
    order: OrderRequest
    market_state: MarketState
    num_scenarios: int = Field(default=100, description="Number of Monte Carlo scenarios")


class SimulationResult(BaseModel):
    scenario_id: int
    final_proceeds: float
    total_slippage: float
    completion_time_minutes: int
    leftover_shares: int


class BacktestRequest(BaseModel):
    order: OrderRequest
    historical_prices: List[float]
    historical_volatilities: List[float]
    venues: List[Venue]


class BacktestResult(BaseModel):
    total_scenarios: int
    avg_proceeds: float
    avg_slippage: float
    avg_completion_time: float
    completion_rate: float
    scenarios: List[SimulationResult]


class TCAMetrics(BaseModel):
    implementation_shortfall: float = Field(description="Difference between decision price and execution price")
    arrival_cost: float = Field(description="Cost relative to arrival price")
    slippage_bps: float = Field(description="Slippage in basis points")
    market_impact_bps: float = Field(description="Market impact in basis points")
    timing_cost_bps: float = Field(description="Timing cost in basis points")
    venue_efficiency: Dict[str, float] = Field(description="Fill rate by venue")
