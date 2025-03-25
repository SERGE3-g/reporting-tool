// electron-export.js - Integration for the Electron app

/**
 * Add this to your main.js file to handle PDF export in Electron
 */

// Add these imports at the top of your main.js file
const fs = require('fs');
const { ipcMain, dialog } = require('electron');
const path = require('path');

/**
 * Setup IPC handlers for export functions
 * Add this to your setupIpcHandlers function
 */
function setupExportHandlers() {
  // Handler for PDF export
  ipcMain.handle('report:savePdf', async (event, { data, defaultFilename }) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: defaultFilename || 'Report_Commissioni.pdf',
        filters: [
          { name: 'PDF', extensions: ['pdf'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });

      if (result.canceled) return { success: false, message: 'Operazione annullata.' };

      // Save the PDF buffer to file
      fs.writeFileSync(result.filePath, Buffer.from(data));
      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('Error saving PDF:', error);
      return { success: false, message: error.message };
    }
  });

  // Enhanced XLSX export handler
  ipcMain.handle('report:saveXlsx', async (event, { data, defaultFilename, options }) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: defaultFilename || 'Report_Commissioni.xlsx',
        filters: [
          { name: 'Excel', extensions: ['xlsx'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });

      if (result.canceled) return { success: false, message: 'Operazione annullata.' };

      // Here 'data' should be a buffer containing the Excel file
      fs.writeFileSync(result.filePath, Buffer.from(data));
      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('Error saving Excel file:', error);
      return { success: false, message: error.message };
    }
  });
}

/**
 * Add this to your preload.js file to expose PDF export functionality to renderer
 */
function addExportPreloads() {
  // Add these to your contextBridge.exposeInMainWorld('reportingTool', {}) object
  /*
  // Salva il report in formato PDF
  savePdfReport: async (data, defaultFilename, options) => {
    return await ipcRenderer.invoke('report:savePdf', { data, defaultFilename, options });
  },

  // Versione migliorata per salvare report in formato XLSX
  saveXlsxReportEnhanced: async (data, defaultFilename, options) => {
    return await ipcRenderer.invoke('report:saveXlsx', { data, defaultFilename, options });
  }
  */
}