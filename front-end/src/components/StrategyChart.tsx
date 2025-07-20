import React, { useEffect, useState, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as massa from '@massalabs/massa-web3';

interface StrategyChartProps {
  provider: massa.JsonRpcProvider;
  addresses: Record<string, string>;
  isActive: boolean;
}

interface ChartData {
  time: string[];
  prices: number[];
  actions: { time: string; action: string; value: number }[];
}

function StrategyChart({ provider, addresses, isActive }: StrategyChartProps) {
  const [chartData, setChartData] = useState<ChartData>({
    time: [],
    prices: [],
    actions: []
  });
  const pollerRef = useRef<{ stopPolling: () => void } | null>(null);

  useEffect(() => {
    if (!addresses.oracle || !addresses.strategy) return;

    loadHistoricalData();
    
    if (isActive) {
      startEventPolling();
    }

    return () => {
      if (pollerRef.current) {
        pollerRef.current.stopPolling();
      }
    };
  }, [addresses, isActive]);

  const loadHistoricalData = async () => {
    try {
      const events = await provider.getEvents({
        smartContractAddress: addresses.oracle,
        isFinal: true
      });

      const priceEvents = events.filter(e => 
        e.data && e.data.includes && e.data.includes('Price updated')
      );
      
      const strategyEvents = addresses.strategy ? await provider.getEvents({
        smartContractAddress: addresses.strategy,
        isFinal: true
      }) : [];

      processEvents(priceEvents, strategyEvents);
    } catch (error) {
      console.error('Failed to load historical data:', error);
    }
  };

  const startEventPolling = () => {
    const onData = (events: massa.SCEvent[]) => {
      const priceEvents = events.filter(e => 
        e.data && e.data.includes && e.data.includes('Price updated') && 
        e.context.callee === addresses.oracle
      );
      
      const strategyEvents = events.filter(e => 
        e.data && e.data.includes && e.data.includes('Strategy executed') && 
        e.context.callee === addresses.strategy
      );

      if (priceEvents.length > 0 || strategyEvents.length > 0) {
        processEvents(priceEvents, strategyEvents);
      }
    };

    const onError = (error: Error) => {
      console.error('Event polling error:', error);
    };

    try {
      pollerRef.current = massa.EventPoller.start(
        provider,
        { smartContractAddress: addresses.oracle },
        onData,
        onError,
        5000
      );
    } catch (error) {
      console.error('Failed to start event polling:', error);
    }
  };

  const processEvents = async (priceEvents: massa.SCEvent[], strategyEvents: massa.SCEvent[]) => {
    const newData = { ...chartData };

    for (const event of priceEvents) {
      try {
        if (!addresses.oracle) continue;
        
        const oracleContract = new massa.SmartContract(provider, addresses.oracle);
        const priceResult = await oracleContract.read('getPrice');
        const priceValue = new massa.Args(priceResult.value).nextU64();
        const price = Number(priceValue) / 1_000_000;
        const timestamp = new Date().toLocaleTimeString();

        if (newData.time.length > 50) {
          newData.time.shift();
          newData.prices.shift();
        }

        newData.time.push(timestamp);
        newData.prices.push(price);
      } catch (error) {
        console.error('Failed to process price event:', error);
      }
    }

    for (const event of strategyEvents) {
      try {
        if (!addresses.oracle) continue;
        
        const oracleContract = new massa.SmartContract(provider, addresses.oracle);
        const priceResult = await oracleContract.read('getPrice');
        const priceValue = new massa.Args(priceResult.value).nextU64();
        const price = Number(priceValue) / 1_000_000;
        const timestamp = new Date().toLocaleTimeString();

        newData.actions.push({ 
          time: timestamp, 
          action: 'rebalance', 
          value: price 
        });
        
        if (newData.actions.length > 20) {
          newData.actions.shift();
        }
      } catch (error) {
        console.error('Failed to process strategy event:', error);
      }
    }

    setChartData(newData);
  };

  const getChartOption = () => {
    return {
      backgroundColor: 'transparent',
      grid: {
        top: 40,
        left: 60,
        right: 40,
        bottom: 60
      },
      xAxis: {
        type: 'category',
        data: chartData.time,
        axisLine: { lineStyle: { color: '#666' } },
        axisLabel: { color: '#999' }
      },
      yAxis: {
        type: 'value',
        name: 'Price ($)',
        nameTextStyle: { color: '#999' },
        axisLine: { lineStyle: { color: '#666' } },
        axisLabel: { color: '#999' },
        splitLine: { lineStyle: { color: '#333' } }
      },
      series: [
        {
          name: 'TWAP',
          type: 'line',
          data: chartData.prices,
          smooth: true,
          lineStyle: { color: '#00ff88', width: 2 },
          itemStyle: { color: '#00ff88' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 255, 136, 0.3)' },
                { offset: 1, color: 'rgba(0, 255, 136, 0.05)' }
              ]
            }
          },
          markPoint: {
            data: chartData.actions.map(action => ({
              coord: [action.time, action.value],
              value: action.action,
              itemStyle: {
                color: action.action.includes('up') ? '#ff006e' : '#00ccff'
              }
            })),
            symbol: 'pin',
            symbolSize: 40,
            label: {
              fontSize: 10,
              color: '#fff'
            }
          }
        }
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333',
        textStyle: { color: '#fff' }
      }
    };
  };

  return (
    <div className="chart-container">
      {chartData.prices.length > 0 ? (
        <ReactECharts 
          option={getChartOption()} 
          style={{ height: '100%', width: '100%' }}
          theme="dark"
        />
      ) : (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: 'var(--text-secondary)'
        }}>
          {isActive ? 'Waiting for data...' : 'Strategy not active'}
        </div>
      )}
    </div>
  );
}

export default StrategyChart;