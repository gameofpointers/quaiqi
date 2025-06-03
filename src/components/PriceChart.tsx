import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQiPriceHistory } from "@/services/priceService";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";

interface ChartData {
  timestamp: number;
  price: number;
}

export function PriceChart() {
  const [priceData, setPriceData] = useState<ChartData[]>([]);
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");

  useEffect(() => {
    const fetchData = async () => {
      const data = await getQiPriceHistory();
      // Sort data by timestamp in ascending order
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
      setPriceData(sortedData);
    };

    // Initial load of data
    fetchData();
    
    // Set up interval to update chart data
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Function to format timestamps on X axis
  const formatXAxis = (timestamp: number) => {
    return format(new Date(timestamp), "HH:mm");
  };
  
  // Filter data based on time range
  const getFilteredData = () => {
    if (!priceData.length) return [];
    
    const now = Date.now();
    let cutoffTime;

    switch (timeRange) {
      case "1h":
        cutoffTime = now - 3600000; // 1 hour in ms
        break;
      case "7d":
        cutoffTime = now - 604800000; // 7 days in ms
        break;
      case "30d":
        cutoffTime = now - 2592000000; // 30 days in ms
        break;
      case "24h":
      default:
        cutoffTime = now - 86400000; // 24 hours in ms
    }

    return priceData.filter(data => data.timestamp >= cutoffTime);
  };

  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-2 rounded-md shadow-md text-sm">
          <p className="font-medium">{format(new Date(label), "MMM dd, HH:mm")}</p>
          <p className="text-accent">QI Price: ${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  const filteredData = getFilteredData();

  return (
    <Card className="w-full h-[400px] card-glow">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">QI Price History</CardTitle>
          <div className="flex space-x-2">
            <Button active={timeRange === "1h"} onClick={() => setTimeRange("1h")}>1H</Button>
            <Button active={timeRange === "24h"} onClick={() => setTimeRange("24h")}>24H</Button>
            <Button active={timeRange === "7d"} onClick={() => setTimeRange("7d")}>7D</Button>
            <Button active={timeRange === "30d"} onClick={() => setTimeRange("30d")}>30D</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 h-[340px]">
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatXAxis}
                stroke="currentColor" 
                opacity={0.5}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                stroke="currentColor"
                opacity={0.5}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="price" 
                strokeWidth={2}
                stroke="hsl(var(--accent))" 
                dot={false}
                activeDot={{ r: 6, stroke: "hsl(var(--accent))", strokeWidth: 2, fill: "hsl(var(--background))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Collecting QI price data...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Button({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-md transition-colors ${
        active 
          ? "bg-primary text-primary-foreground" 
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
      }`}
    >
      {children}
    </button>
  );
}
