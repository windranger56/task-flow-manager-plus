import React, { memo, useState } from 'react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Activity, Database, HardDrive, Zap } from 'lucide-react';

const PerformanceStats = memo(() => {
  const { stats, getPerformanceReport } = usePerformanceMonitor();
  const [isOpen, setIsOpen] = useState(false);
  const report = getPerformanceReport();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatNumber = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Не показываем в продакшене
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm border shadow-lg"
          >
            <Activity className="h-4 w-4 mr-2" />
            Performance
            <Badge className={`ml-2 text-white ${getScoreColor(report.summary.overallScore)}`}>
              {Math.round(report.summary.overallScore)}
            </Badge>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <Card className="mt-2 w-80 bg-white/95 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                Статистика производительности
              </CardTitle>
              <CardDescription className="text-xs">
                Общий балл: {Math.round(report.summary.overallScore)}/100
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Текущие метрики */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-blue-500" />
                  <span>Рендер: {formatNumber(stats.current.renderTime)}ms</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-green-500" />
                  <span>FPS: {stats.current.fps}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3 text-purple-500" />
                  <span>БД: {stats.current.dbQueries}</span>
                </div>
                <div className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3 text-orange-500" />
                  <span>RAM: {stats.current.memoryUsage}MB</span>
                </div>
              </div>

              {/* Кэш статистика */}
              {(stats.current.cacheHits + stats.current.cacheMisses) > 0 && (
                <div className="text-xs">
                  <div className="flex justify-between">
                    <span>Кэш попаданий:</span>
                    <span>{Math.round((stats.current.cacheHits / (stats.current.cacheHits + stats.current.cacheMisses)) * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Средние значения */}
              <div className="border-t pt-2">
                <div className="text-xs font-medium mb-1">Средние значения:</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <span>Рендер: {formatNumber(stats.average.renderTime)}ms</span>
                  <span>FPS: {Math.round(stats.average.fps)}</span>
                  <span>БД: {Math.round(stats.average.dbQueries)}</span>
                  <span>RAM: {Math.round(stats.average.memoryUsage)}MB</span>
                </div>
              </div>

              {/* Проблемы */}
              {report.summary.issues.length > 0 && (
                <div className="border-t pt-2">
                  <div className="text-xs font-medium mb-1 text-red-600">Проблемы:</div>
                  <div className="space-y-1">
                    {report.summary.issues.map((issue, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {issue}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Рекомендации */}
              {report.recommendations.length > 0 && (
                <div className="border-t pt-2">
                  <div className="text-xs font-medium mb-1 text-blue-600">Рекомендации:</div>
                  <div className="space-y-1">
                    {report.recommendations.slice(0, 2).map((rec, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-blue-50 p-1 rounded">
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});

PerformanceStats.displayName = 'PerformanceStats';

export default PerformanceStats; 