import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  dbQueries: number;
  cacheHits: number;
  cacheMisses: number;
  componentRenders: number;
  memoryUsage: number;
  fps: number;
}

interface PerformanceStats {
  current: PerformanceMetrics;
  average: PerformanceMetrics;
  peak: PerformanceMetrics;
  history: PerformanceMetrics[];
}

export function usePerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats>({
    current: {
      renderTime: 0,
      dbQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      componentRenders: 0,
      memoryUsage: 0,
      fps: 60
    },
    average: {
      renderTime: 0,
      dbQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      componentRenders: 0,
      memoryUsage: 0,
      fps: 60
    },
    peak: {
      renderTime: 0,
      dbQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      componentRenders: 0,
      memoryUsage: 0,
      fps: 60
    },
    history: []
  });
  
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    dbQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    componentRenders: 0,
    memoryUsage: 0,
    fps: 60
  });
  
  const startTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  
  // Измерение FPS
  const measureFPS = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastFrameTimeRef.current >= 1000) {
      metricsRef.current.fps = Math.round(frameCountRef.current * 1000 / (now - lastFrameTimeRef.current));
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
    
    requestAnimationFrame(measureFPS);
  }, []);
  
  // Измерение памяти
  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metricsRef.current.memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    }
  }, []);
  
  // Начало измерения времени рендера
  const startRenderMeasure = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);
  
  // Конец измерения времени рендера
  const endRenderMeasure = useCallback(() => {
    if (startTimeRef.current > 0) {
      metricsRef.current.renderTime = performance.now() - startTimeRef.current;
      metricsRef.current.componentRenders++;
      startTimeRef.current = 0;
    }
  }, []);
  
  // Учет запроса к БД
  const recordDbQuery = useCallback(() => {
    metricsRef.current.dbQueries++;
  }, []);
  
  // Учет попадания в кэш
  const recordCacheHit = useCallback(() => {
    metricsRef.current.cacheHits++;
  }, []);
  
  // Учет промаха кэша
  const recordCacheMiss = useCallback(() => {
    metricsRef.current.cacheMisses++;
  }, []);
  
  // Обновление статистики
  const updateStats = useCallback(() => {
    measureMemory();
    
    const current = { ...metricsRef.current };
    
    setStats(prevStats => {
      const newHistory = [...prevStats.history, current];
      if (newHistory.length > 100) {
        newHistory.shift();
      }
      
      // Вычисляем средние значения
      const average = newHistory.reduce((acc, metrics) => {
        Object.keys(acc).forEach(key => {
          acc[key as keyof PerformanceMetrics] += metrics[key as keyof PerformanceMetrics] / newHistory.length;
        });
        return acc;
      }, {
        renderTime: 0,
        dbQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        componentRenders: 0,
        memoryUsage: 0,
        fps: 0
      });
      
      // Вычисляем пиковые значения
      const peak = newHistory.reduce((acc, metrics) => {
        Object.keys(acc).forEach(key => {
          const value = metrics[key as keyof PerformanceMetrics];
          if (value > acc[key as keyof PerformanceMetrics]) {
            acc[key as keyof PerformanceMetrics] = value;
          }
        });
        return acc;
      }, { ...current });
      
      return {
        current,
        average,
        peak,
        history: newHistory
      };
    });
    
    // Сбрасываем счетчики
    metricsRef.current = {
      renderTime: 0,
      dbQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      componentRenders: 0,
      memoryUsage: current.memoryUsage,
      fps: current.fps
    };
  }, [measureMemory]);
  
  // Получение отчета о производительности
  const getPerformanceReport = useCallback(() => {
    const { current, average, peak } = stats;
    
    return {
      summary: {
        overallScore: Math.max(0, 100 - (
          (average.renderTime > 16 ? 20 : 0) +
          (average.fps < 50 ? 20 : 0) +
          (average.memoryUsage > 100 ? 15 : 0) +
          (average.dbQueries > 10 ? 15 : 0) +
          ((average.cacheHits / (average.cacheHits + average.cacheMisses)) < 0.8 ? 10 : 0)
        )),
        issues: [
          ...(average.renderTime > 16 ? ['Медленный рендеринг'] : []),
          ...(average.fps < 50 ? ['Низкий FPS'] : []),
          ...(average.memoryUsage > 100 ? ['Высокое потребление памяти'] : []),
          ...(average.dbQueries > 10 ? ['Слишком много запросов к БД'] : []),
          ...((average.cacheHits / (average.cacheHits + average.cacheMisses)) < 0.8 ? ['Низкий процент попаданий в кэш'] : [])
        ]
      },
      metrics: {
        current,
        average,
        peak
      },
      recommendations: [
        ...(average.renderTime > 16 ? ['Используйте React.memo для тяжелых компонентов'] : []),
        ...(average.fps < 50 ? ['Оптимизируйте анимации и скроллинг'] : []),
        ...(average.memoryUsage > 100 ? ['Проверьте утечки памяти'] : []),
        ...(average.dbQueries > 10 ? ['Используйте батчинг запросов'] : []),
        ...((average.cacheHits / (average.cacheHits + average.cacheMisses)) < 0.8 ? ['Увеличьте время жизни кэша'] : [])
      ]
    };
  }, [stats]);
  
  // Инициализация мониторинга
  useEffect(() => {
    lastFrameTimeRef.current = performance.now();
    requestAnimationFrame(measureFPS);
    
    const interval = setInterval(updateStats, 5000); // Обновляем статистику каждые 5 секунд
    
    return () => {
      clearInterval(interval);
    };
  }, [measureFPS, updateStats]);
  
  return {
    stats,
    startRenderMeasure,
    endRenderMeasure,
    recordDbQuery,
    recordCacheHit,
    recordCacheMiss,
    getPerformanceReport
  };
} 