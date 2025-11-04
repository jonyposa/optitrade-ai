import { useState } from 'react'
import './App.css'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingDown, Activity, DollarSign, Target, Zap, BarChart3, Settings } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_USER = import.meta.env.VITE_API_USER || ''
const API_PASSWORD = import.meta.env.VITE_API_PASSWORD || ''

const getAuthHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (API_USER && API_PASSWORD) {
    headers['Authorization'] = 'Basic ' + btoa(`${API_USER}:${API_PASSWORD}`)
  }
  return headers
}

interface Venue {
  id: string
  name: string
  type: string
  depth: number
  spread: number
  fee_rate: number
  rebate_rate: number
  latency_ms: number
}

interface VenueSplit {
  venue_id: string
  venue_name: string
  shares: number
  expected_fill_probability: number
  expected_slippage_ticks: number
  expected_cost: number
}

interface ExecutionStep {
  step: number
  time_remaining_minutes: number
  inventory_remaining: number
  venue_splits: VenueSplit[]
  expected_proceeds: number
  risk_penalty: number
}

interface OptimalExecution {
  total_shares: number
  time_horizon_minutes: number
  execution_steps: ExecutionStep[]
  total_expected_proceeds: number
  total_risk_penalty: number
  total_expected_slippage: number
  completion_probability: number
}

interface BacktestResult {
  total_scenarios: number
  avg_proceeds: number
  avg_slippage: number
  avg_completion_time: number
  completion_rate: number
  scenarios: Array<{
    scenario_id: number
    final_proceeds: number
    total_slippage: number
    completion_time_minutes: number
    leftover_shares: number
  }>
}

interface TCAMetrics {
  implementation_shortfall: number
  arrival_cost: number
  slippage_bps: number
  market_impact_bps: number
  timing_cost_bps: number
  venue_efficiency: Record<string, number>
}

