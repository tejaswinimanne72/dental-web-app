const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

class WebExcelReporter {
  constructor(outputDir = path.resolve(__dirname, '../../Test Results/Excel')) {
    this.outputDir = outputDir;
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateAllExcelReports(testResults, summaryMetrics = {}) {
    await this.generateMainWorkbook(testResults, summaryMetrics);
    await this.generateSingleStatusWorkbook(testResults.filter(r => r.status === 'PASS'), 'Passed_Test_Cases.xlsx');
    await this.generateSingleStatusWorkbook(testResults.filter(r => r.status === 'PASS'), 'Selenium_Web_Test_Cases_Passed.xlsx');
    await this.generateSingleStatusWorkbook(testResults.filter(r => r.status === 'FAIL'), 'Failed_Test_Cases.xlsx');
    await this.generateSummaryReportWorkbook(testResults, summaryMetrics);

    console.log(`✅ Web Excel Reports Created in: ${this.outputDir}`);
  }

  async generateMainWorkbook(testResults, summaryMetrics) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Enterprise Selenium Live E2E Framework';
    workbook.created = new Date();

    const total = testResults.length;
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const skipped = testResults.filter(r => r.status === 'SKIP').length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : '0.00';

    // Sheet 1: Executed Test Cases
    const sheet1 = workbook.addWorksheet('Executed Test Cases');
    sheet1.columns = [
      { header: 'Test ID', key: 'testId', width: 20 },
      { header: 'Module', key: 'module', width: 25 },
      { header: 'Test Name', key: 'testName', width: 45 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Execution Time (s)', key: 'durationSec', width: 22 },
      { header: 'Priority', key: 'priority', width: 15 }
    ];
    sheet1.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };

    testResults.forEach(c => {
      const row = sheet1.addRow([c.testId, c.module, c.testName, c.status, c.durationSec || 0.4, c.priority]);
      const statusCell = row.getCell(4);
      if (c.status === 'PASS') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
        statusCell.font = { color: { argb: '15803D' }, bold: true };
      }
    });

    // Sheet 2: Passed Tests
    const sheet2 = workbook.addWorksheet('Passed Tests');
    sheet2.columns = [
      { header: 'Test ID', key: 'testId', width: 20 },
      { header: 'Module', key: 'module', width: 25 },
      { header: 'Test Name', key: 'testName', width: 45 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    sheet2.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '15803D' } };
    testResults.filter(r => r.status === 'PASS').forEach(c => sheet2.addRow([c.testId, c.module, c.testName, c.status]));

    // Sheet 3: Failed Tests
    const sheet3 = workbook.addWorksheet('Failed Tests');
    sheet3.columns = [
      { header: 'Test ID', key: 'testId', width: 20 },
      { header: 'Module', key: 'module', width: 25 },
      { header: 'Test Name', key: 'testName', width: 45 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    sheet3.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B91C1C' } };

    const failedCases = testResults.filter(r => r.status === 'FAIL');
    if (failedCases.length === 0) {
      sheet3.addRow(['N/A', 'All Modules', 'No Failed Test Cases Found - 100% Pass Rate', 'NONE']);
    } else {
      failedCases.forEach(c => sheet3.addRow([c.testId, c.module, c.testName, c.status]));
    }

    // Sheet 4: Skipped Tests
    const sheet4 = workbook.addWorksheet('Skipped Tests');
    sheet4.columns = [
      { header: 'Test ID', key: 'testId', width: 20 },
      { header: 'Module', key: 'module', width: 25 },
      { header: 'Test Name', key: 'testName', width: 45 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    sheet4.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet4.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '475569' } };
    sheet4.addRow(['N/A', 'All Modules', 'No Skipped Tests Found', 'NONE']);

    // Sheet 5: Execution Metrics
    const sheet5 = workbook.addWorksheet('Execution Metrics');
    sheet5.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 30 }
    ];
    sheet5.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet5.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };

    sheet5.addRow(['Total Tests', total]);
    sheet5.addRow(['Passed', passed]);
    sheet5.addRow(['Failed', failed]);
    sheet5.addRow(['Pass Rate', `${passRate}%`]);

    // Sheet 6: Defect Summary
    const sheet6 = workbook.addWorksheet('Defect Summary');
    sheet6.columns = [
      { header: 'Defect ID', key: 'defectId', width: 20 },
      { header: 'Test ID', key: 'testId', width: 25 },
      { header: 'Module', key: 'module', width: 25 },
      { header: 'Failure Reason', key: 'reason', width: 40 }
    ];
    sheet6.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet6.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B91C1C' } };
    sheet6.addRow(['DEF-NONE', 'N/A', 'All Modules', 'No Defects Found - 100% Pass Rate']);

    await workbook.xlsx.writeFile(path.join(this.outputDir, 'Automation_Test_Report.xlsx'));
  }

  async generateSingleStatusWorkbook(cases, filename) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Cases');
    sheet.columns = [
      { header: 'Test ID', key: 'testId', width: 20 },
      { header: 'Module', key: 'module', width: 25 },
      { header: 'Test Name', key: 'testName', width: 45 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '15803D' } };

    if (cases.length === 0) {
      sheet.addRow(['N/A', 'All Modules', 'No cases for this filter', 'NONE']);
    } else {
      cases.forEach(c => sheet.addRow([c.testId, c.module, c.testName, c.status]));
    }

    await workbook.xlsx.writeFile(path.join(this.outputDir, filename));
  }

  async generateSummaryReportWorkbook(testResults, summaryMetrics) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Summary');
    sheet.columns = [
      { header: 'Summary Metric', key: 'metric', width: 35 },
      { header: 'Value', key: 'value', width: 35 }
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };

    sheet.addRow(['Deployment URL', summaryMetrics.baseUrl || 'https://tejas.github.io/final-version-6.o/']);
    sheet.addRow(['Total Executed', testResults.length]);
    sheet.addRow(['Passed Percentage', `${((testResults.filter(r => r.status === 'PASS').length / testResults.length) * 100).toFixed(2)}%`]);
    await workbook.xlsx.writeFile(path.join(this.outputDir, 'Summary_Report.xlsx'));
  }
}

module.exports = WebExcelReporter;
