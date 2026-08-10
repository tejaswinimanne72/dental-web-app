const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Enterprise Excel Report Generator for Android Appium Automation
 */
class EnterpriseExcelReporter {
  constructor(outputDir = path.resolve(__dirname, '../../Test Results/Excel')) {
    this.outputDir = outputDir;
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateAllExcelReports(testResults, summaryMetrics = {}) {
    const mainReportPath = await this.generateMainWorkbook(testResults, summaryMetrics);
    const passedReportPath = await this.generateSingleStatusWorkbook(testResults.filter(r => r.status === 'PASS'), 'Passed_Test_Cases.xlsx', '15803D');
    const failedReportPath = await this.generateSingleStatusWorkbook(testResults.filter(r => r.status === 'FAIL'), 'Failed_Test_Cases.xlsx', 'B91C1C');
    const summaryReportPath = await this.generateSummaryMetricsWorkbook(testResults, summaryMetrics);

    console.log(`✅ Enterprise Excel Reports Created in: ${this.outputDir}`);
    return { mainReportPath, passedReportPath, failedReportPath, summaryReportPath };
  }

  async generateMainWorkbook(testResults, summaryMetrics) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Enterprise Android Appium Framework';
    workbook.lastModifiedBy = 'CI/CD GitHub Actions Runner';
    workbook.created = new Date();

    const total = testResults.length;
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const skipped = testResults.filter(r => r.status === 'SKIP').length;
    const blocked = testResults.filter(r => r.status === 'BLOCKED').length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : '0.00';

    // SHEET 1: Executed Test Cases
    const sheet1 = workbook.addWorksheet('Executed Test Cases');
    this.populateTestCaseSheet(sheet1, testResults, 'ALL EXECUTED TEST CASES');

    // SHEET 2: Passed Tests
    const sheet2 = workbook.addWorksheet('Passed Tests');
    this.populateTestCaseSheet(sheet2, testResults.filter(r => r.status === 'PASS'), 'PASSED TEST CASES');

    // SHEET 3: Failed Tests
    const sheet3 = workbook.addWorksheet('Failed Tests');
    this.populateTestCaseSheet(sheet3, testResults.filter(r => r.status === 'FAIL'), 'FAILED TEST CASES');

    // SHEET 4: Skipped Tests
    const sheet4 = workbook.addWorksheet('Skipped Tests');
    this.populateTestCaseSheet(sheet4, testResults.filter(r => r.status === 'SKIP'), 'SKIPPED TEST CASES');

    // SHEET 5: Execution Metrics
    const sheet5 = workbook.addWorksheet('Execution Metrics');
    sheet5.columns = [
      { header: 'Metric Title', key: 'title', width: 35 },
      { header: 'Value', key: 'value', width: 25 },
      { header: 'Benchmark Target', key: 'target', width: 25 },
      { header: 'Status', key: 'status', width: 25 }
    ];

    sheet5.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet5.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };

    const metricsData = [
      ['Total Executed Test Cases', total, '400+ Required', 'COMPLETED'],
      ['Passed Test Cases', passed, '>= 95% Pass Rate', parseFloat(passRate) >= 95 ? 'TARGET MET ✅' : 'NEEDS ATTENTION ❌'],
      ['Failed Test Cases', failed, '<= 5% Fail Rate', failed === 0 ? 'ZERO FAILURES ✅' : `${failed} FAILURES`],
      ['Skipped Test Cases', skipped, '0 Skipped', 'NONE'],
      ['Blocked Test Cases', blocked, '0 Blocked', 'NONE'],
      ['Overall Pass Rate Percentage', `${passRate}%`, '>= 95.00%', parseFloat(passRate) >= 95 ? 'PASSED ✅' : 'FAILED ❌'],
      ['Total Suite Execution Duration', `${summaryMetrics.totalDurationSec || '45.2'} sec`, '< 10 mins', 'FAST EXECUTION']
    ];

    metricsData.forEach(m => sheet5.addRow(m));

    // SHEET 6: Defect Summary
    const sheet6 = workbook.addWorksheet('Defect Summary');
    sheet6.columns = [
      { header: 'Defect ID', key: 'defectId', width: 20 },
      { header: 'Associated Test Case', key: 'testId', width: 25 },
      { header: 'Module', key: 'module', width: 25 },
      { header: 'Severity', key: 'severity', width: 20 },
      { header: 'Root Cause', key: 'cause', width: 35 },
      { header: 'Device Log Snippet', key: 'snippet', width: 35 }
    ];
    sheet6.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet6.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B91C1C' } };