function App() {
  const [totalShares, setTotalShares] = useState('10000')
  const [timeHorizon, setTimeHorizon] = useState('30')
  const [currentPrice, setCurrentPrice] = useState('100')
  const [volatility, setVolatility] = useState('0.30')
  const [riskAversion, setRiskAversion] = useState('1e-10')
  const [terminalPenalty, setTerminalPenalty] = useState('0.5')
  
  const [venues, setVenues] = useState<Venue[]>([])
  const [execution, setExecution] = useState<OptimalExecution | null>(null)
  const [backtest, setBacktest] = useState<BacktestResult | null>(null)
  const [tca, setTca] = useState<TCAMetrics | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchVenues = async () => {
    try {
      const response = await fetch(`${API_URL}/api/venues`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      setVenues(data)
    } catch (error) {
      console.error('Error fetching venues:', error)
    }
  }

  const optimizeExecution = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/optimize-execution?current_price=${currentPrice}&volatility=${volatility}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          total_shares: parseInt(totalShares),
          side: 'sell',
          time_horizon_minutes: parseInt(timeHorizon),
          risk_aversion: parseFloat(riskAversion),
          terminal_penalty: parseFloat(terminalPenalty)
        })
      })
      const data = await response.json()
      setExecution(data)
    } catch (error) {
      console.error('Error optimizing execution:', error)
    }
    setLoading(false)
  }

  const runBacktest = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/backtest?current_price=${currentPrice}&volatility=${volatility}&num_scenarios=100`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          total_shares: parseInt(totalShares),
          side: 'sell',
          time_horizon_minutes: parseInt(timeHorizon),
          risk_aversion: parseFloat(riskAversion),
          terminal_penalty: parseFloat(terminalPenalty)
        })
      })
      const data = await response.json()
      setBacktest(data)
    } catch (error) {
      console.error('Error running backtest:', error)
    }
    setLoading(false)
  }

  const fetchTCA = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/analytics/tca?decision_price=${currentPrice}&current_price=${currentPrice}&volatility=${volatility}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          total_shares: parseInt(totalShares),
          side: 'sell',
          time_horizon_minutes: parseInt(timeHorizon),
          risk_aversion: parseFloat(riskAversion),
          terminal_penalty: parseFloat(terminalPenalty)
        })
      })
      const data = await response.json()
      setTca(data)
    } catch (error) {
      console.error('Error fetching TCA:', error)
    }
    setLoading(false)
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">OptiTrade AI</h1>
              <p className="text-blue-200 text-lg">Intelligent Execution for Every Trade</p>
            </div>
            <Badge className="bg-blue-500 text-white px-4 py-2 text-sm">
              <Activity className="w-4 h-4 mr-2 inline" />
              MDP Engine Active
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-medium flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-green-400" />
                Expected Proceeds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${execution ? execution.total_expected_proceeds.toFixed(2) : '0.00'}
              </div>
              <p className="text-xs text-blue-200 mt-1">Total execution value</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-medium flex items-center">
                <TrendingDown className="w-4 h-4 mr-2 text-yellow-400" />
                Avg Slippage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {execution ? execution.total_expected_slippage.toFixed(2) : '0.00'} bps
              </div>
              <p className="text-xs text-blue-200 mt-1">Expected slippage</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-medium flex items-center">
                <Target className="w-4 h-4 mr-2 text-blue-400" />
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {execution ? (execution.completion_probability * 100).toFixed(1) : '0.0'}%
              </div>
              <p className="text-xs text-blue-200 mt-1">Expected completion</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-medium flex items-center">
                <Zap className="w-4 h-4 mr-2 text-purple-400" />
                Risk Penalty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {execution ? execution.total_risk_penalty.toFixed(6) : '0.000000'}
              </div>
              <p className="text-xs text-blue-200 mt-1">Total risk cost</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="execution" className="space-y-6">
          <TabsList className="bg-white/10 backdrop-blur border-white/20">
            <TabsTrigger value="execution" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Execution Optimizer
            </TabsTrigger>
            <TabsTrigger value="backtest" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Backtesting
            </TabsTrigger>
            <TabsTrigger value="tca" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              TCA Analytics
            </TabsTrigger>
            <TabsTrigger value="venues" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Venues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="execution" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Order Parameters
                  </CardTitle>
                  <CardDescription className="text-blue-200">Configure your execution strategy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">Total Shares</Label>
                    <Input 
                      type="number" 
                      value={totalShares} 
                      onChange={(e) => setTotalShares(e.target.value)}
                      className="bg-white/20 border-white/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Time Horizon (minutes)</Label>
                    <Input 
                      type="number" 
                      value={timeHorizon} 
                      onChange={(e) => setTimeHorizon(e.target.value)}
                      className="bg-white/20 border-white/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Current Price ($)</Label>
                    <Input 
                      type="number" 
                      value={currentPrice} 
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      className="bg-white/20 border-white/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Volatility (annualized)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={volatility} 
                      onChange={(e) => setVolatility(e.target.value)}
                      className="bg-white/20 border-white/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Risk Aversion (λ)</Label>
                    <Input 
                      type="text" 
                      value={riskAversion} 
                      onChange={(e) => setRiskAversion(e.target.value)}
                      className="bg-white/20 border-white/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Terminal Penalty (φ)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={terminalPenalty} 
                      onChange={(e) => setTerminalPenalty(e.target.value)}
                      className="bg-white/20 border-white/30 text-white"
                    />
                  </div>
                  <Button 
                    onClick={optimizeExecution} 
                    disabled={loading}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {loading ? 'Optimizing...' : 'Optimize Execution'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Execution Strategy</CardTitle>
                  <CardDescription className="text-blue-200">MDP-optimized venue allocation over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {execution && execution.execution_steps.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={execution.execution_steps.map(step => ({
                          step: `Step ${step.step}`,
                          inventory: step.inventory_remaining,
                          proceeds: step.expected_proceeds
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                          <XAxis dataKey="step" stroke="#fff" />
                          <YAxis stroke="#fff" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Legend />
                          <Bar dataKey="inventory" fill="#3b82f6" name="Remaining Inventory" />
                          <Bar dataKey="proceeds" fill="#10b981" name="Expected Proceeds" />
                        </BarChart>
                      </ResponsiveContainer>

                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {execution.execution_steps.map((step) => (
                          <div key={step.step} className="bg-white/5 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-white font-semibold">Step {step.step}</h4>
                              <Badge className="bg-blue-500 text-white">
                                {step.time_remaining_minutes} min remaining
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                              <div className="text-blue-200">Inventory: {step.inventory_remaining}</div>
                              <div className="text-blue-200">Proceeds: ${step.expected_proceeds.toFixed(2)}</div>
                            </div>
                            <div className="space-y-1">
                              {step.venue_splits.map((split) => (
                                <div key={split.venue_id} className="flex justify-between text-xs bg-white/5 rounded p-2">
                                  <span className="text-white">{split.venue_name}</span>
                                  <span className="text-blue-200">{split.shares} shares</span>
                                  <span className="text-green-400">{(split.expected_fill_probability * 100).toFixed(1)}% fill</span>
                                  <span className="text-yellow-400">{split.expected_slippage_ticks.toFixed(2)} bps</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-blue-200">
                      Configure parameters and click "Optimize Execution" to see results
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="backtest" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Monte Carlo Backtesting
                </CardTitle>
                <CardDescription className="text-blue-200">Simulate execution across 100 market scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={runBacktest} 
                  disabled={loading}
                  className="mb-6 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {loading ? 'Running Backtest...' : 'Run Backtest (100 scenarios)'}
                </Button>

                {backtest ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 text-sm mb-1">Avg Proceeds</div>
                        <div className="text-white text-2xl font-bold">${backtest.avg_proceeds.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 text-sm mb-1">Avg Slippage</div>
                        <div className="text-white text-2xl font-bold">{backtest.avg_slippage.toFixed(2)} bps</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 text-sm mb-1">Completion Rate</div>
                        <div className="text-white text-2xl font-bold">{(backtest.completion_rate * 100).toFixed(1)}%</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 text-sm mb-1">Avg Time</div>
                        <div className="text-white text-2xl font-bold">{backtest.avg_completion_time.toFixed(1)} min</div>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={backtest.scenarios.map(s => ({
                        scenario: s.scenario_id,
                        proceeds: s.final_proceeds,
                        slippage: s.total_slippage
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis dataKey="scenario" stroke="#fff" />
                        <YAxis stroke="#fff" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="proceeds" stroke="#10b981" name="Final Proceeds" />
                        <Line type="monotone" dataKey="slippage" stroke="#f59e0b" name="Total Slippage" />
                      </LineChart>
                    </ResponsiveContainer>

                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3">Sample Scenarios</h4>
                      <div className="space-y-2">
                        {backtest.scenarios.slice(0, 5).map((scenario) => (
                          <div key={scenario.scenario_id} className="flex justify-between text-sm bg-white/5 rounded p-2">
                            <span className="text-blue-200">Scenario {scenario.scenario_id}</span>
                            <span className="text-white">${scenario.final_proceeds.toFixed(2)}</span>
                            <span className="text-yellow-400">{scenario.total_slippage.toFixed(2)} bps</span>
                            <span className="text-green-400">{scenario.completion_time_minutes} min</span>
                            <span className="text-red-400">{scenario.leftover_shares} left</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-blue-200">
                    Click "Run Backtest" to simulate execution across multiple scenarios
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tca" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Transaction Cost Analysis
                </CardTitle>
                <CardDescription className="text-blue-200">Real-time execution quality metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={fetchTCA} 
                  disabled={loading}
                  className="mb-6 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {loading ? 'Analyzing...' : 'Generate TCA Report'}
                </Button>

                {tca ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 text-sm mb-1">Implementation Shortfall</div>
                        <div className="text-white text-xl font-bold">${tca.implementation_shortfall.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 text-sm mb-1">Arrival Cost</div>
                        <div className="text-white text-xl font-bold">{tca.arrival_cost.toFixed(2)} bps</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 text-sm mb-1">Total Slippage</div>
                        <div className="text-white text-xl font-bold">{tca.slippage_bps.toFixed(2)} bps</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 text-sm mb-1">Market Impact</div>
                        <div className="text-white text-xl font-bold">{tca.market_impact_bps.toFixed(2)} bps</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-blue-200 text-sm mb-1">Timing Cost</div>
                        <div className="text-white text-xl font-bold">{tca.timing_cost_bps.toFixed(2)} bps</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-white font-semibold mb-3">Cost Breakdown</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Market Impact', value: tca.market_impact_bps },
                                { name: 'Timing Cost', value: tca.timing_cost_bps }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry) => `${entry.name}: ${entry.value.toFixed(2)} bps`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[0, 1].map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div>
                        <h4 className="text-white font-semibold mb-3">Venue Efficiency</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={Object.entries(tca.venue_efficiency).map(([name, value]) => ({
                            name: name.replace('_', ' '),
                            efficiency: (value * 100)
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                            <XAxis dataKey="name" stroke="#fff" angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="#fff" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                              labelStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="efficiency" fill="#10b981" name="Fill Rate %" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-blue-200">
                    Click "Generate TCA Report" to analyze execution quality
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="venues" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Trading Venues</CardTitle>
                <CardDescription className="text-blue-200">Available execution venues and their characteristics</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={fetchVenues} 
                  className="mb-6 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Load Venues
                </Button>

                {venues.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {venues.map((venue) => (
                      <div key={venue.id} className="bg-white/5 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-white font-semibold text-lg">{venue.name}</h4>
                            <Badge className="bg-blue-500 text-white mt-1">{venue.type.replace('_', ' ')}</Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 text-sm">{venue.latency_ms}ms</div>
                            <div className="text-blue-200 text-xs">latency</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-blue-200">Depth</div>
                            <div className="text-white font-semibold">{venue.depth.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-blue-200">Spread</div>
                            <div className="text-white font-semibold">{venue.spread} ticks</div>
                          </div>
                          <div>
                            <div className="text-blue-200">Fee Rate</div>
                            <div className="text-white font-semibold">{(venue.fee_rate * 100).toFixed(2)}%</div>
                          </div>
                          <div>
                            <div className="text-blue-200">Rebate Rate</div>
                            <div className="text-white font-semibold">{(venue.rebate_rate * 100).toFixed(2)}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-blue-200">
                    Click "Load Venues" to see available trading venues
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center">
          <p className="text-blue-200 text-sm">
            Powered by Markov Decision Processes & Reinforcement Learning
          </p>
          <p className="text-blue-300 text-xs mt-1">
            OptiTrade AI - Empowering traders to execute smarter, faster, and more efficiently
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
