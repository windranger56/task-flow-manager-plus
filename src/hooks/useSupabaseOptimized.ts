import { useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/supabase/client';

interface BatchRequest {
  table: string;
  select: string;
  filters: Record<string, any>;
  resolver: (data: any) => void;
  rejector: (error: any) => void;
}

export function useSupabaseOptimized() {
  // Батчинг запросов
  const batchQueue = useRef<BatchRequest[]>([]);
  const batchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Кэш запросов
  const queryCache = useMemo(() => new Map<string, { data: any; timestamp: number }>(), []);
  const CACHE_DURATION = 30000; // 30 секунд
  
  // Генерация ключа кэша
  const getCacheKey = useCallback((table: string, select: string, filters: Record<string, any>) => {
    return `${table}:${select}:${JSON.stringify(filters)}`;
  }, []);
  
  // Проверка актуальности кэша
  const isCacheValid = useCallback((timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  }, []);
  
  // Выполнение батча запросов
  const executeBatch = useCallback(async () => {
    if (batchQueue.current.length === 0) return;
    
    const requests = [...batchQueue.current];
    batchQueue.current = [];
    
    // Группируем запросы по таблицам
    const groupedRequests = requests.reduce((acc, req) => {
      if (!acc[req.table]) acc[req.table] = [];
      acc[req.table].push(req);
      return acc;
    }, {} as Record<string, BatchRequest[]>);
    
    // Выполняем запросы по таблицам
    for (const [table, reqs] of Object.entries(groupedRequests)) {
      try {
        // Если запросы одинаковые, объединяем их
        const uniqueRequests = reqs.reduce((acc, req) => {
          const key = `${req.select}:${JSON.stringify(req.filters)}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(req);
          return acc;
        }, {} as Record<string, BatchRequest[]>);
        
        for (const [, sameRequests] of Object.entries(uniqueRequests)) {
          const firstReq = sameRequests[0];
          
          let query = supabase.from(table).select(firstReq.select);
          
          // Применяем фильтры
          Object.entries(firstReq.filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          });
          
          const { data, error } = await query;
          
          // Возвращаем результат всем запросам
          sameRequests.forEach(req => {
            if (error) {
              req.rejector(error);
            } else {
              req.resolver(data);
              
              // Кэшируем результат
              const cacheKey = getCacheKey(table, req.select, req.filters);
              queryCache.set(cacheKey, { data, timestamp: Date.now() });
            }
          });
        }
      } catch (error) {
        // В случае ошибки отклоняем все запросы
        reqs.forEach(req => req.rejector(error));
      }
    }
  }, [getCacheKey, queryCache]);
  
  // Оптимизированный запрос
  const optimizedQuery = useCallback(async (
    table: string,
    select: string = '*',
    filters: Record<string, any> = {}
  ) => {
    const cacheKey = getCacheKey(table, select, filters);
    
    // Проверяем кэш
    const cached = queryCache.get(cacheKey);
    if (cached && isCacheValid(cached.timestamp)) {
      return Promise.resolve(cached.data);
    }
    
    return new Promise((resolve, reject) => {
      // Добавляем в очередь
      batchQueue.current.push({
        table,
        select,
        filters,
        resolver: resolve,
        rejector: reject
      });
      
      // Планируем выполнение батча
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }
      
      batchTimeout.current = setTimeout(executeBatch, 10); // Батчим запросы в течение 10ms
    });
  }, [getCacheKey, queryCache, isCacheValid, executeBatch]);
  
  // Массовый запрос пользователей
  const batchGetUsers = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return [];
    
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    
    // Проверяем, какие пользователи уже в кэше
    const cachedUsers: any[] = [];
    const uncachedIds: string[] = [];
    
    uniqueIds.forEach(id => {
      const cacheKey = getCacheKey('users', '*', { id });
      const cached = queryCache.get(cacheKey);
      
      if (cached && isCacheValid(cached.timestamp)) {
        cachedUsers.push(...(Array.isArray(cached.data) ? cached.data : [cached.data]));
      } else {
        uncachedIds.push(id);
      }
    });
    
    // Запрашиваем недостающих пользователей
    if (uncachedIds.length > 0) {
      const freshUsers = await optimizedQuery('users', '*', { id: uncachedIds });
      return [...cachedUsers, ...(Array.isArray(freshUsers) ? freshUsers : [freshUsers])];
    }
    
    return cachedUsers;
  }, [getCacheKey, queryCache, isCacheValid, optimizedQuery]);
  
  // Очистка кэша
  const clearCache = useCallback(() => {
    queryCache.clear();
  }, [queryCache]);
  
  // Статистика кэша
  const getCacheStats = useCallback(() => {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    queryCache.forEach(({ timestamp }) => {
      if (isCacheValid(timestamp)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });
    
    return {
      totalEntries: queryCache.size,
      validEntries,
      expiredEntries,
      hitRate: validEntries / (validEntries + expiredEntries) || 0
    };
  }, [queryCache, isCacheValid]);
  
  return {
    optimizedQuery,
    batchGetUsers,
    clearCache,
    getCacheStats,
    cacheSize: queryCache.size
  };
} 