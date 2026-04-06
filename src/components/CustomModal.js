import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';

const CustomModal = ({ 
  visible, 
  title = 'Title', 
  message = 'Message', 
  onConfirm, 
  onCancel 
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalMessage}>{message}</Text>
              <View style={styles.modalButtons}>
          
          <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={onConfirm}
                >
                  <Text style={styles.modalButtonText}>Yes</Text>
                </TouchableOpacity>


                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={onCancel}
                >
                  <Text style={styles.modalButtonText}>No</Text>
                </TouchableOpacity>


                

              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default CustomModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(34, 31, 31, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#000',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#555',
  },
  confirmButton: {
    backgroundColor: '#e61212',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});