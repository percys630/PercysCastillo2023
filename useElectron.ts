import { useEffect, useCallback } from 'react';

declare global {
  interface Window {
    electronAPI?: {
      saveFile: (data: any, filename: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      printReceipt: (receiptData: any) => Promise<{ success: boolean; error?: string }>;
      getAppInfo: () => Promise<any>;
      onNavigateToModule: (callback: (module: string) => void) => void;
      onNavigateToSettings: (callback: () => void) => void;
      onGenerateReport: (callback: () => void) => void;
      onExportData: (callback: () => void) => void;
      onShowHelp: (callback: () => void) => void;
      onBackupData: (callback: (filePath: string) => void) => void;
      onRestoreData: (callback: (filePath: string) => void) => void;
      removeAllListeners: (channel: string) => void;
      platform: string;
      isElectron: boolean;
    };
  }
}

export const useElectron = () => {
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

  // File operations
  const saveFile = useCallback(async (data: any, filename: string) => {
    if (!isElectron) {
      // Fallback for web - trigger download
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    }
    
    return window.electronAPI!.saveFile(data, filename);
  }, [isElectron]);

  // Print operations
  const printReceipt = useCallback(async (receiptData: any) => {
    if (!isElectron) {
      // Fallback for web - open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(generateReceiptHTML(receiptData));
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
      return { success: true };
    }
    
    return window.electronAPI!.printReceipt(receiptData);
  }, [isElectron]);

  // Get app info
  const getAppInfo = useCallback(async () => {
    if (!isElectron) {
      return {
        version: '1.0.0',
        platform: 'web',
        arch: 'unknown',
        electronVersion: 'N/A',
        nodeVersion: 'N/A'
      };
    }
    
    return window.electronAPI!.getAppInfo();
  }, [isElectron]);

  // Setup electron event listeners
  const setupElectronListeners = useCallback((handlers: {
    onNavigateToModule?: (module: string) => void;
    onNavigateToSettings?: () => void;
    onGenerateReport?: () => void;
    onExportData?: () => void;
    onShowHelp?: () => void;
    onBackupData?: (filePath: string) => void;
    onRestoreData?: (filePath: string) => void;
  }) => {
    if (!isElectron) return;

    const electronAPI = window.electronAPI!;

    if (handlers.onNavigateToModule) {
      electronAPI.onNavigateToModule(handlers.onNavigateToModule);
    }
    if (handlers.onNavigateToSettings) {
      electronAPI.onNavigateToSettings(handlers.onNavigateToSettings);
    }
    if (handlers.onGenerateReport) {
      electronAPI.onGenerateReport(handlers.onGenerateReport);
    }
    if (handlers.onExportData) {
      electronAPI.onExportData(handlers.onExportData);
    }
    if (handlers.onShowHelp) {
      electronAPI.onShowHelp(handlers.onShowHelp);
    }
    if (handlers.onBackupData) {
      electronAPI.onBackupData(handlers.onBackupData);
    }
    if (handlers.onRestoreData) {
      electronAPI.onRestoreData(handlers.onRestoreData);
    }

    // Cleanup function
    return () => {
      electronAPI.removeAllListeners('navigate-to-module');
      electronAPI.removeAllListeners('navigate-to-settings');
      electronAPI.removeAllListeners('generate-report');
      electronAPI.removeAllListeners('export-data');
      electronAPI.removeAllListeners('show-help');
      electronAPI.removeAllListeners('backup-data');
      electronAPI.removeAllListeners('restore-data');
    };
  }, [isElectron]);

  return {
    isElectron,
    saveFile,
    printReceipt,
    getAppInfo,
    setupElectronListeners,
    platform: isElectron ? window.electronAPI!.platform : 'web'
  };
};

// Helper function for receipt HTML generation
const generateReceiptHTML = (receiptData: any) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
        .item { display: flex; justify-content: space-between; margin: 2px 0; }
        .total { border-top: 1px dashed #000; padding-top: 5px; margin-top: 10px; font-weight: bold; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h3>PetCare Store</h3>
        <p>${receiptData.branch}</p>
        <p>${new Date(receiptData.timestamp).toLocaleString()}</p>
        <p>Transaction: ${receiptData.id}</p>
      </div>
      
      <div class="items">
        ${receiptData.items.map((item: any) => `
          <div class="item">
            <span>${item.name} x${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="total">
        <div class="item">
          <span>Subtotal:</span>
          <span>$${receiptData.subtotal.toFixed(2)}</span>
        </div>
        ${receiptData.discount > 0 ? `
          <div class="item">
            <span>Discount (${receiptData.discount}%):</span>
            <span>-$${(receiptData.subtotal * receiptData.discount / 100).toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="item">
          <span>TOTAL:</span>
          <span>$${receiptData.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Cashier: ${receiptData.cashier}</p>
      </div>
    </body>
    </html>
  `;
};