from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from app.models import (
    Venue, VenueType, OrderRequest, MarketState, 
    OptimalExecution, SimulationRequest, BacktestResult,
    TCAMetrics
)
from app.mdp_engine import MDPExecutionEngine
from app.market_simulator import MarketSimulator

app = FastAPI(title="OptiTrade AI API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mdp_engine = MDPExecutionEngine()
market_simulator = MarketSimulator()

DEFAULT_VENUES = [
    Venue(
        id="venue_1",
        name="Exchange A",
        type=VenueType.EXCHANGE_A,
        depth=5000.0,
        spread=2.0,
        fee_rate=0.003,
        rebate_rate=0.001,
        latency_ms=5.0
    ),
    Venue(
        id="venue_2",
        name="Exchange B",
        type=VenueType.EXCHANGE_B,
        depth=3000.0,
        spread=2.5,
        fee_rate=0.0025,
        rebate_rate=0.0015,
        latency_ms=8.0
    ),
    Venue(
        id="venue_3",
        name="Dark Pool",
        type=VenueType.DARK_POOL,
        depth=2000.0,
        spread=1.5,
        fee_rate=0.002,
        rebate_rate=0.002,
        latency_ms=12.0
    ),
    Venue(
        id="venue_4",
        name="Broker Dealer",
        type=VenueType.BROKER_DEALER,
        depth=4000.0,
        spread=3.0,
        fee_rate=0.004,
        rebate_rate=0.0005,
        latency_ms=6.0
    )
]

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/api/venues", response_model=List[Venue])
async def get_venues():
    return DEFAULT_VENUES

@app.post("/api/optimize-execution", response_model=OptimalExecution)
async def optimize_execution(
    order: OrderRequest,
    current_price: float = 100.0,
    volatility: float = 0.30
):
    try:
        mdp_engine.lambda_risk = order.risk_aversion
        mdp_engine.phi_penalty = order.terminal_penalty
        
        optimal_execution = mdp_engine.optimize_execution(
            order=order,
            venues=DEFAULT_VENUES,
            current_price=current_price,
            volatility=volatility
        )
        
        return optimal_execution
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate", response_model=BacktestResult)
async def simulate_execution(request: SimulationRequest):
    try:
        market_state = request.market_state
        if not market_state.venues:
            market_state.venues = DEFAULT_VENUES
        
        backtest_result = market_simulator.run_backtest(
            order=request.order,
            market_state=market_state,
            num_scenarios=request.num_scenarios
        )
        
        return backtest_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/backtest", response_model=BacktestResult)
async def run_backtest(
    order: OrderRequest,
    current_price: float = 100.0,
    volatility: float = 0.30,
    num_scenarios: int = 100
):
    try:
        market_state = MarketState(
            price=current_price,
            volatility=volatility,
            timestamp=0,
            venues=DEFAULT_VENUES
        )
        
        backtest_result = market_simulator.run_backtest(
            order=order,
            market_state=market_state,
            num_scenarios=num_scenarios
        )
        
        return backtest_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analytics/tca", response_model=TCAMetrics)
async def get_tca_analytics(
    order: OrderRequest,
    decision_price: float = 100.0,
    current_price: float = 100.0,
    volatility: float = 0.30
):
    try:
        market_state = MarketState(
            price=current_price,
            volatility=volatility,
            timestamp=0,
            venues=DEFAULT_VENUES
        )
        
        backtest_result = market_simulator.run_backtest(
            order=order,
            market_state=market_state,
            num_scenarios=50
        )
        
        tca_metrics = market_simulator.compute_tca_metrics(
            decision_price=decision_price,
            execution_results=backtest_result.scenarios,
            total_shares=order.total_shares
        )
        
        return tca_metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
