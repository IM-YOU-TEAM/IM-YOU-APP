import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer, Text } from '@/components';
import { getPatient } from '@/lib/data';

// Placeholder: replaced by the screen build.
export default function PatientDetailScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const patient = getPatient(patientId);
  return (
    <ScreenContainer>
      <Text variant="display">{patient?.name ?? 'Patient not found'}</Text>
    </ScreenContainer>
  );
}
