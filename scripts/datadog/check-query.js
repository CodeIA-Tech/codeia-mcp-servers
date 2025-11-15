#!/usr/bin/env node
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.join(__dirname, '..', '..', 'docs', 'assets', 'Vertem-Datadog-Monitors.xlsx');
const wb = XLSX.readFile(excelPath);
const ws = wb.Sheets['Build_Monitors'];
const data = XLSX.utils.sheet_to_json(ws);

const monitor1 = data.find(m => (m.Titulo || '').includes('Queda moderada'));
const monitor2 = data.find(m => (m.Titulo || '').includes('Disponibilidade abaixo de 98'));
const monitor3 = data.find(m => (m.Titulo || '').includes('Crescimento anormal'));

console.log('Monitor 1:', monitor1?.Titulo);
console.log('Query 1:', monitor1?.Query);
console.log('\nMonitor 2:', monitor2?.Titulo);
console.log('Query 2:', monitor2?.Query);
console.log('\nMonitor 3:', monitor3?.Titulo);
console.log('Query 3:', monitor3?.Query);

