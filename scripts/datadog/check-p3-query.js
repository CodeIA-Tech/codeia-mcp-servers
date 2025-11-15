import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'docs/assets/Vertem-Datadog-Monitors.xlsx';
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets['Build_Monitors'];
const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

const p3Monitors = data.filter(m => {
  const priority = (m.Prioridade || m.Priority || m.prioridade || '').toString().toUpperCase().trim();
  return priority === 'P3';
});

const problematic = p3Monitors.find(m => {
  const titulo = (m.Titulo || m.Título || m.Title || '').toLowerCase();
  return titulo.includes('crescimento');
});

if (problematic) {
  console.log('Monitor problemático encontrado:');
  console.log('Título:', problematic.Titulo || problematic.Título || problematic.Title);
  console.log('\nQuery completa:');
  console.log(problematic.Query || problematic.query || 'N/A');
  console.log('\nThresholds:');
  console.log(problematic['Thresholds (JSON)'] || problematic.Thresholds || 'N/A');
}

