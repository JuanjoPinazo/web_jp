'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ContentBlock {
  key: string;
  value: string;
}

export const useContent = () => {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_blocks')
        .select('key, value');

      if (error) {
         // Silently fail if table doesn't exist yet, we'll use fallbacks
         console.warn('Content blocks not loaded from Supabase. Using fallbacks.');
         return;
      }

      if (data) {
        const contentMap = data.reduce((acc: Record<string, string>, item: ContentBlock) => {
          acc[item.key] = item.value;
          return acc;
        }, {});
        setContent(contentMap);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const getContent = (key: string, defaultValue: string) => {
    return content[key] || defaultValue;
  };

  return {
    content,
    loading,
    error,
    getContent,
    refreshContent: fetchContent
  };
};
