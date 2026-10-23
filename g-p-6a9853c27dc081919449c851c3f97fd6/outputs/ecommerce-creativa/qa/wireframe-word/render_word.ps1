$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$taskSource = Join-Path $taskRoot 'Wireframe-ecommerce-Creativa-A4.docx'
$taskQa = Join-Path $PSScriptRoot 'word-render'
New-Item -ItemType Directory -Path $taskQa -Force | Out-Null
$taskCopy = Join-Path $taskQa 'copia-verificacion.docx'
$taskPdf = Join-Path $taskQa 'Wireframe-ecommerce-Creativa-A4.pdf'
Copy-Item -LiteralPath $taskSource -Destination $taskCopy -Force
$taskWord = $null
$taskDocument = $null
try {
    $taskWord = New-Object -ComObject Word.Application
    $taskWord.Visible = $false
    $taskWord.DisplayAlerts = 0
    $taskWord.AutomationSecurity = 3
    $taskDocument = $taskWord.Documents.Open($taskCopy, $false, $true, $false)
    $taskDocument.Repaginate()
    $taskDocument.ExportAsFixedFormat($taskPdf, 17, $false)
    [pscustomobject]@{ Pdf = $taskPdf; Pages = $taskDocument.ComputeStatistics(2) } | ConvertTo-Json -Compress
}
finally {
    if ($null -ne $taskDocument) {
        $taskDocument.Close(0)
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskDocument)
    }
    if ($null -ne $taskWord) {
        $taskWord.Quit(0)
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskWord)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
