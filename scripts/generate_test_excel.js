const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const data = [
  ['ST. XAVIER HIGH SCHOOL — CLASS 2 FEE REGISTER (2025-2026)'],
  [], // Blank row to demonstrate automatic banner skipping
  ['S.No', 'Student Name', 'Surname', 'Father Mobile', 'Class', 'Section', '25-26 Bal', 'Remarks'],
  [1, 'Aarav', 'Sharma', '9059478739', '2', 'A', 12500, 'Term 1 Due'],
  [2, 'Diya', 'Patel', '9059478739', '2', 'A', 5400, 'Partial Paid'],
  [3, 'Rohan', 'Gupta', '9059478739', '2', 'B', 8200, 'Bus Fee Pending'],
  [4, 'Priya', 'Nair', '9059478739', '2', 'B', 15000, 'Annual Fees Pending'],
  [5, 'Kabir', 'Singh', '9059478739', '2', 'A', 3500, 'Term 2 Balance']
];

// Create Workbook
const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Class 2 Fees');

const xlsxPath = path.join(__dirname, '..', 'SchoolPing_Test_Students_Fees.xlsx');
XLSX.writeFile(wb, xlsxPath);
console.log('Successfully created Excel file at:', xlsxPath);

// Also create CSV format for testing convenience
const csvRows = [
  'ST. XAVIER HIGH SCHOOL — CLASS 2 FEE REGISTER (2025-2026)',
  '',
  'S.No,Student Name,Surname,Father Mobile,Class,Section,25-26 Bal,Remarks',
  '1,Aarav,Sharma,9059478739,2,A,12500,Term 1 Due',
  '2,Diya,Patel,9059478739,2,A,5400,Partial Paid',
  '3,Rohan,Gupta,9059478739,2,B,8200,Bus Fee Pending',
  '4,Priya,Nair,9059478739,2,B,15000,Annual Fees Pending',
  '5,Kabir,Singh,9059478739,2,A,3500,Term 2 Balance'
].join('\n');

const csvPath = path.join(__dirname, '..', 'SchoolPing_Test_Students_Fees.csv');
fs.writeFileSync(csvPath, csvRows, 'utf8');
console.log('Successfully created CSV file at:', csvPath);
