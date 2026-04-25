import { GardenColors } from '@/constants/theme';
import { getClientJobInvoice, getGardenerJobInvoice } from '@/services/api';
import { documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

type InvoiceViewerProps = {
  visible: boolean
  jobId: string
  invoiceNumber?: string
  token: string
  isGardener: boolean
  onClose: () => void
}

export default function InvoiceViewer({
  visible, jobId, invoiceNumber, token, isGardener, onClose,
}: InvoiceViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadAndOpen = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the PDF as base64
      const base64Data = isGardener
        ? await getGardenerJobInvoice(token, jobId)
        : await getClientJobInvoice(token, jobId);

      // Create a filename for the PDF
      const filename = `${invoiceNumber || jobId}.pdf`;
      const fileUri = `${documentDirectory}${filename}`;

      // Write the base64 data to a file using legacy API
      await writeAsStringAsync(fileUri, base64Data, { encoding: 'base64' });

      // Open the PDF with the system PDF viewer
      await Linking.openURL(fileUri);

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download invoice';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [jobId, token, invoiceNumber, isGardener, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Invoice</Text>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <Text style={styles.message}>
              {loading ? 'Downloading invoice...' : 'Download and open invoice PDF'}
            </Text>
          )}

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator color={GardenColors.accent} size="large" />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.downloadButton]}
                  onPress={handleDownloadAndOpen}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>Download & Open</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    minHeight: 280,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: GardenColors.textPrimary,
  },
  message: {
    fontSize: 14,
    color: GardenColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    minHeight: 40,
  },
  error: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 48,
  },
  downloadButton: {
    backgroundColor: GardenColors.accent,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  buttonText: {
    color: '#071108',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
});
