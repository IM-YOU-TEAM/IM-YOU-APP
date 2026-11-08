import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type CarePatient = {
  id: string;
  careCode: string;
  linked: boolean;
};

export function useCareRoster() {
  const [patients, setPatients] = useState<CarePatient[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('patients')
      .select('id, care_code, owner_link')
      .order('created_at', { ascending: false });
    setPatients(
      (data ?? []).map((row) => ({
        id: row.id as string,
        careCode: row.care_code as string,
        linked: row.owner_link != null,
      })),
    );
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { patients, ready, reload };
}

export function useCarePatient(patientId: string | undefined) {
  const [patient, setPatient] = useState<CarePatient | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      setReady(true);
      return;
    }
    let current = true;
    setReady(false);
    supabase
      .from('patients')
      .select('id, care_code, owner_link')
      .eq('id', patientId)
      .maybeSingle()
      .then(({ data }) => {
        if (!current) return;
        setPatient(
          data
            ? {
                id: data.id as string,
                careCode: data.care_code as string,
                linked: data.owner_link != null,
              }
            : null,
        );
        setReady(true);
      });
    return () => {
      current = false;
    };
  }, [patientId]);

  return { patient, ready };
}