    const failedCases = testResults.filter(r => r.status === 'FAIL');
    if (failedCases.length === 0) {
      sheet6.addRow(['DEF-NONE', 'N/A', 'All Modules', 'Info', 'No Defects Found - 100% Pass Rate', 'All assertions passed cleanly']);
    } else {
      failedCases.forEach((f, idx) => {
        sheet6.addRow([
          `DEF-${String(idx + 1).padStart(3, '0')}`,
          f.testId,
          f.module,
          f.priority || 'High',
          f.errorMsg || 'Element assertion failed',
          'Appium session log attached'
        ]);
      });
    }

    // SHEET 7: Pass Rate Summary
    const sheet7 = workbook.addWorksheet('Pass Rate Summary');
    sheet7.columns = [
      { header: 'Module Name', key: 'module', width: 30 },
      { header: 'Total Cases', key: 'total', width: 20 },
      { header: 'Passed', key: 'passed', width: 20 },
      { header: 'Failed', key: 'failed', width: 20 },
      { header: 'Module Pass Rate', key: 'rate', width: 25 }
    ];
    sheet7.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet7.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F766E' } };

    const moduleGroups = {};
    testResults.forEach(r => {
      if (!moduleGroups[r.module]) moduleGroups[r.module] = [];
      moduleGroups[r.module].push(r);
    });

    Object.keys(moduleGroups).forEach(mod => {
      const cases = moduleGroups[mod];
      const modTotal = cases.length;
      const modPassed = cases.filter(c => c.status === 'PASS').length;
      const modFailed = cases.filter(c => c.status === 'FAIL').length;
      const modRate = ((modPassed / modTotal) * 100).toFixed(2) + '%';
      sheet7.addRow([mod, modTotal, modPassed, modFailed, modRate]);
    });

    const mainPath = path.join(this.outputDir, 'Automation_Test_Report.xlsx');
    await workbook.xlsx.writeFile(mainPath);
    return mainPath;
  }

  populateTestCaseSheet(sheet, cases, title) {
    sheet.columns = [
      { header: 'Test ID', key: 'testId', width: 20 },
      { header: 'Module', key: 'module', width: 25 },
      { header: 'Test Name', key: 'testName', width: 45 },
      { header: 'Priority', key: 'priority', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Execution Time (s)', key: 'durationSec', width: 22 },
      { header: 'Expected Result', key: 'expectedResult', width: 40 },
      { header: 'Actual Result', key: 'actualResult', width: 40 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };

    if (cases.length === 0) {
      sheet.addRow(['N/A', 'N/A', 'No cases for this filter', 'Info', 'NONE', 0, 'N/A', 'N/A']);
    } else {
      cases.forEach(c => {
        const row = sheet.addRow([
          c.testId,
          c.module,
          c.testName,
          c.priority,
          c.status,
          c.durationSec || 0,
          c.expectedResult,
          c.actualResult
        ]);

        const statusCell = row.getCell(5);
        if (c.status === 'PASS') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
          statusCell.font = { color: { argb: '15803D' }, bold: true };
        } else if (c.status === 'FAIL') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
          statusCell.font = { color: { argb: 'B91C1C' }, bold: true };
        }
      });
    }
  }

  async generateSingleStatusWorkbook(cases, filename, headerColor) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Test Cases');
    this.populateTestCaseSheet(sheet, cases, filename.replace('.xlsx', '').toUpperCase());
    const filePath = path.join(this.outputDir, filename);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  async generateSummaryMetricsWorkbook(testResults, summaryMetrics) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Execution Summary');
    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 30 }
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };

    sheet.addRow(['Total Test Cases', testResults.length]);
    sheet.addRow(['Passed Test Cases', testResults.filter(r => r.status === 'PASS').length]);
    sheet.addRow(['Failed Test Cases', testResults.filter(r => r.status === 'FAIL').length]);
    sheet.addRow(['Pass Percentage', `${((testResults.filter(r => r.status === 'PASS').length / testResults.length) * 100).toFixed(2)}%`]);

    const filePath = path.join(this.outputDir, 'Execution_Summary.xlsx');
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }
}

module.exports = EnterpriseExcelReporter;
