$p = 'project/src/pages/Financeiro.tsx'
$c = Get-Content $p -Raw

$old = @'
const categories = ['Procedimento', 'Insumos', 'Infraestrutura', 'Tecnologia', 'Marketing', 'Outro'];
const paymentMethods = ['Dinheiro', 'Cartão Crédito', 'Cartão Débito', 'PIX', 'Transferência', 'Outro'];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, ''');
}

function formatExportDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
}
'@

$new = @'
const categories = ['Procedimento', 'Insumos', 'Infraestrutura', 'Tecnologia', 'Marketing', 'Outro'];
const paymentMethods = ['Dinheiro', 'Cartão Crédito', 'Cartão Débito', 'PIX', 'Transferência', 'Outro'];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, ''');
}

function formatExportDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
}
'@

if (-not $c.Contains($old)) {
  throw 'The target block was not found in Financeiro.tsx.'
}

$c = $c.Replace($old, $new)
Set-Content -Path $p -Value $c
