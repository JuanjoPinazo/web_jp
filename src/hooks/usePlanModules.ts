'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface PlanModule {
  module_id: string;
  name: string;
  icon: string;
  is_enabled: boolean;
}

export const usePlanModules = () => {
  const [loading, setLoading] = useState(false);

  const getEnabledModules = useCallback(async (planId: string): Promise<Record<string, boolean>> => {
    if (!planId) return {};
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plan_modules')
        .select('module_id, is_enabled')
        .eq('plan_id', planId);

      if (error) throw error;

      // Convert to a record for easy access: { flights: true, hotels: false, ... }
      const moduleMap: Record<string, boolean> = {};
      data.forEach(m => {
        moduleMap[m.module_id] = m.is_enabled;
      });

      return moduleMap;
    } catch (err) {
      console.error('Error fetching plan modules:', err);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleModule = async (planId: string, moduleId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('plan_modules')
        .upsert({
          plan_id: planId,
          module_id: moduleId,
          is_enabled: enabled
        }, { onConflict: 'plan_id,module_id' });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error toggling module:', err);
      return false;
    }
  };

  return {
    loading,
    getEnabledModules,
    toggleModule
  };
};
